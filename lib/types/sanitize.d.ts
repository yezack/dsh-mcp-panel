/**
 * Display sanitization for MCP panel surfaces. Everything the panel shows —
 * the `/mcp` command output, the web settings tab, probe job details — passes
 * through these pure functions so URL query-string credentials, userinfo
 * passwords, header values, and bearer tokens never reach a display.
 *
 * The panel never shows configured `headers` at all (they are dropped at
 * snapshot assembly); this module redacts what can still leak through target
 * URLs and error text.
 *
 * @module dsh-mcp-panel/sanitize
 */
/** Replacement for every redacted credential value. */
export declare const REDACTED = "***";
/**
 * Redact a URL for display: userinfo password, credential query values, and
 * credential fragment pairs. Query keys are read through `URLSearchParams`,
 * so percent-encoded key names are decoded before matching. Unparseable
 * inputs fall back to pattern redaction (whole userinfo, credential query
 * pairs, credential fragment pairs) instead of throwing.
 *
 * @param url - candidate URL text.
 * @returns display-safe URL text.
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Redact credential-shaped fragments from free text: header lines, bearer
 * tokens, raw JWTs, embedded query pairs, and quoted token values.
 *
 * @param text - candidate display text.
 * @returns display-safe text.
 */
export declare function sanitizeText(text: string): string;
/**
 * Stringify an arbitrary thrown value safely and redact it for display.
 * Never throws: unrenderable values degrade to a fixed marker.
 *
 * @param error - thrown value from a connection attempt, probe, or sync.
 * @returns display-safe error text.
 */
export declare function sanitizeError(error: unknown): string;
//# sourceMappingURL=sanitize.d.ts.map