"use client";

/**
 * Thin fetch wrapper that understands the standard { success, data, error }
 * envelope and throws a readable Error for failures.
 */
export async function apiRequest(url, { method = "GET", body, signal } = {}) {
  const response = await fetch(url, {
    method,
    signal,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Unexpected server response (${response.status}).`);
  }

  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.error?.message || "Request failed.");
    error.code = payload?.error?.code || "REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload.data;
}
