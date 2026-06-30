'use client'

import { useRef, useState } from 'react'

import {

  Loader2,

  Image as ImageIcon,

  X

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

  const fileInputRef =

    useRef<HTMLInputElement>(null)

  const [uploading, setUploading] =

    useState(false)

  async function upload(

    e: React.ChangeEvent<HTMLInputElement>

  ) {

    const file =

      e.target.files?.[0]

    if (!file)

      return

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

      toast.error('Upload failed')

      return

    }

    onChange(image)

    toast.success(

      'Image uploaded.'

    )

    if (fileInputRef.current)

      fileInputRef.current.value = ''

  }

  function remove() {

    onChange('')

  }

  return (

    <div className="space-y-3">

      {

        value

        ?

        <div className="relative">

          <img

            src={value}

            alt="Banner"

            className="h-52 w-full rounded-xl border object-cover"

          />

          <button

            type="button"

            onClick={remove}

            className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"

          >

            <X className="h-4 w-4"/>

          </button>

        </div>

        :

        <label

          className="flex h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed"

        >

          {

            uploading

            ?

            <Loader2 className="h-8 w-8 animate-spin"/>

            :

            <ImageIcon className="h-8 w-8"/>

          }

          <div className="mt-4 text-sm">

            {

              uploading

              ?

              'Uploading image...'

              :

              'Click to upload campaign banner'

            }

          </div>

          <input

            ref={fileInputRef}

            type="file"

            accept="image/jpeg,image/png,image/webp"

            className="hidden"

            onChange={upload}

          />

        </label>

      }

    </div>

  )

}
