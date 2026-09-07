const BASE = [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "form-action 'none'"
];

export function contentSecurityPolicy(isDevelopment: boolean): string {
  const scripts = isDevelopment
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const connections = isDevelopment ? "connect-src 'self' ws: wss:" : "connect-src 'none'";
  return [...BASE, connections, scripts].join("; ");
}
