/**
 * Pure presentation for the MCP settings tab: maps the wire snapshot onto
 * render-ready rows and badge codes. No I/O, no clock, no random — a session
 * replay or a test may call it any number of times and get the same result.
 * Localization happens in the component through the locale dictionaries;
 * this module emits stable codes only.
 *
 * @module dsh-mcp-panel/client/present
 */
import type { McpPanelSnapshot, McpServerView, McpProbeView } from '../wire.js';
/** Badge tones the stylesheet understands. */
export type BadgeTone = 'ok' | 'warn' | 'error' | 'muted';
/** Render-ready server row plus derived badge facts. */
export interface PresentedServerRow {
    /** The wire server view, unchanged. */
    readonly view: McpServerView;
    /** Badge tone for the connection state. */
    readonly tone: BadgeTone;
    /** Badge code: `disabled` | `failed` | a connection phase | `unknown`. */
    readonly badge: 'disabled' | 'failed' | 'connecting' | 'connected' | 'waiting' | 'exhausted' | 'disposed' | 'unknown';
    /** Whether the row shows an error badge (sanitized `lastError` present). */
    readonly hasError: boolean;
    /** Display form of the reconnect count (`-1` → null = dash). */
    readonly reconnects: number | null;
    /** Whole seconds since the last upstream event; `null` = never observed. */
    readonly ageSeconds: number | null;
    /** Whether the attempt/maxAttempts pair is displayable (either is known). */
    readonly hasAttemptBudget: boolean;
}
/** Render-ready probe row. */
export interface PresentedProbeRow {
    /** The wire probe view, unchanged. */
    readonly view: McpProbeView;
    /** Badge tone for the probe state. */
    readonly tone: BadgeTone;
    /** Badge code for the probe state. */
    readonly badge: 'running' | 'completed' | 'failed' | 'killed' | 'stopping' | 'unknown';
}
/** Counts for the panel summary line. */
export interface PanelSummary {
    /** Servers shown in the tab. */
    readonly total: number;
    /** Servers whose connection badge reads `connected`. */
    readonly connected: number;
    /** Servers whose connection badge reads `failed` or `exhausted`. */
    readonly errored: number;
}
/** The complete render-ready tab model. */
export interface PresentedMcpPanel {
    /** Servers in snapshot order. */
    readonly servers: readonly PresentedServerRow[];
    /** Probes in snapshot order (newest first). */
    readonly probes: readonly PresentedProbeRow[];
    /** Whether the snapshot carries any server rows. */
    readonly empty: boolean;
    /** Whether connection fields came from upstream or are derived. */
    readonly observed: boolean;
    /** Absolute profile patch-layer path for the hint line, or null. */
    readonly patchFile: string | null;
    /** Read-only cross-layer MCP config inventory (profile layer + agent presets). */
    readonly configLayers: McpPanelSnapshot['configLayers'];
    /** Suggested refresh interval in ms (`0` = on demand only). */
    readonly refreshIntervalMs: number;
    /** Resources/Prompts availability (feature-detected upstream catalog seam). */
    readonly capabilities: McpPanelSnapshot['capabilities'];
    /** Trial console policy and limits. */
    readonly trial: McpPanelSnapshot['trial'];
    /** Whether profile-patch writes are allowed at all. */
    readonly writeEnabled: boolean;
}
/**
 * Derive the connection badge for one server row. Order matters: the entry
 * being disabled or its fiber failed is a configuration fact that beats the
 * (derived or upstream) connection phase.
 *
 * @param view - the assembled server view.
 * @returns the badge code and tone.
 */
export declare function connectionBadge(view: McpServerView): {
    badge: PresentedServerRow['badge'];
    tone: BadgeTone;
};
/** Badge for one probe state. */
export declare function probeBadge(status: McpProbeView['status']): {
    badge: PresentedProbeRow['badge'];
    tone: BadgeTone;
};
/**
 * Project the wire snapshot onto render-ready rows.
 *
 * @param snapshot - the `mcpPanel/status` value.
 * @param now - epoch ms anchor for age computations (keeps the fold pure).
 * @returns the tab model.
 */
export declare function presentMcpPanel(snapshot: McpPanelSnapshot, now?: number): PresentedMcpPanel;
/**
 * Whether one inventory entry is already fully represented by the server
 * cards above (profile-visible AND effective). Entries that are not are the
 * ones the cross-layer inventory section must surface — preset-only rows and
 * profile rows the loader has not picked up (yet).
 *
 * @param entry - one aggregated cross-layer entry.
 * @returns true when the card list already shows this server namespace.
 */
export declare function coveredByServerCards(entry: McpPanelSnapshot['configLayers']['entries'][number]): boolean;
/**
 * Count the summary facts for the tab header line. Counting is derived from
 * the same badge codes the cards show, so the line can never disagree with
 * the rows beneath it.
 *
 * @param servers - the presented server rows (typically the filtered list).
 * @returns the summary counts.
 */
export declare function summarizePanel(servers: readonly PresentedServerRow[]): PanelSummary;
/**
 * Filter server rows by a case-insensitive substring match against the
 * server name or its display target. An empty query returns the rows
 * unchanged (stable identity, no copies).
 *
 * @param servers - the presented server rows.
 * @param query - the raw filter text.
 * @returns the matching rows.
 */
export declare function filterServers(servers: readonly PresentedServerRow[], query: string): readonly PresentedServerRow[];
//# sourceMappingURL=present.d.ts.map