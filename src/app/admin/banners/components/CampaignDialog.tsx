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
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-3xl">

        <DialogHeader className="border-b px-6 py-5">

          <DialogTitle>

            {value.campaign_name
              ? 'Edit Campaign'
              : 'New Campaign'}

          </DialogTitle>

          <DialogDescription>

            Configure a desktop marketing campaign.

          </DialogDescription>

        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">

          <ImageUploader
            value={value.image_url}
            onChange={(url) =>
              onChange({
                ...value,
                image_url: url,
              })
            }
          />

          <div className="space-y-2">

            <Label>

              Campaign Name

            </Label>

            <Input
              placeholder="Summer Promotion"
              value={value.campaign_name}
              onChange={(e) =>
                onChange({
                  ...value,
                  campaign_name: e.target.value,
                })
              }
            />

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label>

                Button Text

              </Label>

              <Input
                placeholder="Learn More"
                value={value.button_text}
                onChange={(e) =>
                  onChange({
                    ...value,
                    button_text: e.target.value,
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
                onChange={(e) =>
                  onChange({
                    ...value,
                    button_url: e.target.value,
                  })
                }
              />

            </div>

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label>

                Priority

              </Label>

              <Input
                type="number"
                value={value.priority}
                onChange={(e) =>
                  onChange({
                    ...value,
                    priority: Number(e.target.value),
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
                onChange={(e) =>
                  onChange({
                    ...value,
                    duration: Number(e.target.value),
                  })
                }
              />

            </div>

          </div>

          <div className="border-t pt-6">

            <h3 className="font-semibold">

              Distribution

            </h3>

            <p className="mb-4 text-sm text-muted-foreground">

              Select which products will display this campaign.

            </p>

            <ProductSelector
              allProducts={value.all_products}
              selected={value.product_ids}
              onAllChange={(checked) =>
                onChange({
                  ...value,
                  all_products: checked,
                  product_ids: checked
                    ? []
                    : value.product_ids,
                })
              }
              onChange={(ids) =>
                onChange({
                  ...value,
                  product_ids: ids,
                })
              }
            />

          </div>

          <div className="border-t pt-5">

            <label className="flex cursor-pointer items-center gap-3">

              <input
                type="checkbox"
                checked={value.is_active}
                onChange={(e) =>
                  onChange({
                    ...value,
                    is_active: e.target.checked,
                  })
                }
              />

              <div>

                <div className="font-medium">

                  Active Campaign

                </div>

                <div className="text-sm text-muted-foreground">

                  Users can see this campaign.

                </div>

              </div>

            </label>

          </div>

        </div>

        <DialogFooter className="border-t px-6 py-4">

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
            {saving
              ? 'Saving...'
              : 'Save Campaign'}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
