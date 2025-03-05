"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SupabaseProvider } from "../contexts/SupabaseContext";
import { ContractInteractionProvider } from "../contexts/ContractInteractionContext";

// Define the chain configuration once to ensure consistency
const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
    public: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
  chainId: 10143,
  networkId: 10143,
  chainName: "Monad Testnet",
};

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#8364FF",
          logo: "/logo.svg",
        },
        defaultChain: MONAD_TESTNET,
        supportedChains: [MONAD_TESTNET],
        fiatOnRamp: {
          useSandbox: true,
        },
        embeddedWallets: {
          createOnLogin: "all-users",
          priceDisplay: {
            primary: "native-token",
            secondary: null,
          },
        },
      }}
    >
      <SupabaseProvider>
        <ContractInteractionProvider>{children}</ContractInteractionProvider>
      </SupabaseProvider>
    </PrivyProvider>
  );
}
