import { StudioShell } from "@/components/StudioShell";
import { Landing } from "@/components/Landing";
import { FAQ_ITEMS, SITE_NAME, SITE_URL } from "@/lib/constants";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description:
        "Free AI background remover with HD edge quality, color corrections, backdrops, studio shadows, and multi-size downloads.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "AI background removal in HD",
        "Transparent, solid color, or custom backdrops",
        "Soft studio shadows",
        "Brightness, contrast, and saturation corrections",
        "Erase and restore touch-up brushes",
        "Multi-size downloads in PNG, JPG, and WebP",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StudioShell landing={<Landing />} />
    </>
  );
}
