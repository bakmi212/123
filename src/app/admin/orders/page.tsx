'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

const supabase = createBrowserClient()

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentFilter = 'all' | 'pending_payment' | 'pending_verification' | 'paid' | 'rejected'
type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled'

interface Order {
  id: string
  order_number: string
  total_amount: number
  status: string
  payment_status: string
  order_status: string
  billing_name: string | null
  billing_email: string | null
  billing_phone: string | null
  payment_proof: string | null
  payment_notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  user_id: string | null
  product_id: string | null
  payment_account_id: string | null
  affiliate_id: string | null
  license_key: string | null
  product_download_url: string | null
  // enriched
  customer_name: string | null
  customer_email: string | null
  product_name: string | null
  product_slug: string | null
  product_download: string | null  // from product table
  product_license_enabled: boolean
  bank_name: string | null
  account_holder: string | null
  affiliate_name: string | null
  commission_amount: number | null
  commission_status: string | null
}

interface Toast {
  id: number
  type: 'success' | 'error'
  msg: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const P_LABELS: Record<string, string> = {
  pending_payment: 'Pending Payment',
  pending_verification: 'Pending Verification',
  paid: 'Paid',
  settlement: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  pending: 'Pending',
}
const O_LABELS: Record<string, string> = {
  pending: 'Pending', processing: 'Processing',
  completed: 'Completed', cancelled: 'Cancelled',
}
const P_BG: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-800',
  pending_verification: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  settlement: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800',
}
const O_BG: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-600',
}

function fmtIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({ total: 0, pending_payment: 0, pending_verification: 0, paid: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [proofOrder, setProofOrder] = useState<Order | null>(null)
  const [statusOrder, setStatusOrder] = useState<Order | null>(null)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  const toast = useCallback((type: 'success' | 'error', msg: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: rawOrders, error: err } = await supabase
      .from('orders')
      .select(`
        id, order_number, total_amount, status, payment_status, order_status,
        billing_name, billing_email, billing_phone,
        payment_proof, payment_notes, created_at, updated_at, completed_at,
        user_id, product_id, payment_account_id, affiliate_id,
        license_key, product_download_url
      `)
      .order('created_at', { ascending: false })

    if (err) { setError(err.message); setLoading(false); return }
    if (!rawOrders?.length) {
      setAllOrders([]); setStats({ total: 0, pending_payment: 0, pending_verification: 0, paid: 0 })
      setLoading(false); return
    }

    // Batch enrich: profiles, products, payment_accounts, affiliates, commissions
    const userIds = [...new Set(rawOrders.map((o: any) => o.user_id).filter(Boolean))]
    const productIds = [...new Set(rawOrders.map((o: any) => o.product_id).filter(Boolean))]
    const accountIds = [...new Set(rawOrders.map((o: any) => o.payment_account_id).filter(Boolean))]
    const affiliateIds = [...new Set(rawOrders.map((o: any) => o.affiliate_id).filter(Boolean))]
    const orderIds = rawOrders.map((o: any) => o.id)

    const [profiles, products, accounts, affiliates, commissions, orderItems] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('user_id,full_name,email').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      productIds.length
        ? supabase.from('products').select('id,name,slug,download_url,download_file,license_enabled,enable_license').in('id', productIds)
        : Promise.resolve({ data: [] }),
      accountIds.length
        ? supabase.from('payment_accounts').select('id,bank_name,account_holder').in('id', accountIds)
        : Promise.resolve({ data: [] }),
      affiliateIds.length
        ? supabase.from('affiliates').select('id,user_id,profiles(full_name)').in('id', affiliateIds)
        : Promise.resolve({ data: [] }),
      supabase.from('affiliate_commissions').select('order_id,amount,status').in('order_id', orderIds),
      supabase.from('order_items').select('order_id,product_id,products(name,slug,download_url,download_file,license_enabled,enable_license)').in('order_id', rawOrders.filter((o: any) => !o.product_id).map((o: any) => o.id)),
    ])

    const profileMap: Record<string, any> = {}
    ;(profiles.data || []).forEach((p: any) => { profileMap[p.user_id] = p })

    const productMap: Record<string, any> = {}
    ;(products.data || []).forEach((p: any) => { productMap[p.id] = p })

    const accountMap: Record<string, any> = {}
    ;(accounts.data || []).forEach((a: any) => { accountMap[a.id] = a })

    const affiliateMap: Record<string, any> = {}
    ;(affiliates.data || []).forEach((a: any) => { affiliateMap[a.id] = a })

    const commissionMap: Record<string, any> = {}
    ;(commissions.data || []).forEach((c: any) => { commissionMap[c.order_id] = c })

    // order_items fallback for products
    const oiProductMap: Record<string, any> = {}
    ;(orderItems.data || []).forEach((item: any) => {
      if (!oiProductMap[item.order_id]) {
        const p = Array.isArray(item.products) ? item.products[0] : item.products
        if (p) oiProductMap[item.order_id] = p
      }
    })

    const mapped: Order[] = rawOrders.map((row: any) => {
      const profile = row.user_id ? profileMap[row.user_id] : null
      const account = row.payment_account_id ? accountMap[row.payment_account_id] : null
      const prod = row.product_id ? productMap[row.product_id] : oiProductMap[row.id] ?? null
      const aff = row.affiliate_id ? affiliateMap[row.affiliate_id] : null
      const comm = commissionMap[row.id] ?? null
      const affProfiles = aff?.profiles
      const affName = Array.isArray(affProfiles) ? affProfiles[0]?.full_name : affProfiles?.full_name

      return {
        id: row.id,
        order_number: row.order_number || row.id.slice(0, 8).toUpperCase(),
        total_amount: Number(row.total_amount) || 0,
        status: row.status || 'pending',
        payment_status: row.payment_status || 'pending_payment',
        order_status: row.order_status || row.status || 'pending',
        billing_name: row.billing_name,
        billing_email: row.billing_email,
        billing_phone: row.billing_phone,
        payment_proof: row.payment_proof,
        payment_notes: row.payment_notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        completed_at: row.completed_at,
        user_id: row.user_id,
        product_id: row.product_id,
        payment_account_id: row.payment_account_id,
        affiliate_id: row.affiliate_id,
        license_key: row.license_key,
        product_download_url: row.product_download_url,
        customer_name: row.billing_name || profile?.full_name || null,
        customer_email: row.billing_email || profile?.email || null,
        product_name: prod?.name ?? null,
        product_slug: prod?.slug ?? null,
        product_download: prod?.download_url || prod?.download_file || null,
        product_license_enabled: !!(prod?.license_enabled || prod?.enable_license),
        bank_name: account?.bank_name ?? null,
        account_holder: account?.account_holder ?? null,
        affiliate_name: affName || null,
        commission_amount: comm ? Number(comm.amount) : null,
        commission_status: comm?.status ?? null,
      }
    })

    setAllOrders(mapped)
    setStats({
      total: mapped.length,
      pending_payment: mapped.filter(o => o.payment_status === 'pending_payment').length,
      pending_verification: mapped.filter(o => o.payment_status === 'pending_verification').length,
      paid: mapped.filter(o => o.payment_status === 'paid' || o.payment_status === 'settlement').length,
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateOrder = useCallback(async (
    orderId: string,
    updates: { payment_status?: string; order_status?: string },
    onSuccess?: (updatedOrder: any) => void
  ) => {
    // Build update object - update both status and order_status columns
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.payment_status !== undefined) {
      updateData.payment_status = updates.payment_status
    }

    if (updates.order_status !== undefined) {
      updateData.order_status = updates.order_status
      updateData.status = updates.order_status // Keep status column in sync
    }

    // Auto-set processing when payment becomes paid
    if (updates.payment_status === 'paid' && updates.order_status === undefined) {
      const order = allOrders.find(o => o.id === orderId)
      if (order && (order.order_status === 'pending' || order.status === 'pending')) {
        updateData.order_status = 'processing'
        updateData.status = 'processing'
      }
    }

    // If completing order, set completed_at timestamp
    if (updates.order_status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Update order directly in Supabase
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .maybeSingle()

    if (error) {
      toast('error', error.message || 'Gagal menyimpan perubahan')
      return false
    }

    toast('success', 'Status berhasil diperbarui')
    // Refresh all data from DB so UI matches server state
    await load()
    onSuccess?.(data)

    // Handle license key generation for completed orders (via API for server-side processing)
    if (updates.order_status === 'completed' && data) {
      // The database trigger handles affiliate commissions automatically
      // Call API for any additional server-side processing (license generation, etc.)
      try {
        await fetch('/api/admin/orders/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, order_status: 'completed', _skip_db_update: true }),
        })
      } catch {
        // Non-critical - order already updated in DB
      }
    }

    return true
  }, [load, toast, allOrders, supabase])

  const filtered = allOrders.filter(o => {
    if (paymentFilter !== 'all' && o.payment_status !== paymentFilter) return false
    if (statusFilter !== 'all' && (o.order_status || o.status) !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!o.order_number.toLowerCase().includes(q)
        && !(o.customer_name?.toLowerCase().includes(q))
        && !(o.customer_email?.toLowerCase().includes(q))
        && !(o.product_name?.toLowerCase().includes(q))) return false
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border animate-in slide-in-from-right-4 fade-in ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
            {t.type === 'success'
              ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            }
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola dan pantau semua pesanan pelanggan</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total Orders', val: stats.total, color: 'slate', f: 'all' as PaymentFilter },
          { label: 'Pending Payment', val: stats.pending_payment, color: 'amber', f: 'pending_payment' as PaymentFilter },
          { label: 'Pending Verification', val: stats.pending_verification, color: 'blue', f: 'pending_verification' as PaymentFilter },
          { label: 'Paid', val: stats.paid, color: 'emerald', f: 'paid' as PaymentFilter },
        ] as const).map(({ label, val, color, f }) => (
          <StatCard key={label} label={label} value={val} color={color}
            active={paymentFilter === f}
            onClick={() => setPaymentFilter(p => p === f ? 'all' : f)} />
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Cari order, pelanggan, produk..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as PaymentFilter)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">Semua Status Pembayaran</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="pending_verification">Pending Verification</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">Semua Status Order</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <span className="flex-1"><strong>Error:</strong> {error}</span>
          <button onClick={load} className="underline font-medium">Coba lagi</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Memuat data orders...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold text-slate-500">Tidak ada order ditemukan</p>
            {(paymentFilter !== 'all' || statusFilter !== 'all' || search) && (
              <button onClick={() => { setPaymentFilter('all'); setStatusFilter('all'); setSearch('') }}
                className="text-sm text-blue-600 underline">
                Reset filter ({allOrders.length} total order)
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left">
                    {['Order ID', 'Customer', 'Product', 'Amount', 'Payment', 'Status', 'Tanggal', 'Aksi'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(order => (
                    <OrderRow key={order.id} order={order}
                      onDetail={() => setDetailOrder(order)}
                      onViewProof={() => setProofOrder(order)}
                      onChangeStatus={() => setStatusOrder(order)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex justify-between">
              <span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{allOrders.length}</strong> order</span>
              {(paymentFilter !== 'all' || statusFilter !== 'all' || search) && (
                <button onClick={() => { setPaymentFilter('all'); setStatusFilter('all'); setSearch('') }}
                  className="text-blue-600 underline">Reset filter</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {proofOrder && <ProofModal order={proofOrder} onClose={() => setProofOrder(null)} />}
      {statusOrder && (
        <StatusModal
          order={statusOrder}
          onClose={() => setStatusOrder(null)}
          onSave={updateOrder}
        />
      )}
      {detailOrder && (
        <DetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onChangeStatus={() => { setDetailOrder(null); setStatusOrder(detailOrder) }}
          onViewProof={() => { setDetailOrder(null); setProofOrder(detailOrder) }}
        />
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, active, onClick, color }: {
  label: string; value: number; active: boolean; onClick: () => void
  color: 'slate' | 'amber' | 'blue' | 'emerald'
}) {
  const s = {
    slate: { ring: 'ring-slate-400', bg: 'bg-slate-50', num: 'text-slate-900' },
    amber: { ring: 'ring-amber-400', bg: 'bg-amber-50', num: 'text-amber-700' },
    blue: { ring: 'ring-blue-400', bg: 'bg-blue-50', num: 'text-blue-700' },
    emerald: { ring: 'ring-emerald-400', bg: 'bg-emerald-50', num: 'text-emerald-700' },
  }[color]
  return (
    <button onClick={onClick}
      className={`text-left p-5 rounded-xl border cursor-pointer transition-all ${active ? `ring-2 ${s.ring} ${s.bg} border-transparent shadow-sm` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-4xl font-bold mt-2 ${s.num}`}>{value}</p>
    </button>
  )
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function OrderRow({ order, onDetail, onViewProof, onChangeStatus }: {
  order: Order; onDetail: () => void; onViewProof: () => void; onChangeStatus: () => void
}) {
  const effectiveStatus = order.order_status || order.status || 'pending'
  return (
    <tr className="hover:bg-slate-50/40 transition-colors group">
      <td className="px-4 py-3">
        <button onClick={onDetail}
          className="text-xs font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 px-1.5 py-0.5 rounded text-slate-700 transition-colors cursor-pointer">
          {order.order_number}
        </button>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900">{order.customer_name || <em className="text-slate-400 not-italic text-xs">—</em>}</p>
        <p className="text-xs text-slate-500 truncate max-w-[150px]">{order.customer_email || ''}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700 truncate max-w-[140px]">{order.product_name || '—'}</p>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-bold text-slate-900">{fmtIDR(order.total_amount)}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${P_BG[order.payment_status] || 'bg-slate-100 text-slate-600'}`}>
          {P_LABELS[order.payment_status] || order.payment_status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${O_BG[effectiveStatus] || 'bg-slate-100 text-slate-600'}`}>
          {O_LABELS[effectiveStatus] || effectiveStatus}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(order.created_at)}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onViewProof} disabled={!order.payment_proof}
            title={order.payment_proof ? 'Lihat bukti transfer' : 'Belum ada bukti'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              order.payment_proof
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Bukti
          </button>
          <button onClick={onChangeStatus}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Ubah Status
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Proof Modal ──────────────────────────────────────────────────────────────

function ProofModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <Modal title="Bukti Transfer" onClose={onClose} maxW="max-w-lg">
      {order.payment_proof ? (
        <div className="bg-slate-100 flex items-center justify-center max-h-80 overflow-hidden">
          <img src={order.payment_proof} alt="Bukti Transfer" className="w-full object-contain max-h-80" />
        </div>
      ) : (
        <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-sm">Tidak ada bukti</div>
      )}
      <div className="px-6 py-4 space-y-3">
        <DRow label="Bank" value={order.bank_name || '—'} />
        <DRow label="Pengirim" value={order.billing_name || order.customer_name || '—'} />
        <DRow label="Nominal" value={fmtIDR(order.total_amount)} />
        <DRow label="Tanggal" value={fmtDate(order.updated_at || order.created_at)} />
        {order.payment_notes && <DRow label="Catatan" value={order.payment_notes} />}
      </div>
      <div className="px-6 py-4 border-t flex justify-end">
        <BtnPrimary onClick={onClose}>Tutup</BtnPrimary>
      </div>
    </Modal>
  )
}

// ─── Status Modal ─────────────────────────────────────────────────────────────

function StatusModal({ order, onClose, onSave }: {
  order: Order
  onClose: () => void
  onSave: (orderId: string, updates: any) => Promise<boolean>
}) {
  const effectiveOS = order.order_status || order.status || 'pending'
  const [paymentStatus, setPaymentStatus] = useState(order.payment_status)
  const [orderStatus, setOrderStatus] = useState(effectiveOS)
  const [saving, setSaving] = useState(false)

  const handlePaymentChange = (val: string) => {
    setPaymentStatus(val)
    if (val === 'paid' && (orderStatus === 'pending')) {
      setOrderStatus('processing')
    }
  }

  const save = async () => {
    setSaving(true)
    const ok = await onSave(order.id, { payment_status: paymentStatus, order_status: orderStatus })
    setSaving(false)
    if (ok) onClose()
  }

  const paymentOptions = [
    { val: 'pending_payment', label: 'Pending Payment', color: 'amber' },
    { val: 'pending_verification', label: 'Pending Verification', color: 'blue' },
    { val: 'paid', label: 'Paid', color: 'emerald' },
    { val: 'rejected', label: 'Rejected', color: 'red' },
  ]
  const orderOptions = [
    { val: 'pending', label: 'Pending', color: 'amber' },
    { val: 'processing', label: 'Processing', color: 'blue' },
    { val: 'completed', label: 'Completed', color: 'emerald' },
    { val: 'cancelled', label: 'Cancelled', color: 'slate' },
  ]

  return (
    <Modal title="Ubah Status Order" subtitle={order.order_number} onClose={onClose} maxW="max-w-md">
      <div className="px-6 py-5 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Status Pembayaran</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentOptions.map(({ val, label, color }) => (
              <OptionTile key={val} selected={paymentStatus === val} color={color} onClick={() => handlePaymentChange(val)}>
                {label}
              </OptionTile>
            ))}
          </div>
          {paymentStatus === 'paid' && orderStatus === 'processing' && (
            <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Order status otomatis diubah ke Processing
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Status Order</label>
          <div className="grid grid-cols-2 gap-2">
            {orderOptions.map(({ val, label, color }) => (
              <OptionTile key={val} selected={orderStatus === val} color={color} onClick={() => setOrderStatus(val)}>
                {label}
              </OptionTile>
            ))}
          </div>
          {orderStatus === 'completed' && order.affiliate_id && (
            <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Komisi affiliate akan dihitung otomatis
            </p>
          )}
          {orderStatus === 'completed' && order.product_license_enabled && (
            <p className="text-xs text-purple-600 mt-1.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              License key akan di-generate otomatis
            </p>
          )}
        </div>
      </div>
      <div className="px-6 py-4 border-t flex justify-end gap-3">
        <BtnSecondary onClick={onClose} disabled={saving}>Batal</BtnSecondary>
        <BtnPrimary onClick={save} loading={saving}>Simpan</BtnPrimary>
      </div>
    </Modal>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ order, onClose, onChangeStatus, onViewProof }: {
  order: Order; onClose: () => void; onChangeStatus: () => void; onViewProof: () => void
}) {
  const effectiveStatus = order.order_status || order.status || 'pending'
  const showLicense = order.license_key
  const showDownload = order.product_download_url || order.product_download

  return (
    <Modal title="Detail Order" subtitle={order.order_number} onClose={onClose} maxW="max-w-lg">
      <div className="px-6 py-5 space-y-4">
        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${P_BG[order.payment_status] || 'bg-slate-100 text-slate-600'}`}>
            {P_LABELS[order.payment_status] || order.payment_status}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${O_BG[effectiveStatus] || 'bg-slate-100 text-slate-600'}`}>
            {O_LABELS[effectiveStatus] || effectiveStatus}
          </span>
        </div>

        {/* Core info */}
        <div className="space-y-2.5 border border-slate-100 rounded-xl p-4 bg-slate-50/50">
          <DRow label="Customer" value={order.customer_name || '—'} />
          <DRow label="Email" value={order.customer_email || '—'} />
          <DRow label="Produk" value={order.product_name || '—'} />
          <DRow label="Amount" value={fmtIDR(order.total_amount)} highlight />
          <DRow label="Tanggal Order" value={fmtDate(order.created_at)} />
          {order.completed_at && <DRow label="Tanggal Selesai" value={fmtDate(order.completed_at)} />}
        </div>

        {/* Affiliate info */}
        {order.affiliate_id && (
          <div className="space-y-2.5 border border-blue-100 rounded-xl p-4 bg-blue-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Affiliate</p>
            <DRow label="Referrer" value={order.affiliate_name || 'Affiliate'} />
            {order.commission_amount !== null && (
              <DRow label="Komisi" value={`${fmtIDR(order.commission_amount)} (${order.commission_status || 'pending'})`} />
            )}
          </div>
        )}

        {/* License key */}
        {showLicense && (
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">License Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-white border border-purple-200 px-3 py-2 rounded-lg text-slate-800 tracking-widest">
                {order.license_key}
              </code>
              <button onClick={() => navigator.clipboard.writeText(order.license_key!)}
                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors" title="Copy">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Download */}
        {showDownload && (
          <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Download Produk</p>
            <a href={order.product_download_url || order.product_download || '#'}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-700 font-medium hover:text-emerald-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </a>
          </div>
        )}

        {/* Payment proof */}
        {order.payment_proof && (
          <button onClick={onViewProof}
            className="w-full flex items-center gap-3 border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors text-left group">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
              <img src={order.payment_proof} alt="proof" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Bukti Transfer</p>
              <p className="text-xs text-slate-500">{order.bank_name || 'Bank'} — {order.billing_name || order.customer_name}</p>
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      <div className="px-6 py-4 border-t flex justify-between gap-3">
        <BtnSecondary onClick={onChangeStatus}>Ubah Status</BtnSecondary>
        <BtnPrimary onClick={onClose}>Tutup</BtnPrimary>
      </div>
    </Modal>
  )
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children, maxW = 'max-w-md' }: {
  title: string; subtitle?: string; onClose: () => void
  children: React.ReactNode; maxW?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} overflow-hidden max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 font-mono">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

function DRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-slate-500 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>{value}</span>
    </div>
  )
}

function OptionTile({ selected, color, onClick, children }: {
  selected: boolean; color: string; onClick: () => void; children: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    amber: 'border-amber-400 bg-amber-50 text-amber-800',
    blue: 'border-blue-400 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-400 bg-emerald-50 text-emerald-800',
    red: 'border-red-400 bg-red-50 text-red-800',
    slate: 'border-slate-400 bg-slate-100 text-slate-700',
  }
  return (
    <button onClick={onClick}
      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
        selected ? (colorMap[color] || 'border-slate-400 bg-slate-50 text-slate-700') : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}>
      {children}
    </button>
  )
}

function BtnPrimary({ onClick, children, loading, disabled }: {
  onClick: () => void; children: React.ReactNode; loading?: boolean; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
      {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
      {children}
    </button>
  )
}

function BtnSecondary({ onClick, children, disabled }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
      {children}
    </button>
  )
}
