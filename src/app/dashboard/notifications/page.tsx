'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/client'
import { Bell, Loader2, Package, CreditCard, Key, Download, Gift, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  read_at: string | null
  created_at: string
  data: Record<string, any> | null
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  order: { icon: Package, color: 'text-blue-600 bg-blue-50' },
  payment: { icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
  license: { icon: Key, color: 'text-purple-600 bg-purple-50' },
  download: { icon: Download, color: 'text-orange-600 bg-orange-50' },
  affiliate: { icon: Gift, color: 'text-pink-600 bg-pink-50' },
  system: { icon: AlertCircle, color: 'text-slate-600 bg-slate-100' },
}

function isRead(notification: Notification): boolean {
  return notification.read === true || notification.read_at !== null
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      setNotifications((data as Notification[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const markAsRead = async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read: true, read_at: now }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, read_at: now } : n))
  }

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read: true, read_at: now }).eq('user_id', user.id).or('read.is.null,read.eq.false')
    setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: n.read_at || now })))
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const unreadCount = notifications.filter(n => !isRead(n)).length

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-slate-500 mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && <Button variant="outline" onClick={markAllAsRead}>Mark all as read</Button>}
      </div>
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h3 className="font-semibold text-slate-700 mb-2">No notifications</h3>
            <p className="text-slate-500 text-sm">You are all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const typeCfg = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system
            const TypeIcon = typeCfg.icon
            const notificationRead = isRead(notification)

            return (
              <Card key={notification.id} className={`${notificationRead ? 'opacity-60' : 'border-blue-200 bg-blue-50/30'}`}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl ${typeCfg.color} shrink-0`}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-900">{notification.title}</span>
                      {!notificationRead && <Badge className="bg-blue-600 text-white text-xs border-0">New</Badge>}
                      <Badge variant="outline" className="text-xs capitalize">{notification.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!notificationRead && (
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => markAsRead(notification.id)}>
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
