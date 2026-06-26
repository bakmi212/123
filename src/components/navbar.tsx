'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Menu, X, ShoppingCart, User, LogOut, LayoutDashboard, Package, Globe, Sparkles } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const { lang, t, setLang } = useI18n()
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ? { id: user.id, email: user.email || '' } : null)
      if (user) {
        const { count } = await supabase.from('cart_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        setCartCount(count || 0)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => getUser())
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

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">

            <Image
              src="/logo.png"
              alt="Lumintusuite"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain"
            />
          
            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Lumintusuite
            </span>
          
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive(link.href) ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setLangOpen(!langOpen)} className="gap-1">
                <Globe className="h-4 w-4" />
                <span className="uppercase text-xs font-medium">{lang}</span>
              </Button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 bg-background border rounded-md shadow-lg py-1 z-50 min-w-[100px]">
                  <button onClick={() => { setLang('en'); setLangOpen(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${lang === 'en' ? 'bg-muted font-medium' : ''}`}>English</button>
                  <button onClick={() => { setLang('id'); setLangOpen(false) }} className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${lang === 'id' ? 'bg-muted font-medium' : ''}`}>Indonesia</button>
                </div>
              )}
            </div>

            {user ? (
              <>
                <Link href="/dashboard/cart" className="relative">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="icon"><Package className="h-5 w-5" /></Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="ghost" size="icon"><LayoutDashboard className="h-5 w-5" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">{t('nav_login', 'navbar')}</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">{t('nav_register', 'navbar')}</Button>
                </Link>
              </>
            )}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`px-4 py-2 text-sm font-medium rounded-md ${isActive(link.href) ? 'bg-muted text-primary' : 'text-muted-foreground'}`}>
                  {link.label}
                </Link>
              ))}
              {!user && (
                <>
                  <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground">{t('nav_login', 'navbar')}</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
