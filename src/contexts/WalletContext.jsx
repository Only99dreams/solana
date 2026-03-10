// src/contexts/WalletContext.jsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import {
  Coin98WalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SafePalWalletAdapter,
  SolflareWalletAdapter,
  TokenPocketWalletAdapter,
  TorusWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';

export function WalletContext({ children }) {
  const endpoint = import.meta.env.VITE_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const isMobile =
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);

  const wallets = useMemo(() => {
    if (isMobile) {
      return [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new TrustWalletAdapter(),
        new TokenPocketWalletAdapter(),
        new Coin98WalletAdapter(),
        new SafePalWalletAdapter(),
      ];
    }

    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TrustWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ];
  }, [isMobile]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}