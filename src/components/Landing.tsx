import { FAQ_ITEMS } from "@/lib/constants";

/**
 * Server-rendered landing content below the hero. Pure static markup,
 * ships zero JS and keeps the SEO copy in the initial HTML.
 */
export function Landing() {
  return (
    <>
      {/* How it works */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        style={{
          padding: "64px 20px",
          background: "var(--bg2)",
          borderTop: "1.5px solid var(--line-soft)",
          borderBottom: "1.5px solid var(--line-soft)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            id="how-heading"
            className="font-display"
            style={{ fontWeight: 600, fontSize: 32, textAlign: "center", margin: 0 }}
          >
            Three steps. Zero fuss.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
              marginTop: 40,
            }}
          >
            {[
              {
                step: "1",
                title: "Upload",
                color: "var(--coral)",
                copy: "Drop in a PNG, JPG, or WebP: product shots, portraits, pets, logos, signatures, and handwriting are all welcome.",
              },
              {
                step: "2",
                title: "AI does the cutting",
                color: "var(--sunny)",
                copy: "Our servers trace the subject in HD and refine every edge at full resolution. No laggy in-browser processing.",
              },
              {
                step: "3",
                title: "Polish & download",
                color: "var(--mint)",
                copy: "Compare before and after, pick a backdrop, fix the lighting, and export every size you need.",
              },
            ].map((s) => (
              <div key={s.step} className="ci-card" style={{ padding: 24, position: "relative" }}>
                <span
                  aria-hidden
                  className="font-display"
                  style={{
                    position: "absolute",
                    top: -16,
                    left: 20,
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    background: s.color,
                    color: "#251E3A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  {s.step}
                </span>
                <h3 className="font-display" style={{ margin: "10px 0 0", fontSize: 19, fontWeight: 600 }}>
                  {s.title}
                </h3>
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>
                  {s.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section
        id="use-cases"
        aria-labelledby="use-cases-heading"
        style={{ padding: "64px 20px 8px" }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            id="use-cases-heading"
            className="font-display"
            style={{ fontWeight: 600, fontSize: 32, textAlign: "center", margin: 0 }}
          >
            What can you clear the background from?
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 16,
              maxWidth: 620,
              margin: "12px auto 0",
              lineHeight: 1.6,
            }}
          >
            ClearImg reads the image before it cuts. Photographs go to an AI
            segmentation model, while pen strokes and lettering go to a
            dedicated ink pipeline that traces the stroke itself, so thin
            handwriting survives instead of being flattened into a blob.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginTop: 36,
            }}
          >
            {[
              {
                title: "Signatures",
                copy: "Turn a photographed or scanned signature into a transparent PNG with no paper left behind and no pale outline around the ink. Drop it straight into a contract, PDF, or email footer.",
              },
              {
                title: "Handwriting & text",
                copy: "Remove the background from handwritten notes, lettering, calligraphy, and stamps. Light text on a colored panel works the same way as dark ink on white paper.",
              },
              {
                title: "Product photos",
                copy: "Clean white or transparent cutouts for e-commerce listings, marketplaces, and catalogues, with edges sharp enough for a zoomed product page.",
              },
              {
                title: "Portraits & pets",
                copy: "Hair and fur keep their wispy detail thanks to full-resolution edge refinement. Switch Edges to Soft for the finest strands.",
              },
              {
                title: "Logos & graphics",
                copy: "Lift a logo off its backdrop into a transparent PNG for a deck, a website header, a watermark, or a sticker.",
              },
              {
                title: "Anything else",
                copy: "Cars, furniture, food, artwork, screenshots. If it has a subject and a background, ClearImg will separate them.",
              },
            ].map((u) => (
              <div key={u.title} className="ci-card" style={{ padding: 20 }}>
                <h3 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
                  {u.title}
                </h3>
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
                  {u.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        aria-labelledby="features-heading"
        style={{ padding: "64px 20px" }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2
            id="features-heading"
            className="font-display"
            style={{ fontWeight: 600, fontSize: 32, textAlign: "center", margin: 0 }}
          >
            One studio for every cutout
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 16,
              maxWidth: 560,
              margin: "12px auto 0",
              lineHeight: 1.6,
            }}
          >
            Make a background transparent, swap it for a solid color, or drop
            in a studio shadow, then fix the lighting and export every size
            without leaving the page.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 36,
            }}
          >
            {[
              {
                title: "HD edge quality",
                copy: "Full-resolution edge refinement keeps hair, fur, and fine outlines crisp. No blocky halos, and no pale outline around ink or lettering.",
              },
              {
                title: "Backdrops & shadows",
                copy: "Transparent, solid color, or a soft studio shadow that makes products look shot on set.",
              },
              {
                title: "Light & color fixes",
                copy: "Brightness, contrast, and saturation sliders with live preview, baked into the download.",
              },
              {
                title: "Every size at once",
                copy: "Export the original resolution plus large, social, and thumbnail sizes in PNG, JPG, or WebP.",
              },
              {
                title: "Touch-up brushes",
                copy: "Erase leftovers or restore parts the AI trimmed, with undo, right on the preview.",
              },
              {
                title: "Private by design",
                copy: "Photos are processed in memory on our servers and never stored.",
              },
            ].map((f) => (
              <div key={f.title} className="ci-card" style={{ padding: 20 }}>
                <h3 className="font-display" style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
                  {f.title}
                </h3>
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
                  {f.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        aria-labelledby="faq-heading"
        style={{
          padding: "64px 20px 72px",
          background: "var(--bg2)",
          borderTop: "1.5px solid var(--line-soft)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2
            id="faq-heading"
            className="font-display"
            style={{ fontWeight: 600, fontSize: 32, textAlign: "center", margin: "0 0 24px" }}
          >
            Frequently asked questions
          </h2>
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="ci-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer style={{ padding: "26px 20px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          © {new Date().getFullYear()} ClearImg · free AI background remover.
          Made for clean cutouts.
        </p>
      </footer>
    </>
  );
}
