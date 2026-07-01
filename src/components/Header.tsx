import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white">
            CI
          </span>
          <div className="leading-tight">
            <span className="block text-base font-semibold text-slate-900">
              ClearImg
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">
              Sharp background removal
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-6">
          <Link
            href="/#tool"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Tool
          </Link>
          <Link
            href="/#api"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            API
          </Link>
          <span className="hidden rounded-md px-3 py-2 text-sm text-slate-400 sm:inline">
            Pricing
          </span>
          <span className="hidden rounded-md px-3 py-2 text-sm text-slate-400 md:inline">
            Sign in
          </span>
          <Link
            href="/#api"
            className="rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800 sm:px-4"
          >
            Get API key
          </Link>
        </nav>
      </div>
    </header>
  );
}
