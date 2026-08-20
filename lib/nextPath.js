/**
 * Only same-site absolute paths may be used as a post-login destination -
 * anything else (protocol-relative, absolute URLs, backslash tricks) is an
 * open-redirect risk and is discarded.
 */
export function safeNextPath(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
