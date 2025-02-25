"use client";

import { PrivyProvider as Provider } from "@privy-io/react-auth";
import { ReactNode } from "react";

export default function PrivyProvider({ children }: { children: ReactNode }) {
  return (
    <Provider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        loginMethods: ["email", "wallet", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#8364FF",
          logo: "/logo.svg",
        },
      }}
    >
      {children}
    </Provider>
  );
}
