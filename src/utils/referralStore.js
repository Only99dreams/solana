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
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase loadReferrals error:', error.message, error);
      return [];
    }
    // Map DB column names to the shape the rest of the app expects
    return (data || []).map(row => ({
      id: row.id,
      ref: row.ref,
      wallet: row.wallet,
      amount: Number(row.amount) || 0,
      txSignature: row.tx_signature,
      timestamp: row.created_at,
      userAgent: row.user_agent,
    }));
  } catch (err) {
    console.error('❌ Supabase loadReferrals exception:', err);
    return [];
  }
}

// ── Save a new referral claim to Supabase ───────────────────
export async function recordReferral({ ref, wallet, amount, txSignature }) {
  try {
    const payload = {
      ref: ref || 'direct',
      wallet,
      amount,
      tx_signature: txSignature,
      user_agent: navigator.userAgent,
    };
    console.log('📝 Recording referral to Supabase:', payload);

    const { data, error } = await supabase.from('referrals').insert(payload).select();

    if (error) {
      console.error('❌ Supabase insert error:', error.message, error);
      return false;
    }
    console.log('✅ Referral recorded successfully:', data);
    return true;
  } catch (err) {
    console.error('❌ Supabase insert exception:', err);
    return false;
  }
}

// ── Single fetch for the entire dashboard ───────────────────
// This avoids 3 separate Supabase calls from the admin panel.
export async function fetchAllDashboardData() {
  const records = await loadReferrals();

  // Overall stats
  const overall = {
    totalClaims: records.length,
    totalLamports: records.reduce((sum, r) => sum + (r.amount || 0), 0),
    uniqueWallets: new Set(records.map(r => r.wallet)).size,
    uniqueReferrers: new Set(records.filter(r => r.ref !== 'direct').map(r => r.ref)).size,
  };

  // Group by team member
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.ref]) grouped[r.ref] = [];
    grouped[r.ref].push(r);
  }

  const teamStats = Object.entries(grouped).map(([ref, claims]) => ({
    ref,
    totalClaims: claims.length,
    totalLamports: claims.reduce((sum, c) => sum + (c.amount || 0), 0),
    lastClaim: claims[0]?.timestamp || null, // already sorted desc
    wallets: claims.map(c => c.wallet),
  }));

  // Recent claims (last 20)
  const recentClaims = records.slice(0, 20);

  return { records, overall, teamStats, recentClaims };
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
