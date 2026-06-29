'use client'

import { UseFormReturn } from 'react-hook-form'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import { Form } from '@/components/ui/form'

import { Product } from './types'
import { Loader2 } from 'lucide-react'

interface FormValues {
  product_id: string

  version: string
  title: string
  description: string

  type: 'Feature' | 'Improvement' | 'Bug Fix' | 'Security'

  status: 'Draft' | 'Published'

  published: boolean
}

interface UpdateFormDialogProps {
  open: boolean

  mode: 'create' | 'edit'

  title: string
  description: string

  form: UseFormReturn<FormValues>

  products: Product[]

  saving: boolean

  onOpenChange: (open: boolean) => void

  onSubmit: (values: FormValues) => void
}

export function UpdateFormDialog({
  open,
  mode,
  title,
  description,
  form,
  products,
  saving,
  onOpenChange,
  onSubmit,
}: UpdateFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">

        <DialogHeader>

          <DialogTitle>
            {title}
          </DialogTitle>

          <DialogDescription>
            {description}
          </DialogDescription>

        </DialogHeader>

        <Form {...form}>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >

            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
            
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
            
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem
                          key={product.id}
                          value={product.id}
                        >
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
            
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="version"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version</FormLabel>
            
                  <FormControl>
                    <Input
                      placeholder="v2.0.0"
                      {...field}
                    />
                  </FormControl>
            
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
            
                  <FormControl>
                    <Input
                      placeholder="New Feature"
                      {...field}
                    />
                  </FormControl>
            
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
            
                  <FormControl>
                    <Textarea
                      rows={6}
                      placeholder="Write update description..."
                      {...field}
                    />
                  </FormControl>
            
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
            
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
            
                      <SelectContent>
                        <SelectItem value="Feature">
                          🚀 Feature
                        </SelectItem>
            
                        <SelectItem value="Improvement">
                          ⚡ Improvement
                        </SelectItem>
            
                        <SelectItem value="Bug Fix">
                          🐞 Bug Fix
                        </SelectItem>
            
                        <SelectItem value="Security">
                          🔒 Security
                        </SelectItem>
                      </SelectContent>
                    </Select>
            
                    <FormMessage />
                  </FormItem>
                )}
              />
            
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
            
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
            
                      <SelectContent>
                        <SelectItem value="Draft">
                          Draft
                        </SelectItem>
            
                        <SelectItem value="Published">
                          Published
                        </SelectItem>
                      </SelectContent>
                    </Select>
            
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            </div>
            
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
            
                  <div>
                    <FormLabel>Publish</FormLabel>
            
                    <p className="text-sm text-muted-foreground">
                      Publish this update immediately.
                    </p>
                  </div>
            
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
            
                </FormItem>
              )}
            />
            <DialogFooter>

              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            
              <Button
                type="submit"
                disabled={saving}
              >
            
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
            
                {mode === 'create'
                  ? 'Create Update'
                  : 'Save Changes'}
            
              </Button>
            
            </DialogFooter>
            </form>

            </Form>
            
            </DialogContent>
            
            </Dialog>
            
              )
            }
