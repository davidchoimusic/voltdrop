'use client'

import { useState } from 'react'
import { TOOLS, toolLinkClass } from './tools'

export default function ChromeHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="wrap">
        <div className="brand-row">
          <button
            type="button"
            className="tools-btn"
            aria-expanded={open}
            aria-controls="mobile-tools"
            onClick={() => setOpen(o => !o)}
          >
            ☰ Tools
          </button>
          <a className="brand" href="/">
            <img className="brand-logo" src="/img/logo.png" alt="" width={30} height={30} />
            <span className="brand-name">VoltDrop.app</span>
          </a>
          <a className="back-link" href="/">← Back to the tools</a>
        </div>
        {open && (
          <nav className="mobile-tools" id="mobile-tools" aria-label="Electrical tools menu">
            {TOOLS.map((t, i) =>
              'sep' in t && t.sep
                ? <hr key={`sep-${i}`} className="tool-sep" />
                : <a key={t.href} href={t.href} className={toolLinkClass(t.href)}>
                    <span aria-hidden="true">{t.icon}</span>{t.label}
                  </a>
            )}
          </nav>
        )}
        <p className="tagline">Feedback from the field — what's working, what's confusing, what we should build next.</p>
      </div>
    </header>
  )
}
