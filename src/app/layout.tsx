import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PrivyProvider from "./providers/PrivyProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "stage.fun",
  description: "stage.fun is a fun platform",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyProvider>{children}</PrivyProvider>
      </body>
    </html>
  );
}
