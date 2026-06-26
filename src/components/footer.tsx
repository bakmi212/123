import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-[#CBD5E1]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              <span className="font-semibold text-white">Lumintusuite</span>
            </div>
            <p className="text-sm text-[#94A3B8] max-w-md leading-relaxed">
              Platform marketplace produk digital terpercaya untuk membantu mengembangkan bisnis Anda dengan solusi berkualitas tinggi.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-[#CBD5E1] hover:text-white transition-colors">Products</Link></li>
              <li><Link href="/categories" className="text-[#CBD5E1] hover:text-white transition-colors">Categories</Link></li>
              <li><Link href="/pricing" className="text-[#CBD5E1] hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/features" className="text-[#CBD5E1] hover:text-white transition-colors">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="text-[#CBD5E1] hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="text-[#CBD5E1] hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/auth/login" className="text-[#CBD5E1] hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="text-[#CBD5E1] hover:text-white transition-colors">Register</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6">
          <p className="text-center text-sm text-[#94A3B8]">
            &copy; {new Date().getFullYear()} Lumintusuite. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
