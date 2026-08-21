"use client";

import { useEffect, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/format";

/**
 * Renders the shared UTC formatting first - identical on server and client, so
 * hydration matches - then swaps to the viewer's own locale and time zone once
 * mounted, which only ever happens on the client.
 */
export default function LocalDate({ value, withTime = false }) {
  const [local, setLocal] = useState(null);

  useEffect(() => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return;
    setLocal(withTime ? date.toLocaleString() : date.toLocaleDateString());
  }, [value, withTime]);

  const fallback = withTime ? formatDateTime(value) : formatDate(value);
  return <time dateTime={new Date(value).toISOString()}>{local ?? fallback}</time>;
}
