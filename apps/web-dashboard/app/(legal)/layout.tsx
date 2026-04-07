import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-surface px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-text tracking-tight">
          Dinto
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted">
          <Link href="/login"    className="hover:text-text transition-colors">Sign in</Link>
          <Link href="/register" className="hover:text-text transition-colors">Register</Link>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-6 py-5 text-center text-xs text-muted">
        <p>© 2026 Dinto · Warsaw, Poland · <a href="https://dinto.pl" className="hover:text-text transition-colors">dinto.pl</a></p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/terms"   className="hover:text-text transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-text transition-colors">Privacy</Link>
          <Link href="/cookies" className="hover:text-text transition-colors">Cookies</Link>
        </div>
      </footer>
    </div>
  )
}
