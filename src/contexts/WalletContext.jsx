// src/contexts/WalletContext.jsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { useMemo } from 'react';

export function WalletContext({ children }) {
  const endpoint = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}