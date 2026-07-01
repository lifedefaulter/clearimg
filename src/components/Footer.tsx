export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} ClearImg.net — Server-side sharp background
          removal
        </p>
        <div className="flex gap-6 text-sm text-slate-500">
          <span className="cursor-default">Privacy</span>
          <span className="cursor-default">Terms</span>
          <a
            href="mailto:hello@clearimg.net"
            className="transition-colors hover:text-teal-700"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
