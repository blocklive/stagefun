"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { SupabaseProvider } from "../contexts/SupabaseContext";
import { ContractInteractionProvider } from "../contexts/ContractInteractionContext";
import SmartWalletInitializer from "../components/SmartWalletInitializer";

// Define the chain configuration once to ensure consistency
const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad-testnet",
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz",
      ],
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
        loginMethods: ["twitter"],
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
          ethereum: {
            createOnLogin: "all-users",
          },
          priceDisplay: {
            primary: "native-token",
            secondary: null,
          },
        },
      }}
    >
      <SmartWalletsProvider
        config={{
          paymasterContext: {
            mode: "SPONSORED",
            calculateGasLimits: true,
            expiryDuration: 300,
            sponsorshipInfo: {
              webhookData: {
                projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
              },
              smartAccountInfo: {
                name: "KERNEL",
                version: "1.0.0",
              },
            },
          },
        }}
      >
        <SupabaseProvider>
          <ContractInteractionProvider>
            <SmartWalletInitializer />
            {children}
          </ContractInteractionProvider>
        </SupabaseProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
