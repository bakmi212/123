import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Zap, Shield, Clock, Users, Star, Search, ShoppingBag, TrendingUp, Sparkles, Award, CheckCircle, Globe, HeadphonesIcon, CreditCard, Rocket, MessageCircle, ChevronDown, ChevronUp, Play, ExternalLink, Heart } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const params = await searchParams
  const supabase = await createServerClient()
  const searchQuery = params.q || ''
  const categorySlug = params.category || ''
  const page = parseInt(params.page || '1', 10)
  const perPage = 12

  // Fetch statistics
  const { count: totalProducts } = await supabase.from('products').select('id', { count: 'exact', head: true }).in('status', ['active'])
  const { count: totalCategories } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true)
  const { data: salesData } = await supabase.from('orders').select('total_amount').eq('status', 'paid')
  const totalSales = salesData?.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0
  const { count: totalOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'paid')
  const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true })

  // Fetch categories with product counts
  const { data: categories } = await supabase.from('categories').select('id, name, slug, image_url, description').eq('is_active', true).order('sort_order').order('name')
  const { data: allProducts } = await supabase.from('products').select('category_id').eq('status', 'active')
  const countMap = new Map<string, number>()
  ;(allProducts || []).forEach((p: any) => {
    const cid = p.category_id
    countMap.set(cid, (countMap.get(cid) || 0) + 1)
  })

  // Fetch products with filters
  let productQuery = supabase.from('products').select('*', { count: 'exact' }).in('status', ['active', 'sold_out', 'coming_soon']).order('created_at', { ascending: false })
  if (searchQuery) productQuery = productQuery.ilike('name', `%${searchQuery}%`)
  if (categorySlug) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single()
    if (cat) productQuery = productQuery.eq('category_id', cat.id)
  }
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data: products, count } = await productQuery.range(from, to)
  const totalPages = Math.ceil((count || 0) / perPage)

  // Fetch featured, best seller, new
  const { data: featuredProducts } = await supabase.from('products').select('*').eq('is_featured', true).in('status', ['active']).order('sort_order').limit(8)
  const { data: bestSellers } = await supabase.from('products').select('*').eq('best_seller', true).in('status', ['active']).order('sales_count', { ascending: false }).limit(4)
  const { data: newProducts } = await supabase.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(4)

  // Testimonials
  const testimonials = [
    { name: 'Ahmad Rizky', role: 'Software Developer', company: 'TechStart Indonesia', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Platform ini menghemat waktu development saya hingga 70%. Kualitas template sangat profesional dan dukungan teknologi sangat responsif.' },
    { name: 'Sarah Dewi', role: 'Digital Marketer', company: 'Creative Agency', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Saya sudah mencoba banyak marketplace, tapi ini adalah yang terbaik. Proses pembelian mudah, instant delivery, dan produk berkualitas tinggi.' },
    { name: 'Budi Santoso', role: 'Entrepreneur', company: 'Startup Hub', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100', rating: 5, text: 'Investasi terbaik untuk bisnis saya. License system bekerja sempurna dan tim support sangat membantu.' },
  ]

  // FAQ items
  const faqs = [
    { q: 'Bagaimana cara pembelian produk?', a: 'Pilih produk yang diinginkan, tambahkan ke keranjang, lalu lakukan pembayaran melalui berbagai metode yang tersedia. Setelah pembayaran berhasil, Anda akan mendapat akses instant ke produk.' },
    { q: 'Apakah ada jaminan uang kembali?', a: 'Ya, kami memberikan garansi 30 hari uang kembali untuk semua produk digital. Jika produk tidak sesuai deskripsi, Anda bisa mengajukan refund.' },
    { q: 'Bagaimana sistem lisensi bekerja?', a: 'Setiap produk dilengkapi dengan license key unik. Anda bisa mengaktivasi di perangkat yang sesuai dengan batasan yang ditentukan di setiap produk.' },
    { q: 'Apakah ada dukungan teknis?', a: 'Ya, semua produk dilengkapi dengan dukungan teknis selama periode aktif. Tim kami siap membantu 24/7 melalui chat dan email.' },
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sold_out': return <Badge variant="destructive" className="absolute top-2 left-2 z-10">SOLD OUT</Badge>
      case 'coming_soon': return <Badge variant="secondary" className="absolute top-2 left-2 z-10">COMING SOON</Badge>
      default: return null
    }
  }

  const getProductBadge = (product: any) => {
    const isNew = new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (product.best_seller) return <Badge className="absolute top-2 right-2 z-10 bg-orange-500 hover:bg-orange-600"><TrendingUp className="h-3 w-3 mr-1" />Best Seller</Badge>
    if (product.is_featured) return <Badge className="absolute top-2 right-2 z-10 bg-emerald-500 hover:bg-emerald-600"><Sparkles className="h-3 w-3 mr-1" />Featured</Badge>
    if (isNew) return <Badge className="absolute top-2 right-2 z-10 bg-blue-500 hover:bg-blue-600">NEW</Badge>
    return null
  }

  const ProductCard = ({ product }: { product: any }) => (
  <Link href={`/products/${product.slug}`} className="group block">
    <Card className="h-full overflow-hidden">
      <CardContent className="p-0">
        <div className="aspect-[4/3] relative bg-slate-100 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <ShoppingBag className="h-12 w-12 text-slate-300" />
            </div>
          )}

          {getStatusBadge(product.status)}
          {getProductBadge(product)}
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge
              variant="outline"
              className="text-xs border-indigo-200 bg-indigo-50 text-indigo-600"
            >
              {categories?.find((c: any) => c.id === product.category_id)?.name || "Digital"}
            </Badge>
          </div>

          <h3 className="font-semibold text-[#111827] mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {product.name}
          </h3>

          <p className="text-sm text-[#64748B] line-clamp-3 leading-relaxed">
            {product.short_description || "Belum ada deskripsi produk."}
          </p>
        </div>
      </CardContent>
    </Card>
  </Link>
)

  return (
    <div className="min-h-screen">
      {/* Hero Section - Bright Premium SaaS Design */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-white to-[#F8FAFC]">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full" />
        </div>

        <div className="container mx-auto px-4 py-12 md:py-16 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8">
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white border border-[#E5E7EB] shadow-card">
                <div className="flex items-center justify-center w-6 h-6 rounded-full gradient-primary">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-[#475569]">Dipercaya oleh 1.100+ pelanggan dari berbagai industri.</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-[#0F172A]">
                  <span>Solusi Digital Cerdas</span>
                  <span className="block mt-2 text-gradient">
                    untuk Kelola & Kembangkan
                  </span>
                  <span className="block mt-2">Bisnis Anda</span>
                </h1>
                <p className="text-lg md:text-xl text-[#475569] mt-8 max-w-xl leading-relaxed">
                  Temukan template, software, AI tools, source code, dan berbagai aset digital berkualitas tinggi untuk membantu meningkatkan produktivitas dan mengembangkan bisnis Anda.
                </p>
              </div>

              {/* Live Search */}
              <div className="max-w-xl">
                <form className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8]" />
                    <Input name="q" defaultValue={searchQuery} placeholder="Cari template, software, AI tools, atau produk digital..." className="pl-14 h-14 bg-white border-[#E5E7EB] text-[#0F172A] placeholder:text-[#94A3B8] text-base rounded-2xl focus:border-indigo-400 focus:ring-indigo-400/20" />
                  </div>
                  <Button type="submit" size="lg" className="h-14 px-8 rounded-2xl">
                    Cari
                  </Button>
                </form>
                <div className="flex flex-wrap gap-3 mt-4">
                  <span className="text-sm text-[#64748B]">Popular:</span>
                  {['Template Website', 'Landing Page', 'Dashboard', 'App Source Code'].map((term) => (
                    <Link key={term} href={`/?q=${encodeURIComponent(term)}`} className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
                      {term}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="lg" className="h-14 px-8 rounded-2xl text-base font-semibold" asChild>
                  <Link href="/products">Jelajahi Produk <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl text-base font-semibold" asChild>
                  <Link href="/categories">Lihat Kategori</Link>
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-8 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-11 h-11 rounded-full gradient-primary border-2 border-white flex items-center justify-center text-sm font-bold shadow-md text-white">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-[#64748B] font-medium">4.9/5 dari 500+ review</p>
                </div>
              </div>
            </div>

            {/* Right Side - Dashboard Mockup */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 blur-[80px]" />
              <div className="relative bg-white border border-[#E5E7EB] rounded-[20px] p-8 shadow-card-hover">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-4 rounded-full bg-red-400" />
                  <div className="w-4 h-4 rounded-full bg-yellow-400" />
                  <div className="w-4 h-4 rounded-full bg-green-400" />
                </div>
                <div className="space-y-5">
                  <div className="h-10 bg-slate-100 rounded-xl w-3/4" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-28 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl border border-indigo-200/50 p-4">
                      <div className="h-3 w-12 bg-indigo-300/50 rounded mb-2" />
                      <div className="h-8 w-8 bg-indigo-400/40 rounded-lg mt-auto" />
                    </div>
                    <div className="h-28 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200/50 p-4">
                      <div className="h-3 w-12 bg-emerald-300/50 rounded mb-2" />
                      <div className="h-8 w-8 bg-emerald-400/40 rounded-lg mt-auto" />
                    </div>
                    <div className="h-28 bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl border border-violet-200/50 p-4">
                      <div className="h-3 w-12 bg-violet-300/50 rounded mb-2" />
                      <div className="h-8 w-8 bg-violet-400/40 rounded-lg mt-auto" />
                    </div>
                  </div>
                  <div className="h-40 bg-slate-50 rounded-2xl border border-[#E5E7EB] p-4">
                    <div className="flex justify-between mb-3">
                      <div className="h-3 w-20 bg-slate-300 rounded" />
                      <div className="h-3 w-16 bg-slate-300 rounded" />
                    </div>
                    <div className="h-24 bg-gradient-to-r from-indigo-200 via-violet-200 to-blue-200 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-20 bg-slate-50 rounded-xl border border-[#E5E7EB]" />
                    <div className="h-20 bg-slate-50 rounded-xl border border-[#E5E7EB]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section className="py-14 bg-[#F8FAFC] relative">
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50/50">Mengapa Memilih Kami</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">Keunggulan Platform Kami</h2>
            <p className="text-[#64748B] max-w-xl mx-auto">Pengalaman terbaik dengan fitur premium yang mendukung kesuksesan Anda</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Aman & Terpercaya', desc: 'Semua produk telah melalui proses kurasi.', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
              { icon: Star, title: 'Kualitas Terbaik', desc: 'Produk premium dari kreator terpercaya.', gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
              { icon: Zap, title: 'Cepat & Efisien', desc: 'Unduh instan dan akses kapan saja.', gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { icon: HeadphonesIcon, title: 'Dukungan Profesional', desc: 'Tim support siap membantu Anda.', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
            ].map((f, i) => (
              <div key={i} className="group bg-white border border-[#E5E7EB] rounded-[20px] p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className={`h-14 w-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6`}>
                  <f.icon className={`h-7 w-7 ${f.text}`} />
                </div>
                <h3 className="text-xl font-semibold text-[#111827] mb-3">{f.title}</h3>
                <p className="text-[#64748B] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{(totalProducts || 120) + '+'}</div>
              <div className="text-slate-500 mt-2 font-medium">Digital Products</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{(totalUsers || 1100) + '+'}</div>
              <div className="text-slate-500 mt-2 font-medium">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{(totalOrders || 5000) + '+'}</div>
              <div className="text-slate-500 mt-2 font-medium">Orders Completed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{(totalCategories || 15) + '+'}</div>
              <div className="text-slate-500 mt-2 font-medium">Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 bg-[#F8FAFC]">
        <div className="container mx-auto px-4">
      
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
      
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50/50"
              >
                Kategori Populer
              </Badge>
      
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
                Jelajahi Berdasarkan Kategori
              </h2>
      
              <p className="text-[#64748B] max-w-2xl">
                Temukan produk sesuai kebutuhan Anda dari berbagai kategori
              </p>
            </div>
      
            <Button
              variant="outline"
              className="rounded-full px-6 border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0"
              asChild
            >
              <Link href="/categories">
                View All Categories
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
      
          </div>
      
          {/* Category Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(categories || []).slice(0, 6).map((cat: any) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden rounded-2xl border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      
                  <CardContent className="p-0">
      
                    <div className="aspect-square overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-100">
      
                      {cat.image_url ? (
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-10 w-10 text-indigo-300" />
                        </div>
                      )}
      
                    </div>
      
                    <div className="p-4">
                      <h3 className="font-semibold text-[#111827] group-hover:text-indigo-600 transition-colors">
                        {cat.name}
                      </h3>
      
                      <p className="text-sm text-[#64748B] mt-1">
                        {countMap.get(cat.id) || 0} produk
                      </p>
                    </div>
      
                  </CardContent>
      
                </Card>
              </Link>
            ))}
          </div>
      
        </div>
      </section>

      {/* Featured Products */}
      {(featuredProducts || []).length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-600"><Sparkles className="h-3 w-3 mr-1" />Editor's Pick</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A]">Featured Products</h2>
                <p className="text-[#64748B] mt-2">Produk pilihan terbaik dari tim kami</p>
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200" asChild><Link href="/products?featured=true">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts!.slice(0, 4).map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {(bestSellers || []).length > 0 && (
        <section className="py-12 bg-[#F8FAFC]">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="outline" className="mb-3 border-orange-200 text-orange-600 bg-orange-50/50"><TrendingUp className="h-3 w-3 mr-1" />Top Selling</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A]">Best Sellers</h2>
                <p className="text-[#64748B] mt-2">Produk terlaris yang paling diminati</p>
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200" asChild><Link href="/products?bestseller=true">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers!.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {(newProducts || []).length > 0 && (
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge variant="outline" className="mb-3 border-blue-200 text-blue-600 bg-blue-50/50"><Sparkles className="h-3 w-3 mr-1" />New</Badge>
                <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A]">New Arrivals</h2>
                <p className="text-[#64748B] mt-2">Produk terbaru yang baru ditambahkan</p>
              </div>
              <Button variant="outline" className="rounded-xl border-slate-200" asChild><Link href="/products?sort=newest">View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {newProducts!.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-14 bg-white relative">
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50/50">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">Apa Kata Mereka?</h2>
            <p className="text-[#64748B] max-w-xl mx-auto">Dengarkan pengalaman pelanggan kami</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-[#E5E7EB] rounded-[20px] p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-1 mb-5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-[#475569] mb-8 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-indigo-400 to-violet-500 p-0.5">
                    <img src={t.avatar} alt={t.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#111827]">{t.name}</div>
                    <div className="text-sm text-[#64748B]">{t.role} at {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-14 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 border-indigo-200 text-indigo-600 bg-indigo-50/50">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">Pertanyaan yang Sering Diajukan</h2>
            <p className="text-[#64748B] max-w-xl mx-auto">Temukan jawaban untuk pertanyaan umum</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-[#E5E7EB] hover:shadow-card-hover transition-shadow">
                <summary className="flex items-center justify-between cursor-pointer p-6 font-medium text-[#111827] list-none">
                  {faq.q}
                  <ChevronDown className="h-5 w-5 text-[#94A3B8] group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-[#475569]">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-white/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-white/20 rounded-full blur-[80px]" />
        </div>
      
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Siap Untuk Memulai?
          </h2>
      
          <p className="text-indigo-100 mb-10 max-w-xl mx-auto text-lg">
            Bergabung dengan ribuan bisnis dan creator yang menggunakan platform kami
            untuk berkembang.
          </p>
      
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-indigo-700 hover:bg-slate-100 h-14 px-10 rounded-2xl font-semibold"
              asChild
            >
              <Link href="/auth/register">
                Buat Akun Gratis
              </Link>
            </Button>
      
            <Button
              size="lg"
              className="bg-indigo-700 text-white hover:bg-indigo-800 h-14 px-10 rounded-2xl font-semibold border border-white/20"
              asChild
            >
              <Link href="/products">
                Lihat Produk
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* All Products Grid with Filter */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-2">All Products</h2>
              <p className="text-[#64748B]">{count || 0} products available</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link href="/" className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${!categorySlug ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>All</Link>
              {(categories || []).map((cat: any) => (
                <Link key={cat.id} href={`/?category=${cat.slug}${searchQuery ? `&q=${searchQuery}` : ''}`} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${categorySlug === cat.slug ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(products || []).map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {page > 1 && (
                <Link href={`/?page=${page - 1}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                  <Button variant="outline" className="rounded-xl">Previous</Button>
                </Link>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = i + 1
                return (
                  <Link key={p} href={`/?page=${p}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                    <Button variant={page === p ? 'default' : 'outline'} className={`rounded-xl ${page === p ? 'bg-gradient-to-r from-blue-500 to-purple-600' : ''}`}>{p}</Button>
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link href={`/?page=${page + 1}${searchQuery ? `&q=${searchQuery}` : ''}${categorySlug ? `&category=${categorySlug}` : ''}`}>
                  <Button variant="outline" className="rounded-xl">Next</Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
