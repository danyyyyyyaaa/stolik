import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Dinto',
  description: 'Terms of Service for the Dinto restaurant reservation platform.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-text mb-3">{title}</h2>
      <div className="text-sm text-muted leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <article>
      <div className="mb-10">
        <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">Legal</p>
        <h1 className="text-3xl font-bold text-text mb-3">Terms of Service</h1>
        <p className="text-sm text-muted">Last updated: April 2026</p>
        <p className="text-xs text-muted mt-2 bg-surface-2 border border-border rounded-lg px-4 py-2 inline-block">
          This is a translation for convenience. The Polish version is legally binding.
        </p>
      </div>

      <Section title="1. Introduction">
        <p>
          Dinto ("Platform", "we", "us") is an online restaurant reservation platform operated by Dinto sp. z o.o.,
          registered in Warsaw, Poland. The Platform connects restaurant guests ("Guests") with restaurant businesses
          ("Restaurants") for the purpose of table reservations.
        </p>
        <p>
          By creating an account or using the Platform, you agree to these Terms of Service. If you do not agree,
          please do not use the Platform.
        </p>
      </Section>

      <Section title="2. Definitions">
        <ul className="list-disc list-inside space-y-1.5">
          <li><strong className="text-text">Platform</strong> — the Dinto website, mobile app, and embeddable booking widget</li>
          <li><strong className="text-text">User</strong> — any person with a Dinto account (guest or restaurant owner)</li>
          <li><strong className="text-text">Guest</strong> — a user who makes reservations at restaurants</li>
          <li><strong className="text-text">Restaurant</strong> — a business using Dinto to manage reservations</li>
          <li><strong className="text-text">Booking</strong> — a reservation request made through the Platform</li>
          <li><strong className="text-text">Service</strong> — all features and functionality provided by the Platform</li>
        </ul>
      </Section>

      <Section title="3. Account Registration">
        <p>To use the Platform you must register an account with a valid email address. You are responsible for:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>Providing accurate information during registration</li>
          <li>Keeping your password secure and confidential</li>
          <li>All activity that occurs under your account</li>
        </ul>
        <p>You must be at least 16 years old to create an account. By registering, you confirm you meet this requirement.</p>
      </Section>

      <Section title="4. For Guests">
        <p><strong className="text-text">Bookings.</strong> A booking submitted through the Platform is a reservation request. It is considered confirmed once the restaurant accepts it (or if the restaurant has automatic confirmation enabled).</p>
        <p><strong className="text-text">Cancellation policy.</strong> Please cancel at least 2 hours before your reservation time. Late cancellations may affect your ability to book in the future.</p>
        <p><strong className="text-text">No-show policy.</strong> If you repeatedly fail to show up for confirmed reservations without cancelling, Dinto reserves the right to restrict your account.</p>
        <p><strong className="text-text">Reviews.</strong> Reviews must be honest, based on an actual visit, and must not contain offensive or defamatory content. Dinto may remove reviews that violate these rules.</p>
      </Section>

      <Section title="5. For Restaurants">
        <p><strong className="text-text">Subscription.</strong> Restaurants access Dinto through subscription plans (Free, Pro, Business). Plan details and pricing are available on the Billing page. Subscriptions renew automatically until cancelled.</p>
        <p><strong className="text-text">Honoring bookings.</strong> Restaurants are responsible for honoring confirmed bookings. Frequent cancellations or failures to seat confirmed guests may result in account suspension.</p>
        <p><strong className="text-text">Content accuracy.</strong> Restaurant descriptions, photos, opening hours, and menus must be accurate and up to date.</p>
        <p><strong className="text-text">Guest data.</strong> Restaurants receive limited guest information (name, phone, party size) solely for fulfilling reservations. This data must be handled in accordance with our{' '}
          <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link> and applicable law.
        </p>
      </Section>

      <Section title="6. Payments">
        <p>Payment processing is handled by Stripe, Inc. Dinto does not store card numbers or sensitive payment data. By making a payment, you also agree to Stripe's Terms of Service.</p>
        <p>For restaurants: subscription fees are charged monthly or annually. Refunds are available within 14 days of purchase if the service has not been materially used, in accordance with Polish consumer law.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>The Platform, including its design, code, and content, is owned by Dinto and protected by copyright law. You may not copy, reproduce, or create derivative works without our written consent.</p>
        <p>You retain ownership of content you upload (photos, descriptions, reviews). By uploading content, you grant Dinto a non-exclusive license to display and distribute it on the Platform.</p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>Dinto is a technology platform that facilitates connections between Guests and Restaurants. We are not party to the dining experience itself and are not liable for:</p>
        <ul className="list-disc list-inside space-y-1.5">
          <li>The quality of food, service, or experience at any restaurant</li>
          <li>Restaurant closures, changes in hours, or cancellations by restaurants</li>
          <li>Any indirect, incidental, or consequential damages arising from use of the Platform</li>
        </ul>
        <p>Our total liability to you shall not exceed the amount you paid for the Service in the past 12 months.</p>
      </Section>

      <Section title="9. Termination">
        <p>Either party may terminate their account at any time. Guests may delete their account from the Profile settings. Restaurants may cancel their subscription from the Billing page.</p>
        <p>Upon request, we will delete your personal data within 30 days, subject to legal retention requirements (see Privacy Policy).</p>
        <p>We may suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or cause harm to other users.</p>
      </Section>

      <Section title="10. Governing Law">
        <p>These Terms are governed by Polish law. Any disputes shall be resolved by the competent courts of Warsaw, Poland. Consumers resident in the EU may also use the EU Online Dispute Resolution platform.</p>
      </Section>

      <Section title="11. Changes to Terms">
        <p>We may update these Terms from time to time. We will notify registered users via email at least 14 days before material changes take effect. Continued use of the Platform after that date constitutes acceptance of the new Terms.</p>
      </Section>

      <Section title="12. Contact">
        <p>For legal inquiries, contact us at: <a href="mailto:legal@dinto.pl" className="text-accent hover:underline">legal@dinto.pl</a></p>
        <p>Dinto sp. z o.o. · Warsaw, Poland</p>
      </Section>
    </article>
  )
}
