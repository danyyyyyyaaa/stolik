import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy — Dinto',
  description: 'How Dinto uses cookies and similar technologies.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-text mb-3">{title}</h2>
      <div className="text-sm text-muted leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function CookiesPage() {
  return (
    <article>
      <div className="mb-10">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-text mb-3">Cookie Policy</h1>
        <p className="text-sm text-muted">Last updated: April 2026</p>
      </div>

      <Section title="1. What Are Cookies">
        <p>
          Cookies are small text files that a website places on your device when you visit. They help the website
          remember your preferences and improve your experience. Cookies cannot execute code or deliver viruses.
        </p>
        <p>
          We also use similar technologies such as localStorage (in your browser) to store your session and preferences
          locally without sending data to a server.
        </p>
      </Section>

      <Section title="2. Cookies We Use">

        <p><strong className="text-text">Essential cookies (always active)</strong></p>
        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-xs">
            <thead>
              <tr className="bg-surface-2 border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-text">Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-text">Purpose</th>
                <th className="text-left px-4 py-2.5 font-semibold text-text">Expires</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-mono">stolik_token</td>
                <td className="px-4 py-2.5">Authentication session (JWT)</td>
                <td className="px-4 py-2.5">30 days</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-mono">stolik_user</td>
                <td className="px-4 py-2.5">Cached user profile (name, role)</td>
                <td className="px-4 py-2.5">Session</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-mono">stolik_active_restaurant</td>
                <td className="px-4 py-2.5">Currently selected restaurant for dashboard</td>
                <td className="px-4 py-2.5">Session</td>
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-2.5 font-mono">dinto_lang</td>
                <td className="px-4 py-2.5">Language preference (pl/en/ru/uk)</td>
                <td className="px-4 py-2.5">1 year</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono">dinto_theme</td>
                <td className="px-4 py-2.5">UI theme preference (dark/light)</td>
                <td className="px-4 py-2.5">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2">Essential cookies are required for the Platform to function and cannot be disabled.</p>

        <p className="mt-4"><strong className="text-text">Analytics cookies (optional)</strong></p>
        <p>
          We may use Vercel Analytics or a privacy-friendly analytics service to understand how the Platform is used
          (page views, feature usage). These analytics do not track you across other websites and do not contain
          personal identifiers.
        </p>
        <p>Analytics cookies can be opted out of in your browser settings or via browser extensions like uBlock Origin.</p>

        <p className="mt-4"><strong className="text-text">Advertising cookies</strong></p>
        <p>We do <strong>not</strong> use advertising or tracking cookies. We do not share your browsing data with ad networks.</p>
      </Section>

      <Section title="3. Managing Cookies">
        <p>You can manage or delete cookies through your browser settings. Here are links to instructions for common browsers:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Apple Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Microsoft Edge</a></li>
        </ul>
        <p>Please note: disabling essential cookies will prevent you from logging in and using the Platform.</p>
      </Section>

      <Section title="4. Contact">
        <p>
          Questions about our use of cookies: <a href="mailto:privacy@dinto.pl" className="text-accent hover:underline">privacy@dinto.pl</a>
        </p>
        <p>
          For more information on how we handle personal data, see our{' '}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
        </p>
      </Section>
    </article>
  )
}
