'use client'

import {

  Edit,

  Trash2,

  ImageOff

} from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'

export interface CampaignRow {

  id: string

  campaign_name: string

  campaign_type: string

  image_url: string | null

  button_text: string | null

  priority: number

  duration: number

  is_active: boolean

  all_products: boolean

  products: string[]

}

interface Props {

  campaigns: CampaignRow[]

  onEdit: (row: CampaignRow) => void

  onDelete: (row: CampaignRow) => void

}

export default function CampaignTable({

  campaigns,

  onEdit,

  onDelete,

}: Props) {

  return (

    <div className="overflow-x-auto rounded-xl border">

      <table className="w-full">

        <thead>

          <tr className="border-b bg-muted/40">

            <th className="px-4 py-3 text-left">

              Preview

            </th>

            <th className="px-4 py-3 text-left">

              Campaign

            </th>

            <th className="px-4 py-3 text-left">

              Products

            </th>

            <th className="px-4 py-3 text-center">

              Priority

            </th>

            <th className="px-4 py-3 text-center">

              Status

            </th>

            <th className="px-4 py-3 text-center">

              Action

            </th>

          </tr>

        </thead>

        <tbody>

          {

            campaigns.length === 0 && (

              <tr>

                <td

                  colSpan={6}

                  className="py-16 text-center text-muted-foreground"

                >

                  No campaigns yet.

                </td>

              </tr>

            )

          }

          {

            campaigns.map(campaign => (

              <tr

                key={campaign.id}

                className="border-b hover:bg-muted/30"

              >

                <td className="px-4 py-4">

                  {

                    campaign.image_url

                    ?

                    <img

                      src={campaign.image_url}

                      className="h-20 w-36 rounded-lg border object-cover"

                    />

                    :

                    <div className="flex h-20 w-36 items-center justify-center rounded-lg border">

                      <ImageOff className="h-6 w-6"/>

                    </div>

                  }

                </td>

                <td className="px-4">

                  <div className="font-semibold">

                    {campaign.campaign_name}

                  </div>

                  <div className="text-xs text-muted-foreground">

                    {campaign.button_text || '-'}

                  </div>

                </td>

                <td className="px-4">

                  {

                    campaign.all_products

                    ?

                    <Badge>

                      All Products

                    </Badge>

                    :

                    <div className="flex flex-wrap gap-1">

                      {

                        campaign.products.map(name=>(

                          <Badge

                            key={name}

                            variant="secondary"

                          >

                            {name}

                          </Badge>

                        ))

                      }

                    </div>

                  }

                </td>

                <td className="text-center">

                  {campaign.priority}

                </td>

                <td className="text-center">

                  {

                    campaign.is_active

                    ?

                    <Badge>

                      Active

                    </Badge>

                    :

                    <Badge variant="secondary">

                      Disabled

                    </Badge>

                  }

                </td>

                <td>

                  <div className="flex justify-center gap-2">

                    <Button

                      size="sm"

                      variant="outline"

                      onClick={()=>

                        onEdit(campaign)

                      }

                    >

                      <Edit className="mr-1 h-4 w-4"/>

                      Edit

                    </Button>

                    <Button

                      size="sm"

                      variant="destructive"

                      onClick={()=>

                        onDelete(campaign)

                      }

                    >

                      <Trash2 className="mr-1 h-4 w-4"/>

                      Delete

                    </Button>

                  </div>

                </td>

              </tr>

            ))

          }

        </tbody>

      </table>

    </div>

  )

}
