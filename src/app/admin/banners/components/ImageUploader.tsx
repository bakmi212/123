'use client'

import { useRef, useState } from 'react'

import {

  Image as ImageIcon,

  Loader2,

  X,

} from 'lucide-react'

import { toast } from 'sonner'

import {

  uploadBannerImage,

  validateBannerImage,

} from '@/lib/supabase/storage'

interface Props {

  value: string

  onChange: (url: string) => void

}

export default function ImageUploader({

  value,

  onChange,

}: Props) {

  const inputRef =

    useRef<HTMLInputElement>(null)

  const [uploading, setUploading] =

    useState(false)

  async function handleUpload(

    e: React.ChangeEvent<HTMLInputElement>

  ) {

    const file = e.target.files?.[0]

    if (!file) return

    const validate =

      validateBannerImage(file)

    if (!validate.valid) {

      toast.error(validate.error)

      return

    }

    setUploading(true)

    const image =

      await uploadBannerImage(

        file,

        crypto.randomUUID()

      )

    setUploading(false)

    if (!image) {

      toast.error(

        'Upload failed.'

      )

      return

    }

    onChange(image)

    toast.success(

      'Image uploaded.'

    )

    if (inputRef.current)

      inputRef.current.value = ''

  }

  return (

    <div className="space-y-2">

      {

        value

        ?

        <div className="relative">

          <img

            src={value}

            className="h-56 w-full rounded-lg border object-cover"

          />

          <button

            type="button"

            className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white"

            onClick={()=>

              onChange('')

            }

          >

            <X className="h-4 w-4"/>

          </button>

        </div>

        :

        <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed">

          {

            uploading

            ?

            <Loader2 className="h-8 w-8 animate-spin"/>

            :

            <ImageIcon className="h-8 w-8"/>

          }

          <span className="mt-3 text-sm">

            {

              uploading

              ?

              'Uploading...'

              :

              'Click to upload banner'

            }

          </span>

          <input

            ref={inputRef}

            type="file"

            accept="image/*"

            className="hidden"

            onChange={handleUpload}

          />

        </label>

      }

    </div>

  )

}
