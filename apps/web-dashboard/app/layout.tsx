import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Stolik — Panel restauracji',
  description: 'System zarządzania rezerwacjami',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  )
}
