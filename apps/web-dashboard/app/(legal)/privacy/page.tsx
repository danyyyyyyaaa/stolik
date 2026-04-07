import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Dinto',
  description: 'How Dinto collects, uses, and protects your personal data.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-text mb-3">{title}</h2>
      <div className="text-sm text-muted leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <article>
      <div className="mb-10">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-text mb-3">Privacy Policy</h1>
        <p className="text-sm text-muted">Last updated: April 2026</p>
        <p className="text-xs text-muted mt-2 bg-surface-2 border border-border rounded-lg px-4 py-2 inline-block">
          This is a translation for convenience. The Polish version is legally binding.
        </p>
      </div>

      <Section title="1. Data Controller">
        <p>
          Dinto sp. z o.o., Warsaw, Poland, is the controller of your personal data within the meaning of GDPR
          (Regulation (EU) 2016/679). Contact: <a href="mailto:privacy@dinto.pl" className="text-accent hover:underline">privacy@dinto.pl</a>
        </p>
      </Section>

      <Section title="2. Data We Collect">
        <p><strong className="text-text">Account data:</strong> first name, last name, email address, phone number, password (stored as a bcrypt hash — never in plain text).</p>
        <p><strong className="text-text">Booking data:</strong> restaurant name, date and time of reservation, party size, special requests, booking reference number.</p>
        <p><strong className="text-text">Usage data:</strong> pages visited, features used, device type, browser, IP address, timestamps.</p>
        <p><strong className="text-text">Restaurant data (for owners):</strong> restaurant name, address, photos, menu content, opening hours, social media links.</p>
        <p><strong className="text-text">Review data:</strong> rating, review text, date of visit.</p>
        <p><strong className="text-text">Location data:</strong> only with your explicit permission, used to show nearby restaurants. Never collected in the background.</p>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc list-inside space-y-1.5">
          <li>Provide and operate the Platform (account management, booking processing)</li>
          <li>Send booking confirmations, reminders, and cancellation notifications via email and SMS</li>
          <li>Enable restaurants to manage their reservations and guest relationships</li>
          <li>Improve the Platform through analytics and feedback</li>
          <li>Send marketing communications (only with your consent, opt-out anytime)</li>
          <li>Comply with legal obligations</li>
        </ul>
      </Section>

      <Section title="4. Legal Basis (GDPR Art. 6)">
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-text">Contract performance</strong> (Art. 6.1.b) — processing bookings, account management</li>
          <li><strong className="text-text">Legitimate interest</strong> (Art. 6.1.f) — platform security, fraud prevention, aggregate analytics</li>
          <li><strong className="text-text">Consent</strong> (Art. 6.1.a) — marketing emails, push notifications, location data. You may withdraw consent at any time.</li>
          <li><strong className="text-text">Legal obligation</strong> (Art. 6.1.c) — record-keeping required by Polish law</li>
        </ul>
      </Section>

      <Section title="5. Data Sharing">
        <p>We do not sell your data. We share data only with trusted service providers necessary to operate the Platform:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-text">Restaurants</strong> — receive guest name, phone number, and party size for bookings you make at their venue</li>
          <li><strong className="text-text">Stripe, Inc.</strong> — payment processing (subject to Stripe's Privacy Policy)</li>
          <li><strong className="text-text">Twilio, Inc.</strong> — SMS notifications (name and phone only)</li>
          <li><strong className="text-text">Resend, Inc.</strong> — email delivery (name and email only)</li>
          <li><strong className="text-text">Google LLC</strong> — Maps integration for restaurant locations and reviews</li>
          <li><strong className="text-text">Cloudflare, Inc.</strong> — file hosting for restaurant photos</li>
          <li><strong className="text-text">Railway</strong> — backend infrastructure hosting</li>
          <li><strong className="text-text">Vercel, Inc.</strong> — frontend hosting</li>
        </ul>
        <p>All processors are bound by data processing agreements and required to protect your data.</p>
      </Section>

      <Section title="6. Data Retention">
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-text">Account data:</strong> retained until you request deletion</li>
          <li><strong className="text-text">Booking records:</strong> 3 years from the booking date (required by Polish accounting law)</li>
          <li><strong className="text-text">Usage analytics:</strong> aggregated and anonymized after 12 months</li>
          <li><strong className="text-text">Email logs:</strong> 90 days</li>
        </ul>
      </Section>

      <Section title="7. Your Rights (GDPR)">
        <p>Under GDPR, you have the right to:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-text">Access</strong> — request a copy of your personal data</li>
          <li><strong className="text-text">Rectification</strong> — correct inaccurate data</li>
          <li><strong className="text-text">Erasure</strong> — request deletion ("right to be forgotten"), subject to legal retention requirements</li>
          <li><strong className="text-text">Portability</strong> — receive your data in a machine-readable format</li>
          <li><strong className="text-text">Restriction</strong> — ask us to pause processing of your data</li>
          <li><strong className="text-text">Objection</strong> — object to processing based on legitimate interest</li>
          <li><strong className="text-text">Withdraw consent</strong> — for any processing based on consent (marketing, push notifications)</li>
        </ul>
        <p>To exercise any of these rights, email <a href="mailto:privacy@dinto.pl" className="text-accent hover:underline">privacy@dinto.pl</a>. We will respond within 30 days.</p>
        <p>You also have the right to lodge a complaint with the Polish data protection authority (UODO): <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">uodo.gov.pl</a></p>
      </Section>

      <Section title="8. Cookies">
        <p>We use cookies and similar technologies. For details, see our <Link href="/cookies" className="text-accent hover:underline">Cookie Policy</Link>.</p>
      </Section>

      <Section title="9. Security">
        <p>We implement appropriate technical and organisational measures to protect your data, including:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>HTTPS encryption for all data in transit</li>
          <li>bcrypt password hashing (plain-text passwords are never stored)</li>
          <li>Access controls limiting who can access personal data</li>
          <li>Regular security reviews</li>
        </ul>
        <p>No system is 100% secure. If you discover a security issue, please report it to <a href="mailto:security@dinto.pl" className="text-accent hover:underline">security@dinto.pl</a>.</p>
      </Section>

      <Section title="10. Children">
        <p>The Platform is not intended for persons under 16 years of age. We do not knowingly collect data from children. If you believe a child has provided us with data, please contact us and we will delete it promptly.</p>
      </Section>

      <Section title="11. Changes">
        <p>We may update this Privacy Policy to reflect changes in our practices or applicable law. We will notify you via email and/or an in-app notice at least 14 days before material changes take effect.</p>
      </Section>

      <Section title="12. Contact">
        <p>Data protection inquiries: <a href="mailto:privacy@dinto.pl" className="text-accent hover:underline">privacy@dinto.pl</a></p>
        <p>Dinto sp. z o.o. · Warsaw, Poland</p>
      </Section>
    </article>
  )
}
