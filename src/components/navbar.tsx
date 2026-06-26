'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Globe,
} from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const { lang, t, setLang } = useI18n()

  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user ? { id: user.id, email: user.email || '' } : null)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => getUser())

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Products' },
    { href: '/categories', label: 'Categories' },
  ]

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-0.5">
            <Image
              src="/logo.png"
              alt="Lumintusuite"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain"
            />

            <span className="block whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-base font-bold text-transparent sm:text-xl">
              Lumintusuite
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLangOpen(!langOpen)}
                className="gap-1"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">{lang}</span>
              </Button>

              {langOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[100px] rounded-md border bg-background py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setLang('en')
                      setLangOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      lang === 'en' ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    English
                  </button>

                  <button
                    onClick={() => {
                      setLang('id')
                      setLangOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
                      lang === 'id' ? 'bg-muted font-medium' : ''
                    }`}
                  >
                    Indonesia
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon">
                    <LayoutDashboard className="h-5 w-5" />
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    {t('nav_login', 'navbar')}
                  </Button>
                </Link>

                <Link href="/auth/register">
                  <Button size="sm">
                    {t('nav_register', 'navbar')}
                  </Button>
                </Link>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-4 py-2 text-sm font-medium ${
                    isActive(link.href)
                      ? 'bg-muted text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {!user && (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground"
                >
                  {t('nav_login', 'navbar')}
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
