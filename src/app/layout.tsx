import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClearImg — Sharp Background Removal",
  description:
    "Remove image backgrounds with server-side HD edge refinement. Upload PNG, JPG, or WebP and download a crisp transparent cutout in seconds.",
  openGraph: {
    title: "ClearImg — Sharp Background Removal",
    description:
      "Server-side background removal with HD sharpness for product photos, portraits, and documents.",
    siteName: "ClearImg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#fafafa] text-slate-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
