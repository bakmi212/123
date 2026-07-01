'use client'

import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,

} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import ImageUploader from './ImageUploader'

import ProductSelector from './ProductSelector'

export interface CampaignForm {

  campaign_name: string

  campaign_type: 'banner'

  image_url: string

  button_text: string

  button_url: string

  priority: number

  duration: number

  all_products: boolean

  product_ids: string[]

  is_active: boolean

}

interface Props {

  open: boolean

  saving: boolean

  value: CampaignForm

  onClose: () => void

  onSave: () => void

  onChange: (value: CampaignForm) => void

}

export default function CampaignDialog({

  open,

  saving,

  value,

  onClose,

  onSave,

  onChange,

}: Props) {

  return (

    <Dialog

      open={open}

      onOpenChange={(v)=>{

        if(!v) onClose()

      }}

    >

      <DialogContent className="sm:max-w-2xl">

        <DialogHeader>

          <DialogTitle>

            Campaign

          </DialogTitle>

          <DialogDescription>

            Create or update desktop campaign.

          </DialogDescription>

        </DialogHeader>

        <div className="space-y-6">

          <ImageUploader

            value={value.image_url}

            onChange={(url)=>

              onChange({

                ...value,

                image_url:url

              })

            }

          />

          <div className="space-y-2">

            <Label>

              Campaign Name

            </Label>

            <Input

              value={value.campaign_name}

              onChange={(e)=>

                onChange({

                  ...value,

                  campaign_name:e.target.value

                })

              }

            />

          </div>

          <div className="space-y-2">

            <Label>

              Button Text

            </Label>

            <Input

              placeholder="Learn More"

              value={value.button_text}

              onChange={(e)=>

                onChange({

                  ...value,

                  button_text:e.target.value

                })

              }

            />

          </div>

          <div className="space-y-2">

            <Label>

              Button URL

            </Label>

            <Input

              placeholder="https://..."

              value={value.button_url}

              onChange={(e)=>

                onChange({

                  ...value,

                  button_url:e.target.value

                })

              }

            />

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label>

                Priority

              </Label>

              <Input

                type="number"

                value={value.priority}

                onChange={(e)=>

                  onChange({

                    ...value,

                    priority:Number(e.target.value)

                  })

                }

              />

            </div>

            <div className="space-y-2">

              <Label>

                Duration (seconds)

              </Label>

              <Input

                type="number"

                min={1}

                value={value.duration}

                onChange={(e)=>

                  onChange({

                    ...value,

                    duration:Number(e.target.value)

                  })

                }

              />

            </div>

          </div>

          <ProductSelector

            allProducts={value.all_products}

            selected={value.product_ids}

            onAllChange={(checked)=>

              onChange({

                ...value,

                all_products:checked,

                product_ids:

                  checked

                  ?

                  []

                  :

                  value.product_ids

              })

            }

            onChange={(ids)=>

              onChange({

                ...value,

                product_ids:ids

              })

            }

          />

          <div className="flex items-center gap-3">

            <input

              type="checkbox"

              checked={value.is_active}

              onChange={(e)=>

                onChange({

                  ...value,

                  is_active:e.target.checked

                })

              }

            />

            <Label>

              Active

            </Label>

          </div>

        </div>

        <DialogFooter>

          <Button

            variant="outline"

            onClick={onClose}

          >

            Cancel

          </Button>

          <Button

            disabled={saving}

            onClick={onSave}

          >

            Save Campaign

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  )

}
