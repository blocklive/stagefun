"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { SupabaseProvider } from "../contexts/SupabaseContext";
import { ContractInteractionProvider } from "../contexts/ContractInteractionContext";
import SmartWalletInitializer from "../components/SmartWalletInitializer";
import PrivyAuthInitializer from "../components/PrivyAuthInitializer";

import { monadTestnet } from "viem/chains";

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
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        externalWallets: {
          walletConnect: {
            enabled: false,
          },
        },
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
        <PrivyAuthInitializer />
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
