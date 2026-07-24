import type { Metadata } from 'next'
import Providers from './providers'
import ChromeHeader from './ChromeHeader'
import { TOOLS, toolLinkClass } from './tools'
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
        <ChromeHeader />
        <div className="layout wrap">
          <aside className="sidebar">
            <nav className="tool-nav" aria-label="Electrical tools">
              <span className="tool-nav-head">Electrical Tools</span>
              {TOOLS.map((t, i) =>
                'sep' in t && t.sep
                  ? <hr key={`sep-${i}`} className="tool-sep" />
                  : <a key={t.href} href={t.href} className={toolLinkClass(t.href)}>
                      <span aria-hidden="true">{t.icon}</span>{t.label}
                    </a>
              )}
            </nav>
          </aside>
          <div className="main-col">
            <Providers>{children}</Providers>
          </div>
        </div>
        <footer className="site-footer">
          <div className="wrap">
            <p><strong>VoltDrop</strong> · voltdrop.app · Free forever.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
