/**
 * Profile-patch fragment generation for the MCP server CRUD console.
 *
 * The console NEVER rewrites the profile's patch file: every edit is rendered
 * as one append-only loader patch OPERATION in the same vocabulary the
 * existing enable/disable suggestions use (`insert` for add, `set` for edit,
 * `set … disabled: true` for delete — the harness patch vocabulary has no
 * remove, so disabling a row IS the canonical removal). Appending keeps user
 * comments and unrelated rows byte-for-byte untouched; the Loader applies
 * later operations over earlier ones.
 *
 * Security rules enforced here:
 * - configured `env`/`headers` VALUES never enter a snapshot: the editor sees
 *   keys only, and `keepEnv`/`keepHeaders` lists make "unchanged" explicit —
 *   the host re-merges raw values from the row it already owns.
 * - generated fragments carry plain string values only: no `!!js` expression
 *   is ever synthesized (users hand-edit those afterwards if they want one).
 * - every config is validated against the official client's schema face
 *   before a fragment is rendered.
 *
 * Pure module: no I/O, no registry reads.
 *
 * @module dsh-mcp-panel/patch
 */
import { z } from 'zod';
import type { McpServerConfigView } from './wire.js';
/** The official bridge module every generated row names. */
export declare const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
/** Wire-shaped complete server config the editor submits (JSON only). */
export interface McpServerConfigInput {
    /** Stable local namespace for model-facing tool names. */
    serverName: string;
    /** Declared transport. */
    transport: 'stdio' | 'streamable-http';
    /** stdio: executable to spawn. */
    command?: string;
    /** stdio: arguments passed directly, without shell interpolation. */
    args?: string[];
    /** stdio: working directory for the child process. */
    cwd?: string;
    /** http: MCP endpoint URL. */
    url?: string;
    /** Per-tool-call timeout in milliseconds. */
    toolCallTimeoutMs?: number;
    /** Fail plugin activation when initial connect/sync fails. */
    failOnStartupError?: boolean;
    /** Whether automatic reconnect is enabled. */
    reconnectEnabled?: boolean;
    /** Consecutive failed attempts per outage before giving up. */
    reconnectMaxAttempts?: number;
    /** env entries to ADD or REPLACE (values are written literally). */
    env?: Record<string, string>;
    /** env keys whose raw values must be preserved from the existing row. */
    keepEnv?: string[];
    /** header entries to ADD or REPLACE (values are written literally). */
    headers?: Record<string, string>;
    /** header keys whose raw values must be preserved from the existing row. */
    keepHeaders?: string[];
}
/** One CRUD operation the console renders or writes. */
export type McpPatchOp = {
    readonly kind: 'add';
    readonly config: McpServerConfigInput;
} | {
    readonly kind: 'edit';
    readonly entryId: string;
    readonly config: McpServerConfigInput;
} | {
    readonly kind: 'disable';
    readonly entryId: string;
    readonly serverName: string;
} | {
    readonly kind: 'enable';
    readonly entryId: string;
};
/** One validation error, code + human text (client localizes the code). */
export interface McpConfigIssue {
    /** Stable error code (locale keys derive from it). */
    code: 'serverName-required' | 'serverName-format' | 'transport-required' | 'transport-unknown' | 'command-required' | 'url-required' | 'url-invalid' | 'timeout-invalid' | 'reconnect-invalid' | 'env-key-invalid' | 'header-key-invalid' | 'config-malformed';
    /** English explanation (fallback text on every surface). */
    text: string;
}
/** Validation outcome: the normalized config or the first issues. */
export type McpConfigValidation = {
    readonly ok: true;
    readonly config: McpServerConfigInput;
} | {
    readonly ok: false;
    readonly issues: readonly McpConfigIssue[];
};
/**
 * Validate one editor submission against the official client's config face.
 * Malformed input (wrong types) and contract violations return issue codes
 * instead of throwing — the editor renders them next to the offending field.
 *
 * @param input - raw JSON from the client (untrusted).
 * @returns the validation outcome.
 */
export declare function validateServerConfig(input: unknown): McpConfigValidation;
/**
 * Merge one editor submission over the existing row's RAW config for a `set`
 * patch. Non-secret fields that still equal the sanitized DISPLAY view are
 * "unchanged" and keep the raw value (so a redacted URL or credential-bearing
 * value never round-trips); changed fields take the editor's value. env and
 * headers merge key-wise: `keepEnv`/`keepHeaders` preserve raw values, listed
 * entries replace or add, and unlisted raw keys are DROPPED (deleted by the
 * user).
 *
 * @param raw - the row's serialized config (host-owned, never displayed).
 * @param input - the validated editor submission.
 * @param view - the sanitized display view the editor initialized from.
 * @returns the merged config ready for emission.
 */
export declare function mergeServerConfig(raw: unknown, input: McpServerConfigInput, view: McpServerConfigView): Record<string, unknown>;
/** Default entry id the console assigns to a new server row. */
export declare function defaultEntryId(serverName: string): string;
/** A fresh unique entry id for `add` given the ids already in the profile. */
export declare function nextEntryId(serverName: string, existingIds: ReadonlySet<string>): string;
/** Validated patch op resolved host-side against loader facts. */
export type ResolvedPatchOp = {
    readonly kind: 'add';
    readonly entryId: string;
    readonly rowConfig: Record<string, unknown>;
} | {
    readonly kind: 'edit';
    readonly entryId: string;
    readonly rowConfig: Record<string, unknown>;
} | {
    readonly kind: 'disable';
    readonly entryId: string;
} | {
    readonly kind: 'enable';
    readonly entryId: string;
};
/** Resolution outcome: one materialized op, or validation issues. */
export type McpPatchResolution = {
    readonly ok: true;
    readonly op: ResolvedPatchOp;
} | {
    readonly ok: false;
    readonly issues: readonly McpConfigIssue[];
};
/**
 * Resolve and validate one wire op into a fully materialized row config.
 *
 * @param op - the wire op (untrusted JSON from the client).
 * @param rawFor - loader rows' raw configs keyed by entry id (host-owned).
 * @param viewFor - the sanitized display views keyed by entry id.
 * @param existingIds - every entry id already in the profile.
 * @returns the resolved op, or validation issues.
 */
export declare function resolvePatchOp(op: unknown, rawFor: ReadonlyMap<string, unknown>, viewFor: ReadonlyMap<string, McpServerConfigView>, existingIds: ReadonlySet<string>): McpPatchResolution;
/** A one-line comment stamp marking a console-generated operation block. */
export declare function patchComment(op: ResolvedPatchOp, now?: Date): string;
/**
 * Emit one resolved op as a loader patch fragment (valid YAML, append-only).
 * Generated fragments never contain `!!js` expressions; values are plain
 * strings emitted with conservative quoting.
 *
 * @param op - the resolved operation.
 * @param now - timestamp anchor (tests pass a fixed date).
 * @returns the YAML fragment (no trailing newline; callers append one).
 */
export declare function renderPatchFragment(op: ResolvedPatchOp, now?: Date): string;
/**
 * Quote one string for YAML emission. Plain-safe scalars stay plain;
 * everything else is single-quoted (JSON double-quoting for control
 * characters). Ambiguous scalars (`true`, `1e3`, `-y`) are always quoted so
 * the round-trip keeps the string type.
 */
export declare function yamlScalar(value: string): string;
/** Schema used for structural (non-throwing) validation of wire fragments in tests. */
export declare const MCP_PATCH_FRAGMENT_SCHEMA: z.ZodString;
/** The one editor field list that may carry secrets; values never cross the wire. */
export declare const SECRET_MAP_KEYS: readonly ['env', 'headers'];
//# sourceMappingURL=patch.d.ts.map