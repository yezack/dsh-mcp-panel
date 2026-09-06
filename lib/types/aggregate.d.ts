/**
 * Status aggregation: assemble the read-only server views from the three
 * facts the panel is allowed to read — loader rows (config, effective
 * disabled, fiber phase), the tool-registry snapshot, and upstream
 * `mcp/status` observations (when the proposed seam exists).
 *
 * Every field is read defensively: loader configs are raw serialized data
 * (possibly `!!js` expressions, wrong types, or absent), and upstream
 * payloads may lack optional fields. A malformed or missing field degrades
 * to an explicit default instead of throwing — the aggregation must never
 * take down the panel over one broken row.
 *
 * Pure: statuses and reconnect counters are passed in as snapshots.
 *
 * @module dsh-mcp-panel/aggregate
 */
import { type McpToolGroup } from './grouping.js';
import type { McpServerStatus } from './upstream.js';
import type { McpFiberPhase, McpPanelSnapshot, McpServerConfigView, McpServerView, McpTransport } from './wire.js';
/** One loader-derived mcp-client row (config is raw serialized data). */
export interface McpLoaderRow {
    /** Loader entry id (the patch row id). */
    entryId: string;
    /** Effective disabled state (parent groups and `!!js` already resolved by the Loader). */
    disabled: boolean;
    /** Fiber phase; null when the row has no fiber. */
    fiberPhase: McpFiberPhase;
    /** Raw `config` from the entry options; may be anything. */
    config: unknown;
}
/** The exact module name of the official MCP client bridge. */
export declare const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
/** Marker shown for a `!!js` config value, which the panel never evaluates. */
export declare const JS_EXPRESSION_MARKER = "<expression>";
/** Sentinel values for "not observed" numeric fields. */
export declare const UNKNOWN_COUNT = -1;
/** One server namespace → its upstream observation and derived totals. */
export interface McpStatusFacts {
    /** Latest upstream payload per server; absent = not observed. */
    statuses: ReadonlyMap<string, McpServerStatus>;
    /** Cumulative reconnect attempts observed per server. */
    reconnects: ReadonlyMap<string, number>;
    /** Epoch ms of the latest upstream event receipt per server. */
    observedAt: ReadonlyMap<string, number>;
    /** Passive-probe reachability facts per server (empty when probing is off). */
    probeStates: ReadonlyMap<string, {
        state: 'reachable' | 'unreachable';
        checkedAt: number;
    }>;
}
/** Transport and display target derived from one raw mcp-client config. */
export declare function deriveTarget(config: unknown): {
    transport: McpTransport;
    target: string;
};
/** Read the server namespace from raw config; absent becomes a stable fallback. */
export declare function serverNameOf(config: unknown, fallback: string): string;
/**
 * Assemble the sanitized editing view of one row's config. Secret VALUES
 * never appear — env/header maps surface as key lists only, and the URL is
 * credential-redacted for display. Editing semantics re-merge raw values
 * host-side (`src/patch.ts`), so a redacted value never round-trips.
 *
 * @param config - the row's raw serialized config (never displayed).
 * @param fallbackName - stable namespace fallback for a malformed row.
 * @returns the display-only config view.
 */
export declare function configViewOf(config: unknown, fallbackName: string): McpServerConfigView;
/**
 * Assemble one server view from loader, registry, and upstream facts.
 * Missing upstream data degrades to `unknown`/`-1`/`null` — never fabricated.
 *
 * @param row - the mcp-client loader row, or `undefined` for leftover namespaces.
 * @param serverName - the effective namespace.
 * @param group - the tool group for this namespace (possibly empty).
 * @param facts - upstream observations and reconnect totals.
 * @returns the display-ready view.
 */
export declare function aggregateServerView(row: McpLoaderRow | undefined, serverName: string, group: McpToolGroup | undefined, facts: McpStatusFacts): McpServerView;
/** Inputs for {@link aggregateSnapshot}; grouped so callers never mix them up. */
export interface McpAggregateInput {
    /** Loader mcp-client rows (raw config included). */
    rows: readonly McpLoaderRow[];
    /** Tool groups from {@link groupMcpTools}. */
    groups: readonly McpToolGroup[];
    /** Upstream status facts (may be empty). */
    facts: McpStatusFacts;
    /** Background probe views (may be empty). */
    probes: McpPanelSnapshot['probes'];
    /** Absolute profile patch-layer path, or null. */
    patchFile: string | null;
    /** Read-only cross-layer MCP config inventory (profile layer + agent presets). */
    configLayers: McpPanelSnapshot['configLayers'];
    /** Suggested panel refresh interval in ms (`0` = on demand). */
    refreshIntervalMs: number;
    /** Resources/Prompts availability (feature-detected upstream catalog seam). */
    capabilities: McpPanelSnapshot['capabilities'];
    /** Trial console policy and limits. */
    trial: McpPanelSnapshot['trial'];
    /** Whether profile-patch writes are allowed at all. */
    writeEnabled: boolean;
    /** Recommended MCP server directory (built-in + user overlay). */
    catalog: McpPanelSnapshot['catalog'];
}
/**
 * Assemble the complete snapshot from loader rows, tool groups, upstream
 * facts, and probe rows. Tolerates missing fields anywhere in the inputs.
 *
 * @param input - the snapshot inputs (see {@link McpAggregateInput}).
 * @returns the wire snapshot.
 */
export declare function aggregateSnapshot(input: McpAggregateInput): McpPanelSnapshot;
//# sourceMappingURL=aggregate.d.ts.map