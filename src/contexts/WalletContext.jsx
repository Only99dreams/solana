// src/contexts/WalletContext.jsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

export function WalletContext({ children }) {
  const endpoint =
    import.meta.env.VITE_RPC_URL ||
    'https://mainnet.helius-rpc.com/?api-key=1d8740dc-e5f4-421c-b823-e1bad1889eff';

  // Pass an empty array — all modern Solana wallets (Phantom, Solflare,
  // Trust Wallet, Backpack, Coinbase, etc.) register themselves via the
  // Wallet Standard.  Only wallets that are actually **installed** on the
  // user's device will appear in the connect modal, so there is no
  // "download" redirect for missing wallets.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}