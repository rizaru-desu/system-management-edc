import { useEffect, useState } from 'react'
import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'

function resolveTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * App-wide toast outlet (mounted once in __root.tsx). Follows the `light`/
 * `dark` class on <html> — set by the root theme-init script and
 * ThemeToggle — so toasts match the active theme without a shared store.
 */
export function Toaster(props: ToasterProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setTheme(resolveTheme())
    const observer = new MutationObserver(() => setTheme(resolveTheme()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme}
      richColors
      closeButton
      position="top-right"
      {...props}
    />
  )
}
