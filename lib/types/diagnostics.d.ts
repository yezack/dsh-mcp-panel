/**
 * Health-check suggestion mapping for the MCP console. Pure derivation from
 * observable facts — the upstream `mcp/status` error text (already sanitized),
 * the connection phase, the reconnect budget, and the cordis fiber phase.
 *
 * Honest boundaries, by design:
 * - The official client does not expose child-process exit codes or stderr
 *   tails yet; those fields are PROPOSED upstream (`exitCode`/`stderrTail` in
 *   `upstream.ts`, `docs/upstream-proposal.md` in deepseek-harness). Until
 *   upstream ships them the console labels them "pending upstream support"
 *   instead of inventing values.
 * - Every suggestion below is DERIVED from error-text patterns, so it is
 *   prefixed as a suggestion, never asserted as the failure cause.
 *
 * @module dsh-mcp-panel/diagnostics
 */
import type { McpFiberPhase, McpTransport } from './wire.js';
/** Stable suggestion codes; every surface localizes them by key. */
export type McpSuggestionCode = 'command-not-found' | 'command-spawn-failed' | 'connection-refused' | 'connection-dropped' | 'timeout' | 'dns' | 'auth-401' | 'auth-403' | 'path-404' | 'rate-limit' | 'permission' | 'reconnect-exhausted' | 'reconnect-waiting' | 'entry-failed';
/** One derived health suggestion. */
export interface McpDiagnostic {
    /** Localization code (locale keys `diag_<code>`). */
    code: McpSuggestionCode;
    /** English fallback text, always renderable. */
    text: string;
}
/** Observable facts the derivation reads. */
export interface McpHealthFacts {
    /** Sanitized last upstream error, or null. */
    lastError: string | null;
    /** Upstream connection phase. */
    phase: 'connecting' | 'connected' | 'waiting' | 'exhausted' | 'disposed' | 'unknown';
    /** Current outage attempt (-1 = unknown). */
    attempt: number;
    /** Reconnect budget (-1 = unknown). */
    maxAttempts: number;
    /** Cordis fiber phase of the row. */
    fiberPhase: McpFiberPhase;
    /** Declared transport. */
    transport: McpTransport;
    /** Passive-probe reachability (null = never probed). */
    probeState: 'reachable' | 'unreachable' | null;
    /** Whether the entry is effectively disabled. */
    enabled: boolean;
}
/**
 * Derive health suggestions from observable facts. Missing facts produce an
 * empty list, never a fabricated diagnosis; when a passive probe shows the
 * endpoint unreachable that fact is stated directly.
 *
 * @param facts - the observable facts (see {@link McpHealthFacts}).
 * @returns derived suggestions in deterministic order.
 */
export declare function diagnoseServer(facts: McpHealthFacts): McpDiagnostic[];
//# sourceMappingURL=diagnostics.d.ts.map