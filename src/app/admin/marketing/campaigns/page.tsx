'use client'

import { useEffect, useState } from 'react'

import { Loader2, Plus } from 'lucide-react'

import { toast } from 'sonner'

import { createBrowserClient } from '@/lib/supabase/client'

import CampaignTable, {

  CampaignRow,

} from './components/CampaignTable'

import CampaignDialog, {

  CampaignForm,

} from './components/CampaignDialog'

import { Button } from '@/components/ui/button'

const defaultForm: CampaignForm = {

  campaign_name: '',

  campaign_type: 'banner',

  image_url: '',

  button_text: '',

  button_url: '',

  priority: 100,

  duration: 5,

  all_products: true,

  product_ids: [],

  is_active: true,

}

export default function CampaignPage() {

  const supabase = createBrowserClient()

  const [loading, setLoading] =

    useState(true)

  const [saving, setSaving] =

    useState(false)

  const [campaigns, setCampaigns] =

    useState<CampaignRow[]>([])

  const [dialogOpen, setDialogOpen] =

    useState(false)

  const [editingId, setEditingId] =

    useState<string | null>(null)

  const [form, setForm] =

    useState<CampaignForm>(defaultForm)

  useEffect(() => {

    loadCampaigns()

  }, [])

  async function loadCampaigns() {

    setLoading(true)

    const { data, error } = await supabase

      .from('desktop_campaigns')

      .select(`
        *,
        desktop_campaign_products(
          product_id,
          products(
            id,
            name
          )
        )
      `)

      .order('priority', {

        ascending: false,

      })

    if (error) {

      toast.error(error.message)

      setLoading(false)

      return

    }

    const rows: CampaignRow[] =

      (data ?? []).map((item: any) => ({
    
        id: item.id,
    
        campaign_name: item.campaign_name,
    
        campaign_type: item.campaign_type,
    
        image_url: item.image_url,
    
        button_text: item.button_text,
    
        button_url: item.button_url,
    
        priority: item.priority,
    
        duration: item.duration,
    
        is_active: item.is_active,
    
        all_products: item.all_products,
    
        products:

          item.desktop_campaign_products?.map(
        
            (p:any)=>p.products?.name
        
          ) ?? [],
        
        product_ids:
        
          item.desktop_campaign_products?.map(
        
            (p:any)=>p.product_id
        
          ) ?? [],
    
      }))

    setCampaigns(rows)

    setLoading(false)

  }

  function openCreate() {

    setEditingId(null)

    setForm({
      ...defaultForm,
      product_ids: [],
    })

    setDialogOpen(true)

  }

  function openEdit(

    row: CampaignRow

  ) {

    setEditingId(row.id)

    setForm({

      campaign_name:

        row.campaign_name,

      campaign_type:

        'banner',

      image_url:

        row.image_url || '',

      button_text:

        row.button_text || '',

      button_url: row.button_url || '',

      priority:

        row.priority,

      duration:

        row.duration,

      all_products:

        row.all_products,

      product_ids: row.product_ids,

      is_active:

        row.is_active,

    })

    setDialogOpen(true)

  }
    async function saveCampaign() {

      if (!form.campaign_name.trim()) {
  
        toast.error('Campaign name is required.')
  
        return
  
      }
  
      if (!form.image_url.trim()) {
  
        toast.error('Campaign image is required.')
  
        return
  
      }
  
      setSaving(true)
  
      try {
  
        let campaignId = editingId
  
        if (editingId) {
  
          const { error } = await supabase
  
            .from('desktop_campaigns')
  
            .update({
  
              campaign_name: form.campaign_name,
  
              campaign_type: form.campaign_type,
  
              image_url: form.image_url,
  
              button_text: form.button_text || null,
  
              button_url: form.button_url || null,
  
              priority: form.priority,
  
              duration: form.duration,
  
              all_products: form.all_products,
  
              is_active: form.is_active,
  
              updated_at: new Date().toISOString(),
  
            })
  
            .eq('id', editingId)
  
          if (error) throw error
  
        }
  
        else {
  
          const { data, error } = await supabase
  
            .from('desktop_campaigns')
  
            .insert({
  
              campaign_name: form.campaign_name,
  
              campaign_type: form.campaign_type,
  
              image_url: form.image_url,
  
              button_text: form.button_text || null,
  
              button_url: form.button_url || null,
  
              priority: form.priority,
  
              duration: form.duration,
  
              all_products: form.all_products,
  
              is_active: form.is_active,
  
            })
  
            .select()
  
            .single()
  
          if (error) throw error
  
          campaignId = data.id
  
        }
  
        if (!campaignId)
  
          throw new Error('Campaign ID not found.')
  
        await supabase
  
          .from('desktop_campaign_products')
  
          .delete()
  
          .eq('campaign_id', campaignId)
  
        if (
  
          !form.all_products &&
  
          form.product_ids.length > 0
  
        ) {
  
          const rows = form.product_ids.map(
  
            product_id => ({
  
              campaign_id: campaignId,
  
              product_id,
  
            })
  
          )
  
          const { error } = await supabase
  
            .from('desktop_campaign_products')
  
            .insert(rows)
  
          if (error) throw error
  
        }
  
        toast.success(
  
          editingId
  
            ? 'Campaign updated.'
  
            : 'Campaign created.'
  
        )
  
        setDialogOpen(false)
  
        setEditingId(null)
  
        setForm({
          ...defaultForm,
          product_ids: [],
        })
  
        await loadCampaigns()
  
      }
  
      catch (err: any) {
  
        toast.error(
  
          err.message ||
  
          'Failed to save campaign.'
  
        )
  
      }
  
      finally {
  
        setSaving(false)
  
      }
  
    }
  
    async function deleteCampaign(
  
      row: CampaignRow
  
    ) {
  
      if (
  
        !confirm(
  
          `Delete "${row.campaign_name}" ?`
  
        )
  
      ) return
  
      const { error } = await supabase
  
        .from('desktop_campaigns')
  
        .delete()
  
        .eq('id', row.id)
  
      if (error) {
  
        toast.error(error.message)
  
        return
  
      }
  
      toast.success(
  
        'Campaign deleted.'
  
      )
  
      await loadCampaigns()
  
    }

      if (loading) {

    return (

      <div className="flex h-[400px] items-center justify-center">

        <Loader2 className="h-8 w-8 animate-spin" />

      </div>

    )

  }

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Campaign Manager

          </h1>

          <p className="text-muted-foreground">

            Manage marketing campaigns across all products.

          </p>

        </div>

        <Button onClick={openCreate}>

          <Plus className="mr-2 h-4 w-4" />

          New Campaign

        </Button>

      </div>

      <CampaignTable

        campaigns={campaigns}

        onEdit={openEdit}

        onDelete={deleteCampaign}

      />

      <CampaignDialog

        open={dialogOpen}

        saving={saving}

        value={form}

        onChange={setForm}

        onClose={() => {

          setDialogOpen(false)

          setEditingId(null)

          setForm({
            ...defaultForm,
            product_ids: [],
          })

        }}

        onSave={saveCampaign}

      />

    </div>

  )

}
