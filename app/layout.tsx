import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BYKS Satın Alma",
  description: "BYKS satın alma talep, onay, sipariş ve bildirim demosu",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BYKS Satın Alma",
    statusBarStyle: "default"
  },
  icons: {
    icon: [{ url: "/byks-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/byks-logo.svg", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a2544"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
