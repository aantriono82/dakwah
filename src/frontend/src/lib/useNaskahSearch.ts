import { useEffect, useState } from "react";
import type { Naskah, User } from "../types";
import { api } from "./utils";

export function useNaskahSearch(user: User | null, query: string) {
  const [items, setItems] = useState<Naskah[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    const timer = window.setTimeout(() => {
      api<{ data: Naskah[] }>(`/api/naskah?summary=1&page=1&pageSize=6&q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal
      })
        .then((data) => {
          if (!cancelled) setItems(data.data);
        })
        .catch(() => {
          if (!cancelled && !controller.signal.aborted) setItems([]);
        })
        .finally(() => {
          if (!cancelled && !controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, user]);

  return { items, loading };
}
