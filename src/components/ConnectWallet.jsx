// src/components/ConnectWallet.jsx
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RPC_URL } from '../utils/constants';

export default function ConnectWallet() {
  const { connected, publicKey } = useWallet();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (publicKey) {
      const connection = new Connection(RPC_URL);
      connection.getBalance(publicKey).then(b => {
        setBalance(b / LAMPORTS_PER_SOL);
      });
    } else {
      setBalance(null);
    }
  }, [publicKey]);

  if (!connected) return null;

 // return (
  // <div className="text-center text-sm text-gray-300 mt-2">
   //  Balance: {balance?.toFixed(4)} SOL
  // </div> 
  //);
}