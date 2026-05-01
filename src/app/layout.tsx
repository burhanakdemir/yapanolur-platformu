import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../sentry.client.config";
import "./globals.css";
import { Suspense } from "react";
import AppSiteFooter from "@/components/AppSiteFooter";
import CookieConsentBar from "@/components/CookieConsentBar";
import PwaRegister from "@/components/PwaRegister";
import { getSafeMetadataBase } from "@/lib/appUrl";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSafeMetadataBase(),
  applicationName: "İlan",
  title: "İlan ve İhale Platformu",
  description: "Türkiye odaklı ilan ve ihale teklif platformu",
  appleWebApp: {
    capable: true,
    title: "İlan",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fff7ed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        App Router'da <head> ekleme: Next, globals.css / chunk CSS için <link> enjekte eder;
        manuel <head> bu süreci bozup tüm sayfada stillerin yok olmasına yol açabiliyor.
        Yedek stil: globals.css :root / body
      */}
      <body className="flex min-h-full flex-col pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pt-[env(safe-area-inset-top,0px)]">
        <PwaRegister />
        <div className="app-main-shell flex min-h-0 flex-1 flex-col">{children}</div>
        <AppSiteFooter />
        <Suspense fallback={null}>
          <CookieConsentBar />
        </Suspense>
      </body>
    </html>
  );
}
