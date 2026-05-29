import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { LedgerProvider } from "@/contexts/LedgerContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 768,
  initialScale: 0.5, // Optional hint, but width usually overrides
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "KANPAI",
  description: "Die App für deinen Stammtisch",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          <AuthProvider>
            <LedgerProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </LedgerProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
              });
            }
          `,
        }}
      />
    </html>
  );
}
