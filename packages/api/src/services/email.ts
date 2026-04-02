// Email service — uses Resend if RESEND_API_KEY is set, otherwise logs to console.
// Add RESEND_API_KEY to .env to enable real email delivery.

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://stolik-dashboard.vercel.app'

export async function sendVerificationEmail(
  email: string,
  firstName: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${DASHBOARD_URL}/verify-email?token=${token}`

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    process.env.EMAIL_FROM || 'Stolik <no-reply@stolik.pl>',
        to:      email,
        subject: 'Potwierdź swój email — Stolik',
        html: `
          <p>Cześć ${firstName},</p>
          <p>Kliknij poniższy link, aby potwierdzić swój adres email:</p>
          <p><a href="${verifyUrl}" style="color:#238636;font-weight:bold">Potwierdź email →</a></p>
          <p>Link wygaśnie za 24 godziny.</p>
          <p>— Zespół Stolik</p>
        `,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Email] Resend error:', err)
    }
  } else {
    // Dev fallback — log the link
    console.log(`[Email] Verification link for ${email}: ${verifyUrl}`)
  }
}
