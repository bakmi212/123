'use client'

import { useEffect, useState } from "react";

export function useUpdateCheck(currentVersion: string) {
  const [update, setUpdate] = useState<any>(null);

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/updates/latest");

      if (!res.ok) return;

      const json = await res.json();

      if (
        json.success &&
        json.update?.version &&
        json.update.version !== currentVersion
      ) {
        setUpdate(json.update);
      }
    }

    check();
  }, [currentVersion]);

  return update;
}
