import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/hooks/useCart";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "LogiMarket.pl — Katalog B2B sprzętu i wyposażenia magazynowego",
  description: "Wózki widłowe, regały, palety, opakowania i wyposażenie logistyczne. Model hybrydowy B2B: RFQ + E-Commerce.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
