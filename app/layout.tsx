import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZOOL FOOD | كل احتياجاتك توصلك",
  description: "منصة توصيل المطاعم والصيدليات والسوبرماركت في مكان واحد.",
  applicationName: "ZOOL FOOD",
  manifest: "/manifest.json",
  themeColor: "#FF5A00",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  appleWebApp: {
    capable: true,
    title: "ZOOL FOOD",
    statusBarStyle: "default"
  },
  openGraph: {
    title: "ZOOL FOOD | كل احتياجاتك توصلك",
    description: "اطلب من المطاعم والصيدليات والسوبرماركت في مكان واحد.",
    type: "website",
    locale: "ar_SA"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
