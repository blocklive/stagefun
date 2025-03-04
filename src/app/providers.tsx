"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SupabaseProvider } from "../contexts/SupabaseContext";
import { ContractInteractionProvider } from "../contexts/ContractInteractionContext";
import { NETWORK_CONFIG } from "../lib/contracts/PoolCommitment";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#8B5CF6",
          logo: "https://your-logo-url.com/logo.png",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: {
          id: 10143, // Monad Testnet chain ID
          name: "Monad Testnet",
          rpcUrls: {
            default: { http: ["https://testnet-rpc.monad.xyz"] },
            public: { http: ["https://testnet-rpc.monad.xyz"] },
          },
          nativeCurrency: {
            name: "Monad",
            symbol: "MON",
            decimals: 18,
          },
        },
        supportedChains: [
          {
            id: 10143, // Monad Testnet chain ID
            name: "Monad Testnet",
            rpcUrls: {
              default: { http: ["https://testnet-rpc.monad.xyz"] },
              public: { http: ["https://testnet-rpc.monad.xyz"] },
            },
            nativeCurrency: {
              name: "Monad",
              symbol: "MON",
              decimals: 18,
            },
          },
        ],
      }}
    >
      <SupabaseProvider>
        <ContractInteractionProvider>{children}</ContractInteractionProvider>
      </SupabaseProvider>
    </PrivyProvider>
  );
}
