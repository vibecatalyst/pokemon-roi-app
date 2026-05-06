import type { Metadata } from "next";
import "./globals.css";
import { FeesProvider } from "@/lib/fees-context";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "PokeROI - PSA Grading Calculator",
  description: "Calculate your Pokemon card grading ROI with real prices",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FeesProvider>
          <Header />
          {children}
        </FeesProvider>
      </body>
    </html>
  );
}