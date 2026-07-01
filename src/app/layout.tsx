import type { Metadata, Viewport } from "next";
import { Fredoka, Outfit } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ClearImg — Free AI Background Remover (HD, No Signup)",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Remove the background from any photo in seconds, free and in HD. Fix brightness and color, add backdrops or studio shadows, and download every size — no signup, no watermark.",
  keywords: [
    "background remover",
    "remove background from image",
    "free background remover",
    "transparent background maker",
    "remove background online",
    "AI background removal",
    "photo cutout",
    "product photo background",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "ClearImg — Free AI Background Remover",
    description:
      "Crisp HD cutouts in seconds. Fix lighting, pick a backdrop, and download every size you need — free, no signup.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearImg — Free AI Background Remover",
    description:
      "Crisp HD cutouts in seconds. Fix lighting, pick a backdrop, and download every size you need — free, no signup.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141021" },
  ],
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
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
