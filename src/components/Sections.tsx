export function HowItWorks() {
  const steps = [
    {
      title: "Upload",
      description: "Drop a PNG, JPG, or WebP image up to 20MB.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      ),
    },
    {
      title: "Process",
      description:
        "Our server removes the background with HD edge refinement for sharp cutouts.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      ),
    },
    {
      title: "Download",
      description:
        "Compare before and after, then download your transparent PNG or flattened image.",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      ),
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Three steps from upload to a sharp, production-ready cutout.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 text-center"
            >
              <span className="absolute -top-3 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full bg-teal-700 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-6 w-6"
                  aria-hidden
                >
                  {step.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ApiTeaser() {
  return (
    <section id="api" className="border-y border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Built for developers
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              The same API that powers this demo will integrate into PDFMingo and
              your own apps. Send an image, get a sharp cutout back — no
              client-side ML required.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                REST API with multipart upload
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                PNG, JPG, and WebP output
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                HD quality for sharp edges on documents and product photos
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 p-5 text-sm">
            <pre className="overflow-x-auto font-mono text-slate-300">
              <code>{`POST /v1/remove-background
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

file=@photo.jpg
format=png
quality=hd

→ 200 image/png`}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhyServerSide() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
          Why server-side?
        </h2>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Browser-based removers trade quality for speed. ClearImg runs on the
          server with HD edge refinement — so hair strands, product edges, and
          text on scanned images stay crisp. Perfect for PDF editors, e-commerce,
          and design workflows that need production-ready cutouts.
        </p>
      </div>
    </section>
  );
}
