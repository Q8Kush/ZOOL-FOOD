import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ZOOL FOOD | كل احتياجاتك توصلك", description: "منصة توصيل المطاعم والصيدليات والسوبرماركت في مكان واحد.", manifest: "/manifest.json", themeColor: "#FF5A00" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ar" dir="rtl"><body>{children}</body></html>; }