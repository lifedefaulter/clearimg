import { BackgroundTool } from "@/components/BackgroundTool";
import { ApiTeaser, HowItWorks, WhyServerSide } from "@/components/Sections";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50/80">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Remove backgrounds with{" "}
              <span className="text-teal-700">server-side sharpness</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 sm:text-xl">
              Upload any image and get a crisp transparent PNG in seconds. HD
              edge refinement for product photos, portraits, and documents.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              No install · PNG, JPG, WebP · Up to 20MB · Free to try
            </p>
          </div>
        </div>
      </section>

      {/* Tool */}
      <section id="tool" className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <BackgroundTool />
        </div>
      </section>

      <HowItWorks />
      <WhyServerSide />
      <ApiTeaser />
    </>
  );
}
