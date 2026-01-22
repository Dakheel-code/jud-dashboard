import type { Metadata } from "next";
import { Cairo, Poppins } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import Providers from '@/components/Providers';

const UrgentAnnouncementModal = dynamic(
  () => import('@/components/UrgentAnnouncementModal'),
  { ssr: false }
);

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "إدارة المتاجر | جود",
  description: "نظام إدارة المتاجر - وكالة جود",
  icons: {
    icon: [
      { url: "/favicon.gif", type: "image/gif" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.gif",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.gif" type="image/gif" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.gif" />
      </head>
      <body className={`${cairo.className} antialiased`}>
        <Providers>
          <UrgentAnnouncementModal />
          {children}
        </Providers>
      </body>
    </html>
  );
}
