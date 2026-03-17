// src/components/AdminDashboard.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TEAM_MEMBERS, ADMIN_PASSWORD } from '../utils/constants';
import {
  fetchAllDashboardData,
  exportReferralsCSV,
  exportReferralsJSON,
  clearAllReferrals,
} from '../utils/referralStore';
import '../styles/admin.css';

// ── Helpers ─────────────────────────────────────────────────
const solFromLamports = (l) => (l / LAMPORTS_PER_SOL).toFixed(4);
const shortWallet = (w) => w ? `${w.slice(0, 4)}…${w.slice(-4)}` : '—';
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString();
};
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function AdminDashboard({ onClose }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTeam, setSelectedTeam] = useState(null);

  // ── Async data state ──────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overall, setOverall] = useState({ totalClaims: 0, totalLamports: 0, uniqueWallets: 0, uniqueReferrers: 0 });
  const [teamStats, setTeamStats] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllDashboardData();
      setOverall(data.overall);
      setTeamStats(data.teamStats);
      setAllRecords(data.records);
      setRecentClaims(data.recentClaims);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to connect to Supabase. Check your configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [authed, fetchData]);

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
          <div className="admin-login-icon">🛡️</div>
          <h2>Admin Dashboard</h2>
          <p>Enter password to access the referral tracking panel.</p>
          <form onSubmit={handleLogin} className="admin-login-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="admin-input"
              autoFocus
            />
            {pwError && <span className="admin-error">❌ Incorrect password</span>}
            <button type="submit" className="admin-login-btn">
              Unlock Dashboard →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Detail records for selected team member ───────────────
  const detailRecords = selectedTeam
    ? allRecords.filter((r) => r.ref === selectedTeam)
    : null;

  const sortedTeamStats = [...teamStats].sort((a, b) => b.totalClaims - a.totalClaims);

  // ── Main dashboard ────────────────────────────────────────
  return (
    <div className="admin-overlay">
      <div className="admin-dashboard">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="admin-header">
          <div className="admin-header-left">
            <h2>📊 Referral Dashboard</h2>
            <span className="admin-header-badge">
              {loading ? '⏳ Syncing…' : `✅ Live · ${overall.totalClaims} claims`}
            </span>
          </div>
          <div className="admin-header-actions">
            <button onClick={fetchData} className="admin-refresh-btn" disabled={loading}>
              {loading ? '⏳' : '🔄'}
            </button>
            <button className="admin-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* ── Error banner ────────────────────────────────── */}
        {error && (
          <div className="admin-error-banner">
            ⚠️ {error}
            <button onClick={fetchData} className="admin-retry-btn">Retry</button>
          </div>
        )}

        {/* ── Stats row ───────────────────────────────────── */}
        <div className="admin-stats-row">
          <div className="admin-stat-card admin-stat-purple">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Total Claims</span>
              <span className="admin-stat-emoji">🎯</span>
            </div>
            <span className="admin-stat-value">{overall.totalClaims}</span>
          </div>
          <div className="admin-stat-card admin-stat-blue">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Unique Wallets</span>
              <span className="admin-stat-emoji">👛</span>
            </div>
            <span className="admin-stat-value">{overall.uniqueWallets}</span>
          </div>
          <div className="admin-stat-card admin-stat-cyan">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Total SOL</span>
              <span className="admin-stat-emoji">◎</span>
            </div>
            <span className="admin-stat-value">{solFromLamports(overall.totalLamports)}</span>
          </div>
          <div className="admin-stat-card admin-stat-green">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Team Referrers</span>
              <span className="admin-stat-emoji">👥</span>
            </div>
            <span className="admin-stat-value">{overall.uniqueReferrers}</span>
          </div>
        </div>

        {/* ── Tab Navigation ──────────────────────────────── */}
        <div className="admin-tabs">
          {[
            { id: 'overview', label: '📋 Overview', },
            { id: 'team', label: '🏆 Leaderboard', },
            { id: 'links', label: '🔗 Team Links', },
            { id: 'activity', label: '⚡ Recent Activity', },
          ].map(tab => (
            <button
              key={tab.id}
              className={`admin-tab ${activeTab === tab.id ? 'admin-tab-active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setSelectedTeam(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ─────────────────────────────────── */}
        <div className="admin-tab-content">

          {/* ── OVERVIEW TAB ──────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="admin-overview-grid">
              {/* Top referrers mini-list */}
              <div className="admin-card">
                <h3 className="admin-card-title">🏅 Top Referrers</h3>
                {sortedTeamStats.length === 0 ? (
                  <p className="admin-empty-text">No claims yet</p>
                ) : (
                  <div className="admin-top-list">
                    {sortedTeamStats.slice(0, 5).map((ts, idx) => {
                      const member = teamLookup[ts.ref];
                      return (
                        <div key={ts.ref} className="admin-top-item">
                          <span className="admin-top-rank">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </span>
                          <span className="admin-top-name">
                            {member ? `${member.emoji} ${member.name}` : ts.ref}
                          </span>
                          <span className="admin-top-count">{ts.totalClaims} claims</span>
                          <div className="admin-top-bar">
                            <div
                              className="admin-top-bar-fill"
                              style={{ width: `${Math.min(100, (ts.totalClaims / (sortedTeamStats[0]?.totalClaims || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent activity mini-feed */}
              <div className="admin-card">
                <h3 className="admin-card-title">⚡ Recent Claims</h3>
                {recentClaims.length === 0 ? (
                  <p className="admin-empty-text">No recent activity</p>
                ) : (
                  <div className="admin-activity-list">
                    {recentClaims.slice(0, 8).map((r, i) => {
                      const member = teamLookup[r.ref];
                      return (
                        <div key={i} className="admin-activity-item">
                          <div className="admin-activity-dot" />
                          <div className="admin-activity-info">
                            <span className="admin-activity-wallet">{shortWallet(r.wallet)}</span>
                            <span className="admin-activity-via">
                              via {member ? `${member.emoji} ${member.name}` : r.ref}
                            </span>
                          </div>
                          <div className="admin-activity-meta">
                            <span className="admin-activity-amount">{solFromLamports(r.amount)} SOL</span>
                            <span className="admin-activity-time">{timeAgo(r.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LEADERBOARD TAB ───────────────────────────── */}
          {activeTab === 'team' && !selectedTeam && (
            <>
              {sortedTeamStats.length === 0 ? (
                <div className="admin-empty-state">
                  <span className="admin-empty-icon">📭</span>
                  <p>No claims recorded yet.</p>
                  <p className="admin-empty-sub">Share your team links to start tracking referrals.</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Team Member</th>
                        <th>Claims</th>
                        <th>Total SOL</th>
                        <th>Last Claim</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeamStats.map((ts, idx) => {
                        const member = teamLookup[ts.ref];
                        return (
                          <tr key={ts.ref} className="admin-table-row">
                            <td className="admin-rank-cell">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </td>
                            <td className="admin-member-cell">
                              <span className="admin-member-name">
                                {member ? `${member.emoji} ${member.name}` : ts.ref}
                              </span>
                              <span className="admin-member-code">ref={ts.ref}</span>
                            </td>
                            <td><span className="admin-claims-badge">{ts.totalClaims}</span></td>
                            <td className="admin-sol-cell">{solFromLamports(ts.totalLamports)}</td>
                            <td className="admin-date-cell">{timeAgo(ts.lastClaim)}</td>
                            <td>
                              <button
                                className="admin-view-btn"
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
            </>
          )}

          {/* ── DETAIL VIEW (team member claims) ──────────── */}
          {activeTab === 'team' && selectedTeam && detailRecords && (
            <div className="admin-detail-panel">
              <div className="admin-detail-header">
                <div>
                  <h3 className="admin-detail-title">
                    {teamLookup[selectedTeam]
                      ? `${teamLookup[selectedTeam].emoji} ${teamLookup[selectedTeam].name}`
                      : selectedTeam}
                  </h3>
                  <span className="admin-detail-subtitle">
                    {detailRecords.length} claim{detailRecords.length !== 1 ? 's' : ''} · {solFromLamports(detailRecords.reduce((s, r) => s + (r.amount || 0), 0))} SOL
                  </span>
                </div>
                <button className="admin-back-btn" onClick={() => setSelectedTeam(null)}>← Back</button>
              </div>
              {detailRecords.length === 0 ? (
                <p className="admin-empty-text">No claims from this referrer.</p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Wallet</th>
                        <th>SOL</th>
                        <th>Transaction</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRecords.map((r, i) => (
                        <tr key={i} className="admin-table-row">
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
                              {shortWallet(r.txSignature)} ↗
                            </a>
                          </td>
                          <td className="admin-date-cell">{fmtDate(r.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TEAM LINKS TAB ────────────────────────────── */}
          {activeTab === 'links' && (
            <div className="admin-links-section">
              <p className="admin-links-hint">
                Share these unique links with your team. The <code>?ref=</code> code tracks who brought each participant.
              </p>
              <div className="admin-links-grid">
                {TEAM_MEMBERS.map((tm) => {
                  const url = `${window.location.origin}${window.location.pathname}?ref=${tm.code}`;
                  const stat = teamStats.find(s => s.ref === tm.code);
                  return (
                    <div key={tm.code} className="admin-link-card">
                      <div className="admin-link-top">
                        <span className="admin-link-avatar">{tm.emoji}</span>
                        <div className="admin-link-info">
                          <span className="admin-link-name">{tm.name}</span>
                          <span className="admin-link-stats">
                            {stat ? `${stat.totalClaims} claims · ${solFromLamports(stat.totalLamports)} SOL` : 'No claims yet'}
                          </span>
                        </div>
                      </div>
                      <div className="admin-link-url-row">
                        <code className="admin-link-url">{url}</code>
                        <button
                          className="admin-copy-btn"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            const btn = document.querySelector(`[data-copy="${tm.code}"]`);
                            if (btn) { btn.textContent = '✅ Copied'; setTimeout(() => btn.textContent = '📋 Copy', 2000); }
                          }}
                          data-copy={tm.code}
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RECENT ACTIVITY TAB ───────────────────────── */}
          {activeTab === 'activity' && (
            <>
              {recentClaims.length === 0 ? (
                <div className="admin-empty-state">
                  <span className="admin-empty-icon">📭</span>
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Wallet</th>
                        <th>Referred By</th>
                        <th>SOL</th>
                        <th>Transaction</th>
                        <th>When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentClaims.map((r, i) => {
                        const member = teamLookup[r.ref];
                        return (
                          <tr key={i} className="admin-table-row">
                            <td className="admin-mono">{shortWallet(r.wallet)}</td>
                            <td>{member ? `${member.emoji} ${member.name}` : r.ref}</td>
                            <td>{solFromLamports(r.amount || 0)}</td>
                            <td>
                              <a
                                href={`https://solscan.io/tx/${r.txSignature}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-tx-link"
                              >
                                {shortWallet(r.txSignature)} ↗
                              </a>
                            </td>
                            <td className="admin-date-cell">{timeAgo(r.timestamp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer actions ──────────────────────────────── */}
        <div className="admin-footer">
          <div className="admin-footer-left">
            <button onClick={handleExportCSV} className="admin-export-btn">📥 Export CSV</button>
            <button onClick={handleExportJSON} className="admin-export-btn">📥 Export JSON</button>
          </div>
        
        </div>
      </div>
    </div>
  );
}
