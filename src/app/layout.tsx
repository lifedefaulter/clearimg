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
    default: "ClearImg: Free AI Background Remover (Photos & Signatures)",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Remove the background from any image in seconds, free and in HD: photos, products, portraits, logos, signatures, and handwriting. No signup, no watermark.",
  keywords: [
    // Head terms
    "background remover",
    "remove background",
    "remove background from image",
    "remove bg",
    "bg remover",
    "background remover online",
    "free background remover",
    "online background remover",
    "image background remover",
    "photo background remover",
    "picture background remover",
    "clear image background",
    "clear background",
    "background eraser",
    "background removal tool",
    "AI background remover",
    "automatic background remover",
    "remove background online free",
    // Transparency and output
    "transparent background maker",
    "make background transparent",
    "make image transparent",
    "transparent png maker",
    "png background remover",
    "jpg background remover",
    "remove white background",
    "remove black background",
    "white background remover",
    "change background color",
    "replace background",
    "photo cutout",
    // Signatures, handwriting, and documents
    "signature background remover",
    "remove background from signature",
    "transparent signature",
    "signature to png",
    "make signature transparent",
    "extract signature from image",
    "digitize signature",
    "handwriting background remover",
    "remove background from handwriting",
    "remove background from text",
    "text background remover",
    "remove paper background",
    "scanned document background remover",
    "stamp background remover",
    "clean up scanned signature",
    // Logos and graphics
    "logo background remover",
    "remove background from logo",
    "transparent logo maker",
    "sticker maker",
    // Subjects
    "product photo background remover",
    "portrait background remover",
    "remove background from portrait",
    "pet photo background remover",
    "remove background from selfie",
    "hair background removal",
    "ecommerce product cutout",
    // Qualifiers
    "background remover no watermark",
    "background remover no signup",
    "hd background remover",
    "high resolution background remover",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "ClearImg: Free AI Background Remover",
    description:
      "Crisp HD cutouts in seconds, from product photos to signatures and handwriting. Pick a backdrop, fix the lighting, download every size. Free, no signup.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClearImg: Free AI Background Remover",
    description:
      "Crisp HD cutouts in seconds, from product photos to signatures and handwriting. Pick a backdrop, fix the lighting, download every size. Free, no signup.",
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
