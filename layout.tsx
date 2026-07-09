import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BYKS Satın Alma",
  description: "BYKS satın alma onay ve sipariş takip sistemi",
  manifest: "/manifest.webmanifest",
  applicationName: "BYKS Satın Alma",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BYKS Satın Alma"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#0a2544",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
