'use client'

import { useEffect, useState } from "react";

interface Update {
  version: string;
  title: string;
  description: string;
  release_url?: string;
}

interface Props {
  update: Update | null;
}

export default function UpdateNotification({
  update,
}: Props) {

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!update) return;

    const dismissed = localStorage.getItem(
      "dismiss_update"
    );

    if (dismissed === update.version) {
      setVisible(false);
      return;
    }

    setVisible(true);

  }, [update]);

  if (!update || !visible) {
    return null;
  }

  function handleLater() {
    localStorage.setItem(
      "dismiss_update",
      update.version
    );

    setVisible(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] rounded-xl border bg-white shadow-2xl p-6">

      <div className="flex items-center justify-between">

        <div>

          <h2 className="font-bold text-lg">

            🎉 Update Available

          </h2>

          <p className="text-sm text-gray-500">

            {update.version}

          </p>

        </div>

        <button
          onClick={handleLater}
          className="text-xl"
        >
          ✕
        </button>

      </div>

      <div className="mt-4">

        <h3 className="font-semibold">

          {update.title}

        </h3>

        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">

          {update.description}

        </p>

      </div>

      <div className="mt-6 flex gap-3">

        {update.release_url && (
          <a
            href={update.release_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white"
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

        <button
          onClick={handleLater}
          className="rounded-lg border px-4 py-2"
        >
          Later
        </button>

      </div>

    </div>
  );
}
