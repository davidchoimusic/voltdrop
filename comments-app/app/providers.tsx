'use client'

import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  // NextAuth client must hit this app's API under the site's /comments prefix.
  return <SessionProvider basePath="/comments/api/auth">{children}</SessionProvider>
}
