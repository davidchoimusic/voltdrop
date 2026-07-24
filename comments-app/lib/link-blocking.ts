/**
 * Link blocking patterns for comment moderation
 * Shared between feedback POST and PATCH routes
 */

const BLOCKED_PATTERNS = [
  /https?:\/\//i,                    // Full URLs
  /www\.[a-z0-9]/i,                  // www.something
  /[a-z0-9]+\.(com|org|net|io)\b/i,  // domain.tld pattern
  /dot\s*(com|org|net|io)/i,         // "dot com" spelled out
  /\[dot\]/i,                        // [dot] obfuscation
]

export function containsLink(text: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(text))
}
