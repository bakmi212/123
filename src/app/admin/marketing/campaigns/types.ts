export type CampaignType =
  | 'banner'
  | 'popup'
  | 'announcement'
  | 'notification'

export interface Product {

  id: string

  name: string

  slug: string

  image_url: string | null

}

export interface Campaign {

  id: string

  campaign_name: string

  campaign_type: CampaignType

  image_url: string | null

  button_text: string | null

  button_url: string | null

  priority: number

  duration: number

  all_products: boolean

  is_active: boolean

  start_date: string | null

  end_date: string | null

  created_at: string

}

export interface CampaignProduct {

  campaign_id: string

  product_id: string

}
