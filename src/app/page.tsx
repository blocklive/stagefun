"use client";

import { usePrivy } from "@privy-io/react-auth";
import AuthenticatedLayout from "./(authenticated)/layout";
import PublicLayout from "./(public)/layout";
import PoolsDisplay from "@/app/components/PoolsDisplay";
import AccessCodePage from "@/app/components/AccessCodePage";

export default function RootPage() {
  const { authenticated, ready } = usePrivy();

  if (!ready) return null;

  if (authenticated) {
    return (
      <AuthenticatedLayout>
        <PoolsDisplay />
      </AuthenticatedLayout>
    );
  } else {
    return (
      <PublicLayout>
        <AccessCodePage />
      </PublicLayout>
    );
  }
}
