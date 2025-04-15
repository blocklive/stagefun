"use client";

import { usePrivy } from "@privy-io/react-auth";
import AuthenticatedLayout from "./(authenticated)/layout";
import PublicLayout from "./(public)/layout";
import HomePage from "@/app/components/HomePage";
import AccessCodePage from "@/app/components/AccessCodePage";

export default function RootPage() {
  const { authenticated, ready } = usePrivy();

  if (!ready) return null;

  if (authenticated) {
    return (
      <AuthenticatedLayout>
        <HomePage />
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
