'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Loader2, Package, Play, BookOpen, GitCommit, X,
  CheckCircle, Clock, ChevronRight, FileText, ExternalLink,
  Monitor, Wrench, HelpCircle, ZapIcon, RefreshCw, Star,
  ChevronDown, ChevronUp, PlayCircle
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface OwnedProduct {
  id: string
  product_id: string
  purchased_at: string
  access_end: string | null
  product: {
    id: string
    name: string
    image_url: string | null
    version: string | null
  }
}

interface Tutorial {
  id: string
  product_id: string
  title: string
  description: string | null
  video_url: string
  video_type: 'youtube' | 'vimeo' | 'mp4'
  category: string
  sort_order: number
  duration_seconds: number | null
  thumbnail_url: string | null
  updated_at: string
}

interface Doc {
  id: string
  title: string
  doc_type: 'pdf' | 'online' | 'quickstart'
  url: string
  sort_order: number
}

interface Release {
  id: string
  version: string
  release_date: string
  release_type: 'major' | 'minor' | 'patch'
  notes: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  installation:  { label: 'Installation',    icon: Monitor,    color: 'bg-blue-50 text-blue-700' },
  activation:    { label: 'Activation',      icon: ZapIcon,    color: 'bg-yellow-50 text-yellow-700' },
  basic_usage:   { label: 'Basic Usage',     icon: Play,       color: 'bg-green-50 text-green-700' },
  advanced:      { label: 'Advanced',        icon: Star,       color: 'bg-purple-50 text-purple-700' },
  troubleshooting:{ label: 'Troubleshooting', icon: Wrench,    color: 'bg-red-50 text-red-700' },
  faq:           { label: 'FAQ',             icon: HelpCircle, color: 'bg-slate-50 text-slate-700' },
  update_guide:  { label: 'Update Guide',    icon: RefreshCw,  color: 'bg-teal-50 text-teal-700' },
  general:       { label: 'General',         icon: Play,       color: 'bg-slate-50 text-slate-600' },
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function buildEmbedUrl(tutorial: Tutorial): string {
  if (tutorial.video_type === 'youtube') {
    const id = extractYouTubeId(tutorial.video_url)
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : tutorial.video_url
  }
  if (tutorial.video_type === 'vimeo') {
    const id = extractVimeoId(tutorial.video_url)
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : tutorial.video_url
  }
  return tutorial.video_url
}

function getYouTubeThumbnail(url: string): string | null {
  const id = extractYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TutorialCenterPage() {
  const [loading, setLoading] = useState(true)
  const [ownedProducts, setOwnedProducts] = useState<OwnedProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<OwnedProduct | null>(null)
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null)
  const [playerOpen, setPlayerOpen] = useState(false)
  const supabase = createBrowserClient()

  // Load owned products
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_products')
        .select('id, purchased_at, access_end, product:products(id, name, image_url, version)')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })

      type Row = { id: string; purchased_at: string; access_end: string | null; product: { id: string; name: string; image_url: string | null; version: string | null }[] }
      const formatted: OwnedProduct[] = ((data as Row[]) ?? []).map(row => ({
        id: row.id,
        product_id: row.product?.[0]?.id ?? '',
        purchased_at: row.purchased_at,
        access_end: row.access_end,
        product: row.product?.[0] ?? { id: '', name: '', image_url: null, version: null },
      })).filter(p => p.product_id)

      setOwnedProducts(formatted)
      if (formatted.length > 0) setSelectedProduct(formatted[0])
      setLoading(false)
    }
    load()
  }, [])

  // Load content when product changes
  const loadContent = useCallback(async (productId: string) => {
    setContentLoading(true)
    const [tutRes, docRes, relRes] = await Promise.all([
      supabase.from('product_tutorials').select('*').eq('product_id', productId).order('sort_order'),
      supabase.from('product_docs').select('*').eq('product_id', productId).order('sort_order'),
      supabase.from('product_releases').select('*').eq('product_id', productId).order('release_date', { ascending: false }),
    ])
    setTutorials((tutRes.data ?? []) as Tutorial[])
    setDocs((docRes.data ?? []) as Doc[])
    setReleases((relRes.data ?? []) as Release[])
    setContentLoading(false)
  }, [supabase])

  useEffect(() => {
    if (selectedProduct?.product_id) {
      loadContent(selectedProduct.product_id)
      setActiveTutorial(null)
    }
  }, [selectedProduct, loadContent])

  function openPlayer(tutorial: Tutorial) {
    setActiveTutorial(tutorial)
    setPlayerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (ownedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Package className="h-10 w-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Purchased Products</h2>
        <p className="text-slate-500 text-sm mb-6 max-w-sm">
          You haven't purchased any products yet. Browse our catalog to find products with tutorials and documentation.
        </p>
        <Link href="/products">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Browse Products
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tutorial Center</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Watch tutorials, read documentation, and explore changelogs for your products.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Product Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Your Products
          </p>
          {ownedProducts.map(op => {
            const isExpired = op.access_end && new Date(op.access_end) < new Date()
            const isActive = selectedProduct?.id === op.id
            return (
              <button
                key={op.id}
                onClick={() => setSelectedProduct(op)}
                className={`w-full text-left rounded-xl p-3 flex items-center gap-3 border transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  {op.product.image_url
                    ? <img src={op.product.image_url} alt={op.product.name} className="h-full w-full object-cover" />
                    : <Package className="h-5 w-5 text-slate-400 m-2.5" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                    {op.product.name}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5 ${
                    isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                  }`}>
                    {isExpired ? <Clock className="h-2.5 w-2.5" /> : <CheckCircle className="h-2.5 w-2.5" />}
                    {isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 text-blue-400 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedProduct && (
            <ProductContent
              product={selectedProduct}
              tutorials={tutorials}
              docs={docs}
              releases={releases}
              loading={contentLoading}
              onPlayTutorial={openPlayer}
            />
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playerOpen && activeTutorial && (
        <TutorialPlayerModal
          tutorial={activeTutorial}
          playlist={tutorials}
          onClose={() => setPlayerOpen(false)}
          onSelect={(t) => setActiveTutorial(t)}
        />
      )}
    </div>
  )
}

// ─── Product Content ──────────────────────────────────────────────────────────

function ProductContent({
  product, tutorials, docs, releases, loading, onPlayTutorial
}: {
  product: OwnedProduct
  tutorials: Tutorial[]
  docs: Doc[]
  releases: Release[]
  loading: boolean
  onPlayTutorial: (t: Tutorial) => void
}) {
  const isExpired = product.access_end && new Date(product.access_end) < new Date()

  return (
    <div className="space-y-5">
      {/* Product Header Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
              {product.product.image_url
                ? <img src={product.product.image_url} alt={product.product.name} className="h-full w-full object-cover" />
                : <Package className="h-8 w-8 text-slate-400 m-4" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900">{product.product.name}</h2>
                {product.product.version && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                    v{product.product.version}
                  </span>
                )}
                <Badge className={isExpired ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}>
                  {isExpired ? 'Expired' : 'Active'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Purchased {new Date(product.purchased_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {product.access_end && (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {isExpired ? 'Expired' : 'Valid until'} {new Date(product.access_end).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  {tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <Tabs defaultValue="tutorials">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="tutorials" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Play className="h-3.5 w-3.5" />
              Tutorials
              {tutorials.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{tutorials.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5" />
              Documentation
              {docs.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{docs.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="releases" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <GitCommit className="h-3.5 w-3.5" />
              Release Notes
              {releases.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{releases.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="mt-4">
            <TutorialsTab tutorials={tutorials} onPlay={onPlayTutorial} />
          </TabsContent>
          <TabsContent value="docs" className="mt-4">
            <DocsTab docs={docs} />
          </TabsContent>
          <TabsContent value="releases" className="mt-4">
            <ReleasesTab releases={releases} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ─── Tutorials Tab ────────────────────────────────────────────────────────────

function TutorialsTab({ tutorials, onPlay }: { tutorials: Tutorial[]; onPlay: (t: Tutorial) => void }) {
  if (tutorials.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <PlayCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No tutorials available yet for this product.</p>
        </CardContent>
      </Card>
    )
  }

  // Group by category
  const grouped: Record<string, Tutorial[]> = {}
  tutorials.forEach(t => {
    if (!grouped[t.category]) grouped[t.category] = []
    grouped[t.category].push(t)
  })

  const categoryOrder = ['installation','activation','basic_usage','advanced','troubleshooting','faq','update_guide','general']
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
  })

  return (
    <div className="space-y-5">
      {sortedCategories.map(cat => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.general
        const Icon = meta.icon
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.color}`}>
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {grouped[cat].map(tutorial => (
                <TutorialCard key={tutorial.id} tutorial={tutorial} onPlay={onPlay} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TutorialCard({ tutorial, onPlay }: { tutorial: Tutorial; onPlay: (t: Tutorial) => void }) {
  const thumb = tutorial.thumbnail_url
    ?? (tutorial.video_type === 'youtube' ? getYouTubeThumbnail(tutorial.video_url) : null)

  return (
    <button
      onClick={() => onPlay(tutorial)}
      className="group w-full text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-150"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {thumb
          ? <img src={thumb} alt={tutorial.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <PlayCircle className="h-10 w-10 text-slate-400" />
            </div>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100 transform duration-150">
            <Play className="h-5 w-5 text-blue-600 ml-0.5" fill="currentColor" />
          </div>
        </div>
        {tutorial.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {formatDuration(tutorial.duration_seconds)}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug">{tutorial.title}</p>
        {tutorial.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tutorial.description}</p>
        )}
        <p className="text-xs text-slate-400 mt-2">
          Updated {new Date(tutorial.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
    </button>
  )
}

// ─── Tutorial Player Modal ────────────────────────────────────────────────────

function TutorialPlayerModal({
  tutorial, playlist, onClose, onSelect
}: {
  tutorial: Tutorial
  playlist: Tutorial[]
  onClose: () => void
  onSelect: (t: Tutorial) => void
}) {
  const embedUrl = buildEmbedUrl(tutorial)
  const isMp4 = tutorial.video_type === 'mp4'
  const meta = CATEGORY_META[tutorial.category] ?? CATEGORY_META.general
  const Icon = meta.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${meta.color}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <h3 className="font-semibold text-slate-900 text-sm truncate">{tutorial.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 ml-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Video Player */}
          <div className="flex-1 flex flex-col overflow-auto">
            <div className="relative bg-black aspect-video w-full shrink-0">
              {isMp4 ? (
                <video
                  src={tutorial.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={tutorial.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}
            </div>
            {/* Video info */}
            <div className="p-5">
              <h4 className="font-bold text-slate-900 text-base mb-1">{tutorial.title}</h4>
              {tutorial.description && (
                <p className="text-sm text-slate-600 leading-relaxed">{tutorial.description}</p>
              )}
              <p className="text-xs text-slate-400 mt-3">
                Last updated {new Date(tutorial.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Playlist Sidebar */}
          {playlist.length > 1 && (
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-100 overflow-y-auto shrink-0">
              <div className="p-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Playlist · {playlist.length} videos
                </p>
              </div>
              <div className="p-2">
                {playlist.map((t, idx) => {
                  const isActive = t.id === tutorial.id
                  const thumb = t.thumbnail_url ?? (t.video_type === 'youtube' ? getYouTubeThumbnail(t.video_url) : null)
                  const catMeta = CATEGORY_META[t.category] ?? CATEGORY_META.general
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelect(t)}
                      className={`w-full text-left flex items-start gap-3 p-2 rounded-xl transition-all mb-1 ${
                        isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="relative h-14 w-24 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        {thumb
                          ? <img src={thumb} alt={t.title} className="w-full h-full object-cover" />
                          : <PlayCircle className="h-6 w-6 text-slate-400 m-4" />
                        }
                        {isActive && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <Play className="h-4 w-4 text-white" fill="white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 mb-0.5">{idx + 1}.</p>
                        <p className={`text-xs font-medium line-clamp-2 leading-snug ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                          {t.title}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Docs Tab ─────────────────────────────────────────────────────────────────

function DocsTab({ docs }: { docs: Doc[] }) {
  if (docs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No documentation available yet for this product.</p>
        </CardContent>
      </Card>
    )
  }

  const docGroups: Record<Doc['doc_type'], Doc[]> = { pdf: [], online: [], quickstart: [] }
  docs.forEach(d => docGroups[d.doc_type].push(d))

  const sections: { type: Doc['doc_type']; label: string; icon: React.ElementType; color: string; description: string }[] = [
    { type: 'quickstart', label: 'Quick Start Guide', icon: ZapIcon, color: 'text-yellow-600 bg-yellow-50', description: 'Get up and running fast' },
    { type: 'online',     label: 'Online Documentation', icon: ExternalLink, color: 'text-blue-600 bg-blue-50', description: 'Full reference documentation' },
    { type: 'pdf',        label: 'PDF Manual', icon: FileText, color: 'text-red-600 bg-red-50', description: 'Downloadable offline manual' },
  ]

  return (
    <div className="space-y-4">
      {sections.map(sec => {
        const items = docGroups[sec.type]
        if (items.length === 0) return null
        const Icon = sec.icon
        return (
          <div key={sec.type}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sec.color}`}>
                <Icon className="h-3.5 w-3.5" />
                {sec.label}
              </span>
            </div>
            <div className="space-y-2">
              {items.map(doc => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${sec.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{doc.title}</p>
                    <p className="text-xs text-slate-500">{sec.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Releases Tab ─────────────────────────────────────────────────────────────

function ReleasesTab({ releases }: { releases: Release[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(releases[0]?.id ?? null)

  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GitCommit className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No release notes available yet.</p>
        </CardContent>
      </Card>
    )
  }

  const releaseTypeStyle: Record<Release['release_type'], string> = {
    major: 'bg-blue-600 text-white',
    minor: 'bg-teal-500 text-white',
    patch: 'bg-slate-200 text-slate-700',
  }

  return (
    <div className="space-y-3">
      {releases.map((rel, idx) => {
        const isExpanded = expandedId === rel.id
        const isLatest = idx === 0
        return (
          <div
            key={rel.id}
            className={`bg-white border rounded-xl overflow-hidden transition-all ${
              isExpanded ? 'border-blue-200 shadow-sm' : 'border-slate-200'
            }`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : rel.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="relative shrink-0 flex flex-col items-center">
                <div className={`h-2 w-2 rounded-full mt-1 ${
                  rel.release_type === 'major' ? 'bg-blue-600' :
                  rel.release_type === 'minor' ? 'bg-teal-500' : 'bg-slate-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm font-mono">v{rel.version}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${releaseTypeStyle[rel.release_type]}`}>
                    {rel.release_type}
                  </span>
                  {isLatest && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(rel.release_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="text-slate-400 shrink-0">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>
            {isExpanded && rel.notes.length > 0 && (
              <div className="px-5 pb-4 border-t border-slate-100">
                <ul className="mt-3 space-y-1.5">
                  {rel.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
