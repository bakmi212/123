'use client'

import { useState } from "react";

interface Update {
  version: string;
  title: string;
  description: string;
  release_url?: string;
}

interface Props {
  update: Update | null;
}

export default function UpdateNotification({ update }: Props) {
  const [open, setOpen] = useState(true);

  if (!update || !open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] rounded-xl border bg-white shadow-2xl p-6">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="font-bold text-lg">
            🎉 New Update Available
          </h2>

          <p className="text-sm text-gray-500">
            Version {update.version}
          </p>

        </div>

        <button
          onClick={() => setOpen(false)}
          className="text-xl"
        >
          ✕
        </button>

      </div>

      <div className="mt-4 whitespace-pre-wrap text-sm">

        {update.description}

      </div>

      <div className="mt-6 flex gap-2">

        {update.release_url && (

          <a
            href={update.release_url}
            target="_blank"
            className="rounded-lg bg-indigo-600 text-white px-4 py-2"
          >
            View Release
          </a>

        )}

        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border px-4 py-2"
        >
          Refresh
        </button>

      </div>

    </div>
  );
}
