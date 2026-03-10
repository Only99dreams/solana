// src/contexts/WalletContext.jsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import { RPC_URL } from '../utils/constants';

export function WalletContext({ children }) {
  const endpoint = RPC_URL;

  // Disable WebSocket since we're proxying through Vite
  const config = useMemo(() => ({ commitment: 'confirmed', wsEndpoint: false }), []);

  // Pass an empty array — all modern Solana wallets (Phantom, Solflare,
  // Trust Wallet, Backpack, Coinbase, etc.) register themselves via the
  // Wallet Standard.  Only wallets that are actually **installed** on the
  // user's device will appear in the connect modal, so there is no
  // "download" redirect for missing wallets.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}