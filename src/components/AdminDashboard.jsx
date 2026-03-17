// src/components/AdminDashboard.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TEAM_MEMBERS, ADMIN_PASSWORD } from '../utils/constants';
import {
  getTeamStats,
  getOverallStats,
  loadReferrals,
  exportReferralsCSV,
  exportReferralsJSON,
  clearAllReferrals,
} from '../utils/referralStore';
import '../styles/admin.css';

// ── Tiny helper ─────────────────────────────────────────────
const solFromLamports = (l) => (l / LAMPORTS_PER_SOL).toFixed(4);
const shortWallet = (w) => w ? `${w.slice(0, 4)}…${w.slice(-4)}` : '—';
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
};

export default function AdminDashboard({ onClose }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // ── Async data state ──────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState({ totalClaims: 0, totalLamports: 0, uniqueWallets: 0, uniqueReferrers: 0 });
  const [teamStats, setTeamStats] = useState([]);
  const [allRecords, setAllRecords] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [o, t, r] = await Promise.all([
        getOverallStats(),
        getTeamStats(),
        loadReferrals(),
      ]);
      setOverall(o);
      setTeamStats(t);
      setAllRecords(r);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and whenever authed changes (i.e. after login)
  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  // Build a lookup: code -> name/emoji
  const teamLookup = useMemo(() => {
    const map = {};
    for (const t of TEAM_MEMBERS) map[t.code] = t;
    return map;
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const handleExportCSV = async () => {
    const csv = await exportReferralsCSV();
    if (!csv) return alert('No data to export.');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const json = await exportReferralsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    if (window.confirm('⚠️ This will permanently delete ALL referral data from Supabase. Are you sure?')) {
      await clearAllReferrals();
      await fetchData();
    }
  };

  // ── Password gate ─────────────────────────────────────────
  if (!authed) {
    return (
      <div className="admin-overlay">
        <div className="admin-login glass-card">
          <button className="admin-close-btn" onClick={onClose}>✕</button>
          <h2>🔐 Admin Access</h2>
          <p>Enter the admin password to view the referral dashboard.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="admin-input"
              autoFocus
            />
            {pwError && <span className="admin-error">Incorrect password</span>}
            <button type="submit" className="admin-login-btn">Unlock Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Detail view for one team member ───────────────────────
  const detailRecords = selectedTeam
    ? allRecords.filter((r) => r.ref === selectedTeam)
    : null;

  // ── Main dashboard ────────────────────────────────────────
  return (
    <div className="admin-overlay">
      <div className="admin-dashboard glass-card">
        <div className="admin-header">
          <h2>📊 Referral Admin Dashboard</h2>
          <div className="admin-header-actions">
            <button onClick={fetchData} className="admin-action-btn" title="Refresh">{loading ? '⏳' : '🔄'} Refresh</button>
            <button className="admin-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Overall Stats ────────────────────────────────── */}
        {loading ? (
          <div className="admin-empty">⏳ Loading data from Supabase…</div>
        ) : (
        <>
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-icon">🎯</span>
            <span className="admin-stat-value">{overall.totalClaims}</span>
            <span className="admin-stat-label">Total Claims</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">👛</span>
            <span className="admin-stat-value">{overall.uniqueWallets}</span>
            <span className="admin-stat-label">Unique Wallets</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">◎</span>
            <span className="admin-stat-value">{solFromLamports(overall.totalLamports)}</span>
            <span className="admin-stat-label">Total SOL</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">👥</span>
            <span className="admin-stat-value">{overall.uniqueReferrers}</span>
            <span className="admin-stat-label">Active Referrers</span>
          </div>
        </div>

        {/* ── Team Links (share these with your team) ─────── */}
        <div className="admin-section">
          <h3>🔗 Team Referral Links</h3>
          <p className="admin-hint">Share these unique links with each team member. The <code>?ref=</code> code tracks who brought each participant.</p>
          <div className="admin-links-grid">
            {TEAM_MEMBERS.map((tm) => {
              const url = `${window.location.origin}${window.location.pathname}?ref=${tm.code}`;
              return (
                <div key={tm.code} className="admin-link-card">
                  <span className="admin-link-emoji">{tm.emoji}</span>
                  <span className="admin-link-name">{tm.name}</span>
                  <code className="admin-link-url">{url}</code>
                  <button
                    className="admin-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      const btn = document.querySelector(`[data-copy="${tm.code}"]`);
                      if (btn) { btn.textContent = '✅'; setTimeout(() => btn.textContent = '📋', 1500); }
                    }}
                    data-copy={tm.code}
                  >
                    📋
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Leaderboard ─────────────────────────────────── */}
        <div className="admin-section">
          <h3>🏆 Team Leaderboard</h3>
          {teamStats.length === 0 ? (
            <p className="admin-empty">No claims recorded yet.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team Member</th>
                    <th>Claims</th>
                    <th>Total SOL</th>
                    <th>Last Claim</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats
                    .sort((a, b) => b.totalClaims - a.totalClaims)
                    .map((ts, idx) => {
                      const member = teamLookup[ts.ref];
                      return (
                        <tr key={ts.ref}>
                          <td className="admin-rank">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td>
                            {member ? `${member.emoji} ${member.name}` : ts.ref}
                          </td>
                          <td>{ts.totalClaims}</td>
                          <td>{solFromLamports(ts.totalLamports)} SOL</td>
                          <td>{fmtDate(ts.lastClaim)}</td>
                          <td>
                            <button
                              className="admin-detail-btn"
                              onClick={() => setSelectedTeam(ts.ref)}
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detail panel (claims for one team member) ───── */}
        {selectedTeam && detailRecords && (
          <div className="admin-section admin-detail-section">
            <div className="admin-detail-header">
              <h3>
                {teamLookup[selectedTeam]
                  ? `${teamLookup[selectedTeam].emoji} ${teamLookup[selectedTeam].name}'s Referrals`
                  : `"${selectedTeam}" Referrals`}
              </h3>
              <button className="admin-action-btn" onClick={() => setSelectedTeam(null)}>← Back</button>
            </div>
            {detailRecords.length === 0 ? (
              <p className="admin-empty">No claims for this member.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table admin-table-detail">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Wallet</th>
                      <th>SOL</th>
                      <th>Tx Signature</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRecords.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="admin-mono">{shortWallet(r.wallet)}</td>
                        <td>{solFromLamports(r.amount || 0)}</td>
                        <td>
                          <a
                            href={`https://solscan.io/tx/${r.txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-tx-link"
                          >
                            {shortWallet(r.txSignature)}
                          </a>
                        </td>
                        <td>{fmtDate(r.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Export / Clear ──────────────────────────────── */}
        <div className="admin-section admin-footer-actions">
          <button onClick={handleExportCSV} className="admin-action-btn">📥 Export CSV</button>
          <button onClick={handleExportJSON} className="admin-action-btn">📥 Export JSON</button>
          <button onClick={handleClearData} className="admin-action-btn admin-danger-btn">🗑️ Clear All Data</button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
