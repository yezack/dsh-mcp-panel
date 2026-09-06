/**
 * The console's host service: assembles the MCP snapshot and serves it under
 * the `mcpPanel` Typert Remote namespace (`mcpPanel/status`), plus the three
 * console actions — `previewPatch` (render a CRUD operation),
 * `writePatch` (approval-gated append to the profile patch layer, with
 * automatic backup), and `callTool` (a tool trial through the OFFICIAL
 * `ctx.tools.execute` pipeline) — and the panel probe action.
 *
 * Data sources, all read-only:
 * - `ctx.loader` — mcp-client rows (raw config, effective disabled, fiber phase).
 * - `ctx.tools.schemas()` / `ctx.tools.execute()` — registered `mcp__*` tools
 *   and the official execution pipeline (permission + approval + guards).
 * - the shipped upstream `mcp/status` seam — observed via {@link observe}.
 * - `ctx.jobs` — unowned `mcp-probe` background jobs (panel-only results).
 * - `ctx.approval` / `ctx.agents` — feature-detected approval routing.
 *
 * Connection status is reported honestly: without upstream observations the
 * view reads `unknown` with `statusSource: 'derived'`; the panel never infers
 * a connection state from tool-registry presence.
 *
 * Writes are APPEND-ONLY and never touch any file before the approval gate
 * passes; every write first copies the current patch layer to a timestamped
 * backup (see `src/write.ts`).
 *
 * @module dsh-mcp-panel/service
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type ProbeTarget } from './probe.js';
import type { McpServerStatus } from './upstream.js';
import type { McpCatalogEntryView, McpPanelSnapshot, McpTrialResultWire, PatchPreview, PatchWriteResult, ProbeStarted } from './wire.js';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** MCP management console snapshot + actions service (this package). */
        mcpPanel: McpPanelService;
    }
}
/** Service-level runtime settings; the plugin passes its resolved config in. */
export interface McpPanelServiceConfig {
    /** Per-probe timeout in milliseconds. */
    probeTimeoutMs: number;
    /** Cap on probe records shown in the panel. */
    maxProbes: number;
    /** Suggested panel refresh interval in ms (0 = on demand). */
    refreshIntervalMs: number;
    /** Whether the passive probe loop runs. */
    passiveProbeEnabled: boolean;
    /** Passive probe interval in milliseconds. */
    passiveProbeIntervalMs: number;
    /** Whether the tool trial console is enabled. */
    trialEnabled: boolean;
    /** Panel-side deadline for one trial tool call. */
    trialTimeoutMs: number;
    /** Cap on the trial result payload in chars. */
    trialMaxResultChars: number;
    /** Whether profile-patch writes are allowed at all. */
    writeEnabled: boolean;
    /** Number of patch backups retained per write. */
    backupCount: number;
    /** Merged recommended MCP server directory (built-in + user overlay). */
    catalog: readonly McpCatalogEntryView[];
}
/** MCP management console service, exported over the `mcpPanel` Remote namespace. */
export declare class McpPanelService extends TypertRemoteService {
    private readonly config;
    static inject: string[];
    /** Latest upstream payload per server namespace. */
    private readonly statuses;
    /** Cumulative reconnect attempts observed per server namespace. */
    private readonly reconnects;
    /**
     * Highest `attempt` already counted per server, so re-observing the same
     * payload (HMR remount, event + query seed of one transition) never double
     * counts a reconnect.
     */
    private readonly countedAttempts;
    /** Epoch ms of the latest upstream event receipt per server namespace. */
    private readonly observedAt;
    /** Latest passive-probe reachability per server namespace. */
    private readonly probeStates;
    /** The trial caller with this instance's own callId sequence. */
    private readonly trialCaller;
    /** Passive-probe loop guard: one sweep at a time. */
    private passiveRunning;
    /**
     * @param ctx - context carrying the loader and tool registry.
     * @param config - resolved runtime settings; defaults apply for direct construction.
     */
    constructor(ctx: Context, config?: McpPanelServiceConfig);
    /**
     * Record one upstream `mcp/status` payload (event or query-seed). Payloads
     * are validated before storage — they are unvalidated runtime data and a
     * malformed one must never poison the strict wire codec downstream. A
     * `connecting` payload with a strictly increasing attempt counts one
     * reconnect; re-observing the same payload never double counts.
     *
     * @param payload - post-transition status facts.
     */
    observe(payload: McpServerStatus): void;
    /**
     * Assemble the current snapshot. Read-only: touches no configuration file
     * and mutates no registry. Exported on the wire by the `mcpPanel/status`
     * invocation descriptor in `./wire.ts` (registered through the package's
     * `./typert` manifest) — no method decorator, so the built bundle stays
     * plain ESM.
     *
     * @returns the wire snapshot (validated by the strict Typert codec on both faces).
     */
    status(): McpPanelSnapshot;
    /**
     * Start a one-shot connectivity probe of one configured MCP server
     * (streamable-http or stdio) as an UNOWNED background job — panel-only,
     * like the `mcp_probe` tool, but callable from the settings tab. Exported
     * on the wire by the `mcpPanel/probe` invocation descriptor.
     *
     * @param serverName - configured namespace.
     * @returns the started job id and where the result lands.
     */
    probe(serverName: string): ProbeStarted;
    /**
     * Render one CRUD operation as its append-only patch fragment WITHOUT
     * touching any file. Exported by `mcpPanel/previewPatch`; the editor uses
     * it for the copy-to-clipboard path and the confirm review.
     *
     * @param opJson - JSON of the operation (add / edit / disable / enable).
     * @returns the fragment, the target file, and the operation count.
     */
    previewPatch(opJson: string): PatchPreview;
    /**
     * Append one CRUD operation to the profile patch layer, approval-gated.
     * Order: validate → resolve against loader facts → render → APPROVE →
     * backup → append. The approval gate:
     *
     * - when the harness approval service exists AND the caller's session has
     *   a live agent with an open turn, the write asks through
     *   `ctx.approval.request` — only `allowed-once` proceeds (rejection,
     *   cancellation, unavailability, and audit failures all fail closed);
     * - otherwise (settings-page writes happen outside turns) the explicit
     *   interactive confirmation is the approval channel, and the write
     *   proceeds only when the client's `confirmed` flag is true;
     * - `writeEnabled: false` rejects every write up front (kill switch).
     *
     * @param opJson - JSON of the operation.
     * @param confirmed - whether the human reviewed and confirmed in the UI.
     * @param sessionId - optional current session for approval routing.
     * @returns the applied write with audit facts.
     */
    writePatch(opJson: string, confirmed: boolean, sessionId: string | undefined): Promise<PatchWriteResult>;
    /**
     * Run one `mcp__*` tool through the OFFICIAL pipeline
     * (`ctx.tools.execute`): pre-execute permission policy, approval asks,
     * guards, the tool body, and post-execute all apply exactly as for model
     * calls. Exported by `mcpPanel/callTool`; results are panel-only and never
     * enter model context.
     *
     * @param requestJson - JSON of `{ serverName, toolName, argsJson }`.
     * @param sessionId - optional current session for approval routing.
     * @returns the capped trial result.
     */
    callTool(requestJson: string, sessionId: string | undefined): Promise<McpTrialResultWire>;
    /**
     * Export every configured MCP server as a versioned JSON document (backup or
     * share). A row whose config carries a `!!js` expression (not plain JSON)
     * exports as `{ config: null, reason }` — the expression is never evaluated.
     * @returns the pretty-printed JSON export.
     */
    exportConfigs(): string;
    /**
     * Parse an MCP config export into per-server append-only `add` patch
     * fragments WITHOUT touching any file. The client reviews the fragments and
     * confirms a write through the existing `writePatch` gate.
     * @param json - the export JSON text (untrusted).
     * @returns `{ entryId, fragment }` per imported server, in document order.
     */
    importPreview(json: string): Array<{
        entryId: string;
        fragment: string;
    }>;
    /** Resolve one wire op against the live loader facts. */
    private resolveOp;
    /** Render validation issues as one actionable error. */
    private issueError;
    /** One passive-probe sweep over every configured MCP server (both transports). */
    private runPassiveProbes;
    /**
     * Resolve one configured server's probe spec. Credentials stay inside the
     * returned value and are used for the probe only — they never reach a
     * snapshot, a log, or a display. Streamable-http rows yield their raw
     * endpoint + configured headers; stdio rows yield the launch spec
     * (`command`/`args`, explicit `env` merged after the scrub, optional
     * `cwd`) that the probe spawns.
     *
     * @param serverName - configured namespace.
     * @returns the transport-tagged probe spec, or `undefined` when the server
     *   is not a configured MCP row of either transport.
     */
    probeSpec(serverName: string): ProbeTarget | undefined;
    /**
     * Resolve one server's raw endpoint for the streamable-http probe path.
     * Credentials stay inside this return value and are used for the request
     * only — they never reach a snapshot, a log, or a display.
     *
     * @param serverName - configured namespace.
     * @returns the raw URL + configured headers, or `undefined` when the server
     *   is not a configured streamable-http row.
     */
    rawEndpoint(serverName: string): {
        url: string;
        headers: Record<string, string>;
    } | undefined;
    /** Unowned `mcp-probe` background jobs, newest first, sanitized for display. */
    private probeViews;
    /**
     * Absolute profile directory (the layer files the loader composes), or null.
     * Also the anchor for the cross-layer config inventory.
     */
    private profileDir;
    /** Absolute path of the profile patch layer the console writes, or null. */
    private patchFile;
}
export default McpPanelService;
//# sourceMappingURL=service.d.ts.map