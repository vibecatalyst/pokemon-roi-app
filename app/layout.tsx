import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { FeesProvider } from "@/lib/fees-context";
import { WatchlistProvider } from "@/lib/watchlist-context";
import { SubmissionsProvider } from "@/lib/submissions-context";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeROI — Pokémon Card Grading Calculator",
  description: "Calculate PSA grading ROI on Pokémon cards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <FeesProvider>
            <WatchlistProvider>
              <SubmissionsProvider>
                <Header />
                {children}
              </SubmissionsProvider>
            </WatchlistProvider>
          </FeesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}