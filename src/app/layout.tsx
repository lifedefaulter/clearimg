import type { Metadata } from "next";
import { Fredoka, Outfit } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ClearImg — Backgrounds, Begone",
  description:
    "Remove image backgrounds with server-side HD edge refinement. Upload PNG, JPG, or WebP and download a crisp transparent cutout in seconds.",
  openGraph: {
    title: "ClearImg — Backgrounds, Begone",
    description:
      "Server-side background removal with HD sharpness for product photos, portraits, and documents.",
    siteName: "ClearImg",
  },
};

const themeInit = `(function(){try{var t=localStorage.getItem('clearimg-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
