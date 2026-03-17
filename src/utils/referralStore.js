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

// ── Test Supabase connectivity & table existence ────────────
// Returns { ok, message } — useful for the admin dashboard.
export async function testSupabaseConnection() {
  try {
    // 1) Check env vars
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes('placeholder')) {
      return { ok: false, message: 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env file.' };
    }

    // 2) Try a simple SELECT to verify the table exists and RLS allows reads
    const { data, error } = await supabase
      .from('referrals')
      .select('id')
      .limit(1);

    if (error) {
      // Common Supabase errors
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        return { ok: false, message: 'The "referrals" table does not exist. Please run the SQL migration script in Supabase Dashboard → SQL Editor.' };
      }
      if (error.code === '42501' || error.message?.includes('permission')) {
        return { ok: false, message: 'RLS is blocking access. Make sure you created the Row Level Security policies from the migration script.' };
      }
      return { ok: false, message: `Supabase error: ${error.message}` };
    }

    return { ok: true, message: `Connected. ${data?.length ?? 0} row(s) found in test query.` };
  } catch (err) {
    return { ok: false, message: `Connection failed: ${err.message}` };
  }
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
      return { records: [], error: error.message };
    }
    // Map DB column names to the shape the rest of the app expects
    const records = (data || []).map(row => ({
      id: row.id,
      ref: row.ref,
      wallet: row.wallet,
      amount: Number(row.amount) || 0,
      txSignature: row.tx_signature,
      timestamp: row.created_at,
      userAgent: row.user_agent,
    }));
    return { records, error: null };
  } catch (err) {
    console.error('❌ Supabase loadReferrals exception:', err);
    return { records: [], error: err.message };
  }
}

// ── Save a new referral claim to Supabase ───────────────────
// Returns { ok, errorMessage } so the caller can surface errors.
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
      return { ok: false, errorMessage: error.message };
    }
    console.log('✅ Referral recorded successfully:', data);
    return { ok: true, errorMessage: null };
  } catch (err) {
    console.error('❌ Supabase insert exception:', err);
    return { ok: false, errorMessage: err.message };
  }
}

// ── Single fetch for the entire dashboard ───────────────────
// This avoids 3 separate Supabase calls from the admin panel.
export async function fetchAllDashboardData() {
  const { records, error: loadError } = await loadReferrals();

  if (loadError) {
    return {
      records: [],
      overall: { totalClaims: 0, totalLamports: 0, uniqueWallets: 0, uniqueReferrers: 0 },
      teamStats: [],
      recentClaims: [],
      error: loadError,
    };
  }

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

  return { records, overall, teamStats, recentClaims, error: null };
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
