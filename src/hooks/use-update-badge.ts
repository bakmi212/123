'use client'

import { useEffect, useState } from "react";

export function useUpdateBadge() {
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/updates/latest", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();

        if (!json.success) return;

        const latest = json.update.version;

        const seen = localStorage.getItem("last_seen_update");

        setHasNewUpdate(latest !== seen);

      } catch (err) {
        console.error(err);
      }
    }

    check();
  }, []);

  function markAsSeen(version: string) {
    localStorage.setItem(
      "last_seen_update",
      version
    );

    setHasNewUpdate(false);
  }

  return {
    hasNewUpdate,
    markAsSeen,
  };
}
