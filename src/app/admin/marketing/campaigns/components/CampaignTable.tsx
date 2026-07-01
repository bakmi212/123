'use client'

import {

  Edit,

  Trash2,

} from 'lucide-react'

import {

  Badge,

} from '@/components/ui/badge'

import {

  Button,

} from '@/components/ui/button'

export interface CampaignRow {

  id: string

  campaign_name: string

  campaign_type: string

  image_url: string

  button_text: string

  button_url: string

  priority: number

  duration: number

  is_active: boolean

  all_products: boolean

  products: string[]

  product_ids: string[]

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

  if (campaigns.length === 0) {

    return (

      <div className="rounded-lg border py-12 text-center text-muted-foreground">

        No campaigns found.

      </div>

    )

  }

  return (

    <div className="overflow-hidden rounded-lg border">

      <table className="w-full">

        <thead className="bg-muted/50">

          <tr>

            <th className="px-4 py-3 text-left">

              Banner

            </th>

            <th className="px-4 py-3 text-left">

              Campaign

            </th>

            <th className="px-4 py-3 text-left">

              Distribution

            </th>

            <th className="px-4 py-3 text-center">

              Priority

            </th>

            <th className="px-4 py-3 text-center">

              Duration

            </th>

            <th className="px-4 py-3 text-center">

              Status

            </th>

            <th className="px-4 py-3 text-center">

              Actions

            </th>

          </tr>

        </thead>

        <tbody>

          {

            campaigns.map(row => (

              <tr

                key={row.id}

                className="border-t"

              >

                <td className="px-4 py-4">

                  {

                    row.image_url

                    &&

                    <img

                      src={row.image_url}

                      className="h-20 w-36 rounded border object-cover"

                    />

                  }

                </td>

                <td className="px-4 py-4">

                  <div className="font-medium">

                    {row.campaign_name}

                  </div>

                  {

                    row.button_text && (

                      <div className="text-xs text-muted-foreground">

                        {row.button_text}

                      </div>

                    )

                  }

                </td>

                <td className="px-4 py-4">

                  {

                    row.all_products

                    ?

                    <Badge>

                      All Products

                    </Badge>

                    :

                    <div className="space-y-1">

                      {

                        row.products.map(

                          product => (

                            <Badge

                              key={product}

                              variant="secondary"

                              className="mr-1"

                            >

                              {product}

                            </Badge>

                          )

                        )

                      }

                    </div>

                  }

                </td>

                <td className="px-4 py-4 text-center">

                  {row.priority}

                </td>

                <td className="px-4 py-4 text-center">

                  {row.duration}s

                </td>

                <td className="px-4 py-4 text-center">

                  {

                    row.is_active

                    ?

                    <Badge>

                      Active

                    </Badge>

                    :

                    <Badge

                      variant="secondary"

                    >

                      Disabled

                    </Badge>

                  }

                </td>

                <td className="px-4 py-4">

                  <div className="flex justify-center gap-2">

                    <Button

                      size="sm"

                      variant="outline"

                      onClick={()=>

                        onEdit(row)

                      }

                    >

                      <Edit className="mr-1 h-3 w-3"/>

                      Edit

                    </Button>

                    <Button

                      size="sm"

                      variant="destructive"

                      onClick={()=>

                        onDelete(row)

                      }

                    >

                      <Trash2 className="mr-1 h-3 w-3"/>

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
