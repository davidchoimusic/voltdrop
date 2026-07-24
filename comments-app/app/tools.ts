// Single source of the tool list for this app's sidebar + mobile menu.
// Mirrors the static site's sidebar (index.html) — keep in sync when tools ship.
export type Tool = { href: string; icon: string; label: string; sep?: false } | { sep: true }

export const TOOLS: Tool[] = [
  { href: '/', icon: '⚡', label: 'Voltage Drop' },
  { href: '/wire-size-calculator/', icon: '🔌', label: 'Wire Size' },
  { href: '/max-wire-length/', icon: '📏', label: 'Max Wire Length' },
  { href: '/ampacity-check/', icon: '🔥', label: 'Ampacity Check' },
  { href: '/conduit-fill/', icon: '🚇', label: 'Conduit Fill' },
  { href: '/box-fill/', icon: '📦', label: 'Box Fill' },
  { href: '/power-calculator/', icon: '🧮', label: 'Power Calculator' },
  { sep: true },
  { href: '/comments', icon: '💬', label: 'Feedback' },
]

export function toolLinkClass(href: string): string {
  return 'tool-link' + (href === '/comments' ? ' active' : '')
}
