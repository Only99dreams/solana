// src/utils/referralStore.js
// ─────────────────────────────────────────────────────────────
// Referral tracking system — powered by Supabase.
// Each team member gets a unique ?ref=<code> URL parameter.
// When a participant claims the airdrop, the referral is recorded
// in the `referrals` table on Supabase (persistent, multi-device).
// ─────────────────────────────────────────────────────────────
import { supabase } from './supabaseClient';

const CURRENT_REF_KEY = 'solana_airdrop_current_ref';

// ── Read the ?ref= param from the current URL ───────────────
export function getReferralFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref')?.trim().toLowerCase() || null;
}

// ── Persist the current referral code so it survives page
//    navigations / wallet connect flow ────────────────────────
export function storeCurrentReferral(refCode) {
  if (refCode) {
    sessionStorage.setItem(CURRENT_REF_KEY, refCode);
  }
}

export function getCurrentReferral() {
  return sessionStorage.getItem(CURRENT_REF_KEY) || null;
}

// ── Load all referral records from Supabase ─────────────────
export async function loadReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load referrals:', error.message);
    return [];
  }
  // Map DB column names to the shape the rest of the app expects
  return (data || []).map(row => ({
    id: row.id,
    ref: row.ref,
    wallet: row.wallet,
    amount: row.amount,
    txSignature: row.tx_signature,
    timestamp: row.created_at,
    userAgent: row.user_agent,
  }));
}

// ── Save a new referral claim to Supabase ───────────────────
export async function recordReferral({ ref, wallet, amount, txSignature }) {
  const { error } = await supabase.from('referrals').insert({
    ref: ref || 'direct',
    wallet,
    amount,
    tx_signature: txSignature,
    user_agent: navigator.userAgent,
  });

  if (error) {
    // Duplicate tx_signature will fail thanks to unique index — that's fine
    console.error('Failed to record referral:', error.message);
  }
}

// ── Analytics helpers (used by the admin dashboard) ─────────
// All now async since they hit Supabase.

/** Summary stats per team member */
export async function getTeamStats() {
  const records = await loadReferrals();
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.ref]) grouped[r.ref] = [];
    grouped[r.ref].push(r);
  }
  return Object.entries(grouped).map(([ref, claims]) => ({
    ref,
    totalClaims: claims.length,
    totalLamports: claims.reduce((sum, c) => sum + (c.amount || 0), 0),
    lastClaim: claims.at(-1)?.timestamp || null,
    wallets: claims.map(c => c.wallet),
  }));
}

/** Overall totals */
export async function getOverallStats() {
  const records = await loadReferrals();
  return {
    totalClaims: records.length,
    totalLamports: records.reduce((sum, r) => sum + (r.amount || 0), 0),
    uniqueWallets: new Set(records.map(r => r.wallet)).size,
    uniqueReferrers: new Set(records.map(r => r.ref)).size,
  };
}

// ── Export / clear (admin utilities) ────────────────────────
export async function exportReferralsJSON() {
  const records = await loadReferrals();
  return JSON.stringify(records, null, 2);
}

export async function exportReferralsCSV() {
  const records = await loadReferrals();
  if (!records.length) return '';
  const headers = ['ref', 'wallet', 'amount', 'txSignature', 'timestamp'];
  const rows = records.map(r => headers.map(h => r[h] ?? '').join(','));
  return [headers.join(','), ...rows].join('\n');
}

export async function clearAllReferrals() {
  const { error } = await supabase.from('referrals').delete().neq('id', 0);
  if (error) console.error('Failed to clear referrals:', error.message);
}
