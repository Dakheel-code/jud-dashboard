import type { Metadata } from "next";
import { Cairo, Poppins } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';
import Providers from '@/components/Providers';
import { getBrandingForMetadata } from '@/lib/branding';

const UrgentAnnouncementModal = dynamic(
  () => import('@/components/UrgentAnnouncementModal'),
  { ssr: false }
);

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
  preload: true,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
  preload: false,
});

// جلب بيانات الـ branding من الملف مباشرة (Server-Side)
const brandingMeta = getBrandingForMetadata();

export const metadata: Metadata = {
  title: brandingMeta.title,
  description: brandingMeta.description,
  icons: {
    icon: [
      { url: brandingMeta.favicon, type: "image/gif" },
      { url: "/favicon.ico" },
    ],
    apple: brandingMeta.favicon,
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
