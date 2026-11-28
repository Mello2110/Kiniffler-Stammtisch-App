import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClubProvider } from "@/contexts/ClubContext";
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
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "KANPAI",
  description: "Die App für deinen Stammtisch",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=3", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=3",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KANPAI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          <AuthProvider>
            <ClubProvider>
              <LedgerProvider>
                <ClientLayout>
                  {children}
                </ClientLayout>
              </LedgerProvider>
            </ClubProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
