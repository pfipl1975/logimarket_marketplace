import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { CartProvider } from "@/hooks/useCart";
import type { Locale } from "@/lib/i18n/config";
import { JsonLdScript, createGlobalAuthorityJsonLd } from "@/lib/seo/json-ld";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

type RootShellProps = {
  children: ReactNode;
  lang: Locale;
};

export function RootShell({ children, lang }: RootShellProps) {
  return (
    <html lang={lang} className={inter.variable}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <JsonLdScript data={createGlobalAuthorityJsonLd(lang)} />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
