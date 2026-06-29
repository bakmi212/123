'use client'

import { useEffect, useState } from "react";

export interface AppUpdate {
  version: string;
  title: string;
  description: string;
  release_url?: string;
}

export function useUpdateCheck(currentVersion: string) {
  const [update, setUpdate] = useState<AppUpdate | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkForUpdates() {
      try {
        const res = await fetch("/api/updates/latest", {
          cache: "no-store",
        });

        if (!res.ok) return;

        const json = await res.json();

        if (!mounted) return;

        if (
          json.success &&
          json.update &&
          json.update.version !== currentVersion
        ) {
          setUpdate(json.update);
        } else {
          setUpdate(null);
        }
      } catch (err) {
        console.error("Update check failed:", err);
      }
    }

    // cek saat aplikasi dibuka
    checkForUpdates();

    // cek ulang setiap 5 menit
    const interval = setInterval(
      checkForUpdates,
      5 * 60 * 1000
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentVersion]);

  return update;
}
