'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Withdrawal {
  id: string
  affiliate_id: string
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
  created_at: string
  affiliate_email?: string | null
  affiliate_name?: string | null
  affiliate?: {
    id: string
    referral_code: string
    status: string
    profile?: { email: string; full_name: string } | { email: string; full_name: string }[]
  }
}

interface Referral {
  id: string
  status: string
  commission: number
  created_at: string
  referrer: { email: string } | null
  referee: { email: string } | null
}

interface ReferralRow {
  id: string
  status: string
  commission: number
  created_at: string
  referrer: { email: string }[]
  referee: { email: string }[]
}

type Tab = 'withdrawals' | 'referrals'
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paid'

function fmtIDR(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function AdminAffiliatesPage() {
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('withdrawals')
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Withdrawal | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)

  const supabase = createBrowserClient()

  const loadWithdrawals = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    const res = await fetch(`/api/admin/withdrawals?${params}`)
    const data = await res.json()
    if (data.withdrawals) {
      setWithdrawals(data.withdrawals)
    }
  }, [statusFilter])

  const loadReferrals = useCallback(async () => {
    const { data } = await supabase
      .from('referrals')
      .select('id, status, commission, created_at, referrer:profiles!referrals_referrer_id_fkey(email), referee:profiles!referrals_referee_id_fkey(email)')
      .order('created_at', { ascending: false })
    const formatted: Referral[] = (data as ReferralRow[])?.map(row => ({
      id: row.id, status: row.status, commission: row.commission, created_at: row.created_at,
      referrer: row.referrer?.[0] || null, referee: row.referee?.[0] || null
    })) || []
    setReferrals(formatted)
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setAdminUserId(user.id)
      await Promise.all([loadWithdrawals(), loadReferrals()])
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    loadWithdrawals()
  }, [loadWithdrawals])

  const handleAction = async (action: string, extra?: Record<string, any>) => {
    if (!selected) return
    setActionLoading(true)

    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: selected.id,
          action,
          processed_by: adminUserId,
          ...extra,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Action failed')
        setActionLoading(false)
        return
      }

      toast.success(`Withdrawal ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'mark_paid' ? 'marked as paid' : 'updated'}`)
      setSelected(null)
      setEditAmount('')
      setAdminNotes('')
      setRejectionReason('')
      setProofFile(null)
      loadWithdrawals()
    } catch (err) {
      toast.error('An error occurred')
    }

    setActionLoading(false)
  }

  const handleUploadProof = async () => {
    if (!proofFile || !selected) return
    setUploadingProof(true)

    const BUCKET_NAME = 'payment-proofs'
    const fileName = `withdrawals/${selected.id}/${Date.now()}_${proofFile.name}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, proofFile, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`)
      setUploadingProof(false)
      return
    }

    const proofUrl = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName).data.publicUrl

    await handleAction('upload_proof', { transfer_proof_url: proofUrl })
    setUploadingProof(false)
  }

  const filtered = withdrawals

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter(w => w.status === 'pending').length,
    approved: withdrawals.filter(w => w.status === 'approved').length,
    paid: withdrawals.filter(w => w.status === 'paid').length,
    totalAmount: withdrawals.filter(w => w.status === 'paid').reduce((sum, w) => sum + Number(w.amount), 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <svg className="w-8 h-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Affiliate Management</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage withdrawals and referral program</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Requests" value={stats.total.toString()} color="slate" />
        <StatCard label="Pending" value={stats.pending.toString()} color="amber" />
        <StatCard label="Approved" value={stats.approved.toString()} color="blue" />
        <StatCard label="Paid" value={stats.paid.toString()} color="emerald" />
        <StatCard label="Total Paid Out" value={fmtIDR(stats.totalAmount)} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          { key: 'withdrawals', label: 'Withdrawal Requests' },
          { key: 'referrals', label: 'Referrals' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'withdrawals' && (
        <>
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {(['all', 'pending', 'approved', 'rejected', 'paid'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Withdrawals Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm">No withdrawal requests</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left">
                      {['Affiliate', 'Amount', 'Bank', 'Account', 'Status', 'Requested', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-slate-900">{w.affiliate_email || 'Unknown'}</div>
                          {w.affiliate_name && <div className="text-xs text-slate-400">{w.affiliate_name}</div>}
                        </td>
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
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-500">{new Date(w.requested_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setSelected(w); setEditAmount(w.amount.toString()); setAdminNotes(w.admin_notes || ''); setRejectionReason(w.rejection_reason || '') }}
                            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'referrals' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">All Referrals</h2>
          </div>
          {referrals.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm">No referrals yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left">
                    {['Referrer', 'Referee', 'Commission', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="px-5 py-4 text-sm text-slate-900">{ref.referrer?.email || '-'}</td>
                      <td className="px-5 py-4 text-sm text-slate-900">{ref.referee?.email || '-'}</td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-700">{fmtIDR(ref.commission || 0)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          ref.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          ref.status === 'converted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{new Date(ref.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail/Action Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Withdrawal Details</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Affiliate" value={selected.affiliate_email || 'Unknown'} />
                <InfoItem label="Amount" value={fmtIDR(Number(selected.amount))} />
                <InfoItem label="Bank" value={selected.bank_name} />
                <InfoItem label="Account Number" value={selected.account_number} />
                <InfoItem label="Account Holder" value={selected.account_holder} />
                <InfoItem label="Status" value={
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>{selected.status}</span>
                } />
                <InfoItem label="Requested" value={new Date(selected.requested_at).toLocaleString()} />
                {selected.approved_at && <InfoItem label="Approved" value={new Date(selected.approved_at).toLocaleString()} />}
                {selected.paid_at && <InfoItem label="Paid" value={new Date(selected.paid_at).toLocaleString()} />}
              </div>

              {selected.transfer_proof_url && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Transfer Proof</p>
                  <a href={selected.transfer_proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View Transfer Proof</a>
                </div>
              )}

              {selected.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selected.rejection_reason}</p>
                </div>
              )}

              {selected.admin_notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-600">{selected.admin_notes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === 'pending' && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Edit Amount (IDR)</label>
                    <input
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      onClick={() => handleAction('edit_amount', { amount: parseFloat(editAmount) })}
                      disabled={actionLoading}
                      className="mt-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      Update Amount
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin Notes</label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Optional notes..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[60px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('approve', { admin_notes: adminNotes })}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction('reject', { rejection_reason: rejectionReason || adminNotes })}
                      disabled={actionLoading}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {selected.status === 'approved' && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload Transfer Proof</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setProofFile(e.target.files?.[0] || null)}
                      className="w-full text-sm"
                    />
                    <button
                      onClick={handleUploadProof}
                      disabled={!proofFile || uploadingProof || actionLoading}
                      className="mt-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      {uploadingProof ? 'Uploading...' : 'Upload Proof'}
                    </button>
                  </div>

                  {selected.transfer_proof_url && (
                    <button
                      onClick={() => handleAction('mark_paid')}
                      disabled={actionLoading}
                      className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'slate' | 'amber' | 'blue' | 'emerald' | 'green' }) {
  const c = {
    slate: 'text-slate-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    green: 'text-green-700',
  }[color]

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${c}`}>{value}</p>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="text-sm text-slate-900 mt-0.5">{value}</div>
    </div>
  )
}
