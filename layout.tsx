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
    icon: [{ url: "/byks-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/byks-logo.svg", type: "image/svg+xml" }]
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
