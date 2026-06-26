'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import {
  Loader2, ArrowLeft, Plus, Trash2, Edit, GripVertical,
  Play, BookOpen, GitCommit, X, ExternalLink, CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  image_url: string | null
  version: string | null
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
  product_id: string
  title: string
  doc_type: 'pdf' | 'online' | 'quickstart'
  url: string
  sort_order: number
}

interface Release {
  id: string
  product_id: string
  version: string
  release_date: string
  release_type: 'major' | 'minor' | 'patch'
  notes: string[]
}

const CATEGORIES = [
  { value: 'installation',   label: 'Installation' },
  { value: 'activation',     label: 'Activation' },
  { value: 'basic_usage',    label: 'Basic Usage' },
  { value: 'advanced',       label: 'Advanced Features' },
  { value: 'troubleshooting',label: 'Troubleshooting' },
  { value: 'faq',            label: 'FAQ' },
  { value: 'update_guide',   label: 'Update Guide' },
  { value: 'general',        label: 'General' },
]

const VIDEO_TYPES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'vimeo',   label: 'Vimeo' },
  { value: 'mp4',     label: 'Self-hosted MP4' },
]

const DOC_TYPES = [
  { value: 'quickstart', label: 'Quick Start Guide' },
  { value: 'online',     label: 'Online Documentation' },
  { value: 'pdf',        label: 'PDF Manual' },
]

const RELEASE_TYPES = [
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'patch', label: 'Patch' },
]

type ActiveTab = 'tutorials' | 'docs' | 'releases'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductTutorialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTab>('tutorials')
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [releases, setReleases] = useState<Release[]>([])

  // Tutorial dialog
  const [tutorialDialog, setTutorialDialog] = useState(false)
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null)
  const [tutorialForm, setTutorialForm] = useState({
    title: '', description: '', video_url: '', video_type: 'youtube' as Tutorial['video_type'],
    category: 'installation', sort_order: 0, duration_seconds: '', thumbnail_url: '',
  })
  const [savingTutorial, setSavingTutorial] = useState(false)

  // Doc dialog
  const [docDialog, setDocDialog] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null)
  const [docForm, setDocForm] = useState({ title: '', doc_type: 'online' as Doc['doc_type'], url: '', sort_order: 0 })
  const [savingDoc, setSavingDoc] = useState(false)

  // Release dialog
  const [releaseDialog, setReleaseDialog] = useState(false)
  const [editingRelease, setEditingRelease] = useState<Release | null>(null)
  const [releaseForm, setReleaseForm] = useState({
    version: '', release_date: new Date().toISOString().slice(0, 10),
    release_type: 'patch' as Release['release_type'], notesRaw: '',
  })
  const [savingRelease, setSavingRelease] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      if (profile?.role !== 'admin') { router.push('/dashboard'); return }

      const [prodRes] = await Promise.all([
        supabase.from('products').select('id, name, image_url, version').eq('id', id).single(),
      ])
      if (!prodRes.data) { router.push('/admin/products'); return }
      setProduct(prodRes.data)
      await loadAll()
      setLoading(false)
    }
    init()
  }, [id])

  const loadAll = async () => {
    const [tutRes, docRes, relRes] = await Promise.all([
      supabase.from('product_tutorials').select('*').eq('product_id', id).order('sort_order'),
      supabase.from('product_docs').select('*').eq('product_id', id).order('sort_order'),
      supabase.from('product_releases').select('*').eq('product_id', id).order('release_date', { ascending: false }),
    ])
    setTutorials((tutRes.data ?? []) as Tutorial[])
    setDocs((docRes.data ?? []) as Doc[])
    setReleases((relRes.data ?? []) as Release[])
  }

  // ─── Tutorial CRUD ──────────────────────────────────────────────────────────

  function openNewTutorial() {
    setEditingTutorial(null)
    setTutorialForm({ title: '', description: '', video_url: '', video_type: 'youtube', category: 'installation', sort_order: tutorials.length, duration_seconds: '', thumbnail_url: '' })
    setTutorialDialog(true)
  }

  function openEditTutorial(t: Tutorial) {
    setEditingTutorial(t)
    setTutorialForm({
      title: t.title, description: t.description ?? '', video_url: t.video_url,
      video_type: t.video_type, category: t.category, sort_order: t.sort_order,
      duration_seconds: t.duration_seconds?.toString() ?? '', thumbnail_url: t.thumbnail_url ?? '',
    })
    setTutorialDialog(true)
  }

  async function saveTutorial() {
    if (!tutorialForm.title.trim() || !tutorialForm.video_url.trim()) {
      toast.error('Title and video URL are required')
      return
    }
    setSavingTutorial(true)
    const payload = {
      product_id: id,
      title: tutorialForm.title.trim(),
      description: tutorialForm.description.trim() || null,
      video_url: tutorialForm.video_url.trim(),
      video_type: tutorialForm.video_type,
      category: tutorialForm.category,
      sort_order: Number(tutorialForm.sort_order),
      duration_seconds: tutorialForm.duration_seconds ? Number(tutorialForm.duration_seconds) : null,
      thumbnail_url: tutorialForm.thumbnail_url.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = editingTutorial
      ? await supabase.from('product_tutorials').update(payload).eq('id', editingTutorial.id)
      : await supabase.from('product_tutorials').insert(payload)

    if (error) { toast.error(error.message); setSavingTutorial(false); return }
    toast.success(editingTutorial ? 'Tutorial updated' : 'Tutorial added')
    setTutorialDialog(false)
    await loadAll()
    setSavingTutorial(false)
  }

  async function deleteTutorial(t: Tutorial) {
    if (!confirm(`Delete "${t.title}"?`)) return
    const { error } = await supabase.from('product_tutorials').delete().eq('id', t.id)
    if (error) { toast.error(error.message); return }
    toast.success('Tutorial deleted')
    await loadAll()
  }

  // ─── Doc CRUD ───────────────────────────────────────────────────────────────

  function openNewDoc() {
    setEditingDoc(null)
    setDocForm({ title: '', doc_type: 'online', url: '', sort_order: docs.length })
    setDocDialog(true)
  }

  function openEditDoc(d: Doc) {
    setEditingDoc(d)
    setDocForm({ title: d.title, doc_type: d.doc_type, url: d.url, sort_order: d.sort_order })
    setDocDialog(true)
  }

  async function saveDoc() {
    if (!docForm.title.trim() || !docForm.url.trim()) {
      toast.error('Title and URL are required')
      return
    }
    setSavingDoc(true)
    const payload = { product_id: id, title: docForm.title.trim(), doc_type: docForm.doc_type, url: docForm.url.trim(), sort_order: Number(docForm.sort_order) }
    const { error } = editingDoc
      ? await supabase.from('product_docs').update(payload).eq('id', editingDoc.id)
      : await supabase.from('product_docs').insert(payload)
    if (error) { toast.error(error.message); setSavingDoc(false); return }
    toast.success(editingDoc ? 'Doc updated' : 'Doc added')
    setDocDialog(false)
    await loadAll()
    setSavingDoc(false)
  }

  async function deleteDoc(d: Doc) {
    if (!confirm(`Delete "${d.title}"?`)) return
    const { error } = await supabase.from('product_docs').delete().eq('id', d.id)
    if (error) { toast.error(error.message); return }
    toast.success('Documentation deleted')
    await loadAll()
  }

  // ─── Release CRUD ───────────────────────────────────────────────────────────

  function openNewRelease() {
    setEditingRelease(null)
    setReleaseForm({ version: '', release_date: new Date().toISOString().slice(0, 10), release_type: 'patch', notesRaw: '' })
    setReleaseDialog(true)
  }

  function openEditRelease(r: Release) {
    setEditingRelease(r)
    setReleaseForm({
      version: r.version,
      release_date: r.release_date,
      release_type: r.release_type,
      notesRaw: r.notes.join('\n'),
    })
    setReleaseDialog(true)
  }

  async function saveRelease() {
    if (!releaseForm.version.trim()) {
      toast.error('Version is required')
      return
    }
    setSavingRelease(true)
    const notes = releaseForm.notesRaw.split('\n').map(l => l.trim()).filter(Boolean)
    const payload = {
      product_id: id,
      version: releaseForm.version.trim(),
      release_date: releaseForm.release_date,
      release_type: releaseForm.release_type,
      notes,
    }
    const { error } = editingRelease
      ? await supabase.from('product_releases').update(payload).eq('id', editingRelease.id)
      : await supabase.from('product_releases').insert(payload)
    if (error) { toast.error(error.message); setSavingRelease(false); return }
    toast.success(editingRelease ? 'Release updated' : 'Release added')
    setReleaseDialog(false)
    await loadAll()
    setSavingRelease(false)
  }

  async function deleteRelease(r: Release) {
    if (!confirm(`Delete release v${r.version}?`)) return
    const { error } = await supabase.from('product_releases').delete().eq('id', r.id)
    if (error) { toast.error(error.message); return }
    toast.success('Release deleted')
    await loadAll()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const TABS: { id: ActiveTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'tutorials', label: 'Tutorials', icon: Play,      count: tutorials.length },
    { id: 'docs',      label: 'Docs',      icon: BookOpen,  count: docs.length },
    { id: 'releases',  label: 'Releases',  icon: GitCommit, count: releases.length },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Products
          </Button>
        </Link>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-3">
          {product?.image_url && (
            <img src={product.image_url} alt={product.name} className="h-8 w-8 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="text-lg font-bold text-slate-900">{product?.name}</h1>
            <p className="text-xs text-slate-500">Tutorial Center Content</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tutorials Tab ── */}
      {activeTab === 'tutorials' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{tutorials.length} tutorial video{tutorials.length !== 1 ? 's' : ''}</p>
            <Button onClick={openNewTutorial} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Tutorial
            </Button>
          </div>
          {tutorials.length === 0 ? (
            <EmptyState
              icon={Play}
              title="No tutorials yet"
              description="Add video tutorials to help users learn this product."
              onAdd={openNewTutorial}
              addLabel="Add First Tutorial"
            />
          ) : (
            <div className="space-y-2">
              {tutorials.map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
                  <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                  <div className="h-14 w-24 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {t.thumbnail_url
                      ? <img src={t.thumbnail_url} alt={t.title} className="h-full w-full object-cover" />
                      : <Play className="h-5 w-5 text-slate-400 m-4" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 capitalize">{t.category.replace('_', ' ')}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">{t.video_type}</span>
                      {t.duration_seconds && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400">{Math.floor(t.duration_seconds / 60)}m</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditTutorial(t)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTutorial(t)} className="h-8 w-8 p-0 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Docs Tab ── */}
      {activeTab === 'docs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{docs.length} documentation item{docs.length !== 1 ? 's' : ''}</p>
            <Button onClick={openNewDoc} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Document
            </Button>
          </div>
          {docs.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No documentation yet"
              description="Add PDF manuals, online docs, and quick start guides."
              onAdd={openNewDoc}
              addLabel="Add Document"
            />
          ) : (
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
                  <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{d.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{d.doc_type.replace('_', ' ')}</span>
                      <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 truncate max-w-xs">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {d.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditDoc(d)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteDoc(d)} className="h-8 w-8 p-0 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Releases Tab ── */}
      {activeTab === 'releases' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{releases.length} release{releases.length !== 1 ? 's' : ''}</p>
            <Button onClick={openNewRelease} className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Release
            </Button>
          </div>
          {releases.length === 0 ? (
            <EmptyState
              icon={GitCommit}
              title="No releases yet"
              description="Document version history and release notes for users."
              onAdd={openNewRelease}
              addLabel="Add First Release"
            />
          ) : (
            <div className="space-y-2">
              {releases.map((r, idx) => (
                <div key={r.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 font-mono text-sm">v{r.version}</span>
                      <ReleaseTypeBadge type={r.release_type} />
                      {idx === 0 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Latest</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(r.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {r.notes.length} notes
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openEditRelease(r)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRelease(r)} className="h-8 w-8 p-0 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tutorial Dialog ── */}
      <Dialog open={tutorialDialog} onOpenChange={setTutorialDialog} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingTutorial ? 'Edit Tutorial' : 'Add Tutorial'}</DialogTitle>
          <DialogDescription>Add a video tutorial for this product.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={tutorialForm.title} onChange={e => setTutorialForm(p => ({ ...p, title: e.target.value }))} placeholder="How to Install..." className="mt-1" />
            </div>
            <div>
              <Label>Video Type</Label>
              <select
                value={tutorialForm.video_type}
                onChange={e => setTutorialForm(p => ({ ...p, video_type: e.target.value as Tutorial['video_type'] }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VIDEO_TYPES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={tutorialForm.category}
                onChange={e => setTutorialForm(p => ({ ...p, category: e.target.value }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label>Video URL *</Label>
              <Input value={tutorialForm.video_url} onChange={e => setTutorialForm(p => ({ ...p, video_url: e.target.value }))} placeholder={tutorialForm.video_type === 'youtube' ? 'https://youtube.com/watch?v=...' : tutorialForm.video_type === 'vimeo' ? 'https://vimeo.com/...' : 'https://example.com/video.mp4'} className="mt-1" />
            </div>
            <div>
              <Label>Duration (seconds)</Label>
              <Input type="number" value={tutorialForm.duration_seconds} onChange={e => setTutorialForm(p => ({ ...p, duration_seconds: e.target.value }))} placeholder="e.g. 360" className="mt-1" min={0} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={tutorialForm.sort_order} onChange={e => setTutorialForm(p => ({ ...p, sort_order: Number(e.target.value) }))} className="mt-1" min={0} />
            </div>
            <div className="sm:col-span-2">
              <Label>Custom Thumbnail URL</Label>
              <Input value={tutorialForm.thumbnail_url} onChange={e => setTutorialForm(p => ({ ...p, thumbnail_url: e.target.value }))} placeholder="https://... (optional — auto-detected for YouTube)" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={tutorialForm.description} onChange={e => setTutorialForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of what this tutorial covers..." className="mt-1" rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setTutorialDialog(false)}>Cancel</Button>
          <Button onClick={saveTutorial} disabled={savingTutorial} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingTutorial ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {editingTutorial ? 'Update' : 'Add Tutorial'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Doc Dialog ── */}
      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogHeader>
          <DialogTitle>{editingDoc ? 'Edit Document' : 'Add Document'}</DialogTitle>
          <DialogDescription>Add a documentation resource for this product.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} placeholder="Installation Guide" className="mt-1" />
          </div>
          <div>
            <Label>Type</Label>
            <select
              value={docForm.doc_type}
              onChange={e => setDocForm(p => ({ ...p, doc_type: e.target.value as Doc['doc_type'] }))}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <Label>URL *</Label>
            <Input value={docForm.url} onChange={e => setDocForm(p => ({ ...p, url: e.target.value }))} placeholder="https://docs.example.com/..." className="mt-1" />
          </div>
          <div>
            <Label>Sort Order</Label>
            <Input type="number" value={docForm.sort_order} onChange={e => setDocForm(p => ({ ...p, sort_order: Number(e.target.value) }))} className="mt-1" min={0} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDocDialog(false)}>Cancel</Button>
          <Button onClick={saveDoc} disabled={savingDoc} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {editingDoc ? 'Update' : 'Add Document'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Release Dialog ── */}
      <Dialog open={releaseDialog} onOpenChange={setReleaseDialog}>
        <DialogHeader>
          <DialogTitle>{editingRelease ? 'Edit Release' : 'Add Release'}</DialogTitle>
          <DialogDescription>Document version history for this product.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Version *</Label>
              <Input value={releaseForm.version} onChange={e => setReleaseForm(p => ({ ...p, version: e.target.value }))} placeholder="1.2.0" className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={releaseForm.release_type}
                onChange={e => setReleaseForm(p => ({ ...p, release_type: e.target.value as Release['release_type'] }))}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RELEASE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Release Date</Label>
            <Input type="date" value={releaseForm.release_date} onChange={e => setReleaseForm(p => ({ ...p, release_date: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>Release Notes</Label>
            <p className="text-xs text-slate-400 mb-1">One item per line — each line becomes a bullet point.</p>
            <Textarea
              value={releaseForm.notesRaw}
              onChange={e => setReleaseForm(p => ({ ...p, notesRaw: e.target.value }))}
              placeholder={`Initial release\nBug fix for login\nPerformance improvements`}
              className="mt-1 font-mono text-sm"
              rows={6}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setReleaseDialog(false)}>Cancel</Button>
          <Button onClick={saveRelease} disabled={savingRelease} className="bg-blue-600 hover:bg-blue-700 text-white">
            {savingRelease ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            {editingRelease ? 'Update' : 'Add Release'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description, onAdd, addLabel }: {
  icon: React.ElementType
  title: string
  description: string
  onAdd: () => void
  addLabel: string
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Icon className="h-12 w-12 mx-auto mb-3 text-slate-300" />
        <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
        <p className="text-slate-400 text-sm mb-5">{description}</p>
        <Button onClick={onAdd} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

function ReleaseTypeBadge({ type }: { type: Release['release_type'] }) {
  const styles = {
    major: 'bg-blue-600 text-white',
    minor: 'bg-teal-500 text-white',
    patch: 'bg-slate-200 text-slate-700',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${styles[type]}`}>
      {type}
    </span>
  )
}
