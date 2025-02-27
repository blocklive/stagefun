"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { SupabaseProvider } from "../contexts/SupabaseContext";
import { ContractInteractionProvider } from "../contexts/ContractInteractionContext";

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
      }}
    >
      <SupabaseProvider>
        <ContractInteractionProvider>{children}</ContractInteractionProvider>
      </SupabaseProvider>
    </PrivyProvider>
  );
}
