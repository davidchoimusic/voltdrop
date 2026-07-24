import type { Metadata } from 'next'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Feedback | VoltDrop',
  description: 'Leave feedback on VoltDrop — the voltage drop calculator that explains itself. Sign in with Google or Facebook.',
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <div className="brand-row">
              {/* Plain <a>: back to the static site, outside this app's basePath */}
              <a className="brand" href="/">
                {/* Static site asset — same origin, outside basePath */}
                <img className="brand-logo" src="/img/logo.png" alt="" width={30} height={30} />
                <span className="brand-name">VoltDrop.app</span>
              </a>
              <a className="back-link" href="/">← Back to the tools</a>
            </div>
            <p className="tagline">Feedback</p>
          </div>
        </header>
        <Providers>{children}</Providers>
        <footer className="site-footer">
          <div className="wrap">
            <p><strong>VoltDrop</strong> · voltdrop.app · Free forever.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
