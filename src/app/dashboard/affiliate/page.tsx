'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type SortOption = 'newest' | 'name_asc' | 'name_desc' | 'commission_high' | 'clicks_high'
type Tab = 'products' | 'commissions' | 'payouts' | 'withdraw'

interface AffiliateLink {
  id: string
  product_id: string
  product_name: string
  product_slug: string
  product_image: string | null
  commission_type: string | null
  commission_value: number | null
  short_code: string
  clicks: number
  conversions: number
  earnings: number
}

interface Commission {
  id: string
  amount: number
  status: string
  commission_type: string | null
  commission_rate: number | null
  created_at: string
  order_id: string
  product: { name: string } | null
}

interface Withdrawal {
  id: string
  amount: number
  bank_name: string
  account_number: string
  account_holder: string
  status: string
  transfer_proof_url: string | null
  admin_notes: string | null
  rejection_reason: string | null
  requested_at: string
  approved_at: string | null
  paid_at: string | null
}

interface Stats {
  total_referrals: number
  completed: number
  pending: number
  earnings: number
  available_balance: number
  paid_out: number
}

function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function fmtIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function fmtCommission(type: string | null, value: number | null) {
  if (!value) return '—'
  return type === 'percentage' ? `${value}%` : fmtIDR(value)
}

function conversionRate(conversions: number, clicks: number) {
  if (!clicks) return '0%'
  return `${((conversions / clicks) * 100).toFixed(1)}%`
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Terbaru',
  name_asc: 'Nama A-Z',
  name_desc: 'Nama Z-A',
  commission_high: 'Komisi Tertinggi',
  clicks_high: 'Klik Terbanyak',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function AffiliateDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [affiliate, setAffiliate] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({ total_referrals: 0, completed: 0, pending: 0, earnings: 0, available_balance: 0, paid_out: 0 })
  const [links, setLinks] = useState<AffiliateLink[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [tab, setTab] = useState<Tab>('products')
  const [sort, setSort] = useState<SortOption>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false)
  const [withdrawalForm, setWithdrawalForm] = useState({ amount: '', bank_name: '', account_number: '', account_holder: '' })

  const supabase = createBrowserClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: aff } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    setAffiliate(aff)

    if (!aff) { setLoading(false); return }

    // Get commissions
    const { data: commissionData } = await supabase
      .from('affiliate_commissions')
      .select('id, amount, status, commission_type, commission_rate, created_at, order_id, product:products(name)')
      .eq('affiliate_id', aff.id)
      .order('created_at', { ascending: false })

    setCommissions((commissionData as Commission[]) || [])

    const completed = (commissionData || []).filter((c: any) => c.status === 'paid' || c.status === 'approved').length
    const pending = (commissionData || []).filter((c: any) => c.status === 'pending').length

    // Get withdrawals
    const { data: withdrawalData } = await supabase
      .from('affiliate_withdrawals')
      .select('*')
      .eq('affiliate_id', aff.id)
      .order('requested_at', { ascending: false })

    setWithdrawals((withdrawalData as Withdrawal[]) || [])

    // Calculate available balance: total_earnings minus non-rejected withdrawals
    const withdrawnAmount = (withdrawalData || [])
      .filter((w: any) => w.status !== 'rejected')
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0)
    const paidOut = (withdrawalData || [])
      .filter((w: any) => w.status === 'paid')
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0)
    const availableBalance = Number(aff.total_earnings || 0) - withdrawnAmount

    setStats({
      total_referrals: aff.total_referrals || 0,
      completed,
      pending,
      earnings: Number(aff.total_earnings) || 0,
      available_balance: availableBalance,
      paid_out: paidOut,
    })

    // Get all affiliate-enabled products
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, image_url, commission_type, commission_value')
      .eq('affiliate_enabled', true)
      .eq('is_active', true)
      .order('name')

    if (!products || products.length === 0) { setLoading(false); return }

    const { data: existingLinks } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('user_id', user.id)

    const linkMap = new Map((existingLinks || []).map((l: any) => [l.product_id, l]))

    for (const product of products) {
      if (!linkMap.has(product.id)) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const code = generateShortCode()
          const { data: inserted, error } = await supabase
            .from('affiliate_links')
            .insert({ user_id: user.id, product_id: product.id, short_code: code })
            .select()
            .single()
          if (!error && inserted) {
            linkMap.set(product.id, inserted)
            break
          }
        }
      }
    }

    const { data: freshLinks } = await supabase
      .from('affiliate_links')
      .select('*')
      .eq('user_id', user.id)

    const freshMap = new Map((freshLinks || []).map((l: any) => [l.product_id, l]))

    const result: AffiliateLink[] = products
      .map(p => {
        const link = freshMap.get(p.id)
        if (!link) return null
        return {
          id: link.id,
          product_id: p.id,
          product_name: p.name,
          product_slug: p.slug,
          product_image: p.image_url,
          commission_type: p.commission_type,
          commission_value: p.commission_value ? Number(p.commission_value) : null,
          short_code: link.short_code,
          clicks: link.clicks || 0,
          conversions: link.conversions || 0,
          earnings: Number(link.earnings) || 0,
        }
      })
      .filter(Boolean) as AffiliateLink[]

    setLinks(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const joinAffiliate = async () => {
    setJoining(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Silakan login terlebih dahulu')
      setJoining(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .maybeSingle()

    const code = `AFF${user.id.slice(0, 6).toUpperCase()}`

    const { error } = await supabase.from('affiliates').insert({
      user_id: user.id,
      referral_code: code,
      username: (profile?.full_name || user.id.slice(0, 8)).toLowerCase().replace(/\s+/g, '_'),
      status: 'active',
      commission_type: 'percentage',
      commission_rate: 0.10,
    })

    if (error) {
      console.error('Affiliate join error:', error)
      toast.error('Gagal membuat akun affiliate: ' + error.message)
      setJoining(false)
      return
    }

    // Send affiliate activated notification
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'affiliate',
      title: 'Affiliate Activated',
      message: 'Your affiliate account has been activated. Start sharing your links to earn commissions.',
      data: { referral_code: code },
    })

    // Send affiliate activated email + notify admins via API
    try {
      const { sendAffiliateActivatedEmail, sendAdminNewAffiliateEmail } = await import('@/lib/email')
      if (profile?.email) {
        await sendAffiliateActivatedEmail(profile.email, code)
      }
      // Notify admins
      const serviceDb = (await import('@supabase/supabase-js')).createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: admins } = await serviceDb.from('profiles').select('user_id, email').in('role', ['admin'])
      for (const admin of admins || []) {
        await serviceDb.from('notifications').insert({
          user_id: admin.user_id,
          type: 'affiliate',
          title: 'New Affiliate Registration',
          message: `New affiliate registered: ${profile?.email || user.email}`,
          data: { affiliate_user_id: user.id, referral_code: code },
        })
        if (admin.email && profile?.email) {
          await sendAdminNewAffiliateEmail(admin.email, profile.email, code)
        }
      }
    } catch (e) {
      console.error('Affiliate activation notification failed:', e)
    }

    toast.success('Akun affiliate berhasil diaktifkan!')
    setJoining(false)
    load()
  }

  const copyLink = (link: AffiliateLink) => {
    const url = `${window.location.origin}/a/${link.short_code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(link.id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const requestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!affiliate) return

    const amount = parseFloat(withdrawalForm.amount)
    if (!amount || amount <= 0) {
      toast.error('Masukkan jumlah yang valid')
      return
    }

    if (amount > stats.available_balance) {
      toast.error(`Saldo tidak cukup. Tersedia: ${fmtIDR(stats.available_balance)}`)
      return
    }

    setSubmittingWithdrawal(true)

    try {
      const res = await fetch('/api/affiliate-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliate.id,
          amount,
          bank_name: withdrawalForm.bank_name,
          account_number: withdrawalForm.account_number,
          account_holder: withdrawalForm.account_holder,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Gagal mengajukan penarikan')
        setSubmittingWithdrawal(false)
        return
      }

      toast.success('Pengajuan penarikan berhasil dikirim')
      setWithdrawalForm({ amount: '', bank_name: '', account_number: '', account_holder: '' })
      setTab('payouts')
      load()
    } catch (err) {
      toast.error('Terjadi kesalahan')
    }

    setSubmittingWithdrawal(false)
  }

  const sorted = [...links].sort((a, b) => {
    switch (sort) {
      case 'name_asc': return a.product_name.localeCompare(b.product_name)
      case 'name_desc': return b.product_name.localeCompare(a.product_name)
      case 'commission_high': return (b.commission_value || 0) - (a.commission_value || 0)
      case 'clicks_high': return b.clicks - a.clicks
      default: return 0
    }
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <svg className="w-8 h-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  if (!affiliate) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Program Affiliate</h2>
      <p className="text-slate-500 text-sm max-w-sm mb-6">
        Dapatkan komisi dengan mempromosikan produk. Setiap produk memiliki short link unik yang bisa kamu bagikan.
      </p>
      <button
        onClick={joinAffiliate}
        disabled={joining}
        className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {joining && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
        Gabung Sekarang
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Affiliate Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Pantau performa referral dan pendapatan kamu</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard label="Total Earnings" value={fmtIDR(stats.earnings)} icon={<MoneyIcon />} color="green" />
        <OverviewCard label="Available Balance" value={fmtIDR(stats.available_balance)} icon={<WalletIcon />} color="blue" />
        <OverviewCard label="Paid Out" value={fmtIDR(stats.paid_out)} icon={<CheckIcon />} color="emerald" />
        <OverviewCard label="Total Referrals" value={stats.total_referrals.toString()} icon={<UsersIcon />} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { key: 'products', label: 'Affiliate Products' },
          { key: 'commissions', label: 'Commission History' },
          { key: 'payouts', label: 'Payout History' },
          { key: 'withdraw', label: 'Request Withdrawal' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'products' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-base font-semibold text-slate-900">Affiliate Products</h2>
              {links.length > 0 && (
                <span className="ml-1 bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{links.length}</span>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {SORT_LABELS[sort]}
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => { setSort(val); setSortOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-slate-50 ${sort === val ? 'font-semibold text-blue-600 bg-blue-50' : 'text-slate-700'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="font-semibold text-slate-500">No affiliate products available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    {['Product', 'Commission', 'Short Link', 'Clicks', 'Conversions', 'Conv. Rate', 'Earnings', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map(link => (
                    <tr key={link.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {link.product_image ? (
                            <img src={link.product_image} alt={link.product_name}
                              className="w-9 h-9 rounded-lg object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                          )}
                          <span className="text-sm font-medium text-slate-900 line-clamp-2 max-w-[160px]">{link.product_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                          {fmtCommission(link.commission_type, link.commission_value)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">/a/{link.short_code}</code>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-700">{link.clicks.toLocaleString()}</span></td>
                      <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-700">{link.conversions.toLocaleString()}</span></td>
                      <td className="px-5 py-4"><span className={`text-sm font-semibold ${link.clicks > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{conversionRate(link.conversions, link.clicks)}</span></td>
                      <td className="px-5 py-4"><span className="text-sm font-bold text-emerald-700">{fmtIDR(link.earnings)}</span></td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => copyLink(link)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            copied === link.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {copied === link.id ? (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                          ) : (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'commissions' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Commission History</h2>
          </div>
          {commissions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">No commissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Type</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commissions.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-4 text-sm font-medium text-slate-900">{c.product?.name || 'Unknown'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-emerald-700">{fmtIDR(Number(c.amount))}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{c.commission_type === 'percentage' ? `${c.commission_rate}%` : fmtIDR(Number(c.commission_rate))}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[c.status] || STATUS_STYLES.pending}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'payouts' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Payout History</h2>
          </div>
          {withdrawals.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Bank</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Account</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Proof</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Requested</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-slate-900">{fmtIDR(Number(w.amount))}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{w.bank_name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div>{w.account_number}</div>
                        <div className="text-xs text-slate-400">{w.account_holder}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[w.status] || STATUS_STYLES.pending}`}>
                          {w.status}
                        </span>
                        {w.rejection_reason && (
                          <div className="text-xs text-red-500 mt-1">{w.rejection_reason}</div>
                        )}
                        {w.admin_notes && (
                          <div className="text-xs text-slate-400 mt-1">{w.admin_notes}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {w.transfer_proof_url ? (
                          <a href={w.transfer_proof_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm font-medium">
                            View Proof
                          </a>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(w.requested_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-sm text-slate-500">{w.paid_at ? new Date(w.paid_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="max-w-xl">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Request Withdrawal</h2>
            <p className="text-sm text-slate-500 mb-4">
              Available Balance: <span className="font-bold text-blue-600">{fmtIDR(stats.available_balance)}</span>
            </p>

            {stats.available_balance <= 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                You don't have enough available balance to request a withdrawal.
              </div>
            ) : (
              <form onSubmit={requestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (IDR)</label>
                  <input
                    type="number"
                    value={withdrawalForm.amount}
                    onChange={e => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                    placeholder="Enter amount"
                    max={stats.available_balance}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={withdrawalForm.bank_name}
                    onChange={e => setWithdrawalForm({ ...withdrawalForm, bank_name: e.target.value })}
                    placeholder="e.g. BCA, Mandiri, BNI"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={withdrawalForm.account_number}
                    onChange={e => setWithdrawalForm({ ...withdrawalForm, account_number: e.target.value })}
                    placeholder="Bank account number"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={withdrawalForm.account_holder}
                    onChange={e => setWithdrawalForm({ ...withdrawalForm, account_holder: e.target.value })}
                    placeholder="Name on bank account"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingWithdrawal}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingWithdrawal && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                  Submit Withdrawal Request
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewCard({ label, value, icon, color }: {
  label: string; value: string; icon: React.ReactNode
  color: 'blue' | 'emerald' | 'amber' | 'green'
}) {
  const c = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', val: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', val: 'text-amber-700' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', val: 'text-green-700' },
  }[color]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`text-2xl font-bold mt-2 ${c.val}`}>{value}</p>
        </div>
        <div className={`p-2.5 ${c.bg} rounded-xl ${c.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function UsersIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function CheckIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function MoneyIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function WalletIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m0 0a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 9m0 0v2.25" /></svg>
}
