import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Fantasy Crypto — Draft. Trade. Compete.",
  description:
    "Draft crypto portfolios in live snake drafts. Compete head-to-head or in leagues. Win real USDC wagers. Powered by Pear Protocol on Hyperliquid.",
  keywords: ["crypto", "fantasy", "trading", "DeFi", "Pear Protocol", "Hyperliquid", "Arbitrum"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fantasy Crypto",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#080a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-fc-bg text-fc-text font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
