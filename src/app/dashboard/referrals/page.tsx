'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function ReferralsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/affiliate')
  }, [router])

  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}
