/**
 * The console's wire vocabulary: the snapshot types served over the
 * `mcpPanel` Remote namespace, their zod v4 validation schema (the strict
 * codec both Typert faces carry), and the invocation descriptors shared
 * verbatim by the host `./typert` manifest (`src/typert.host.ts`) and the
 * client Remote contribution (`src/client/remote.ts`). One canonical source
 * for both faces keeps the host and client codecs from ever drifting apart.
 *
 * Values that could be large or heterogeneous (trial results) cross the wire
 * as single bounded JSON strings; every scalar here has an explicit shape.
 *
 * @module dsh-mcp-panel/wire
 */
import { z } from 'zod';
/** Transport recorded for one configured mcp-client row. */
export type McpTransport = 'stdio' | 'streamable-http' | 'unknown';
/** Cordis Fiber phases projected for display; `null` = no fiber observed. */
export type McpFiberPhase = 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null;
/** Connection phase from the upstream `mcp/status` seam, plus `unknown`. */
export type McpConnectionPhase = 'connecting' | 'connected' | 'waiting' | 'exhausted' | 'disposed' | 'unknown';
/** Provenance of the connection fields: upstream events or derived facts only. */
export type McpStatusSource = 'upstream-event' | 'derived';
/** One MCP tool's model-facing view (public name + one-line description). */
export interface McpToolView {
    /** Public tool name (`mcp__<server>__<raw>` or its deterministic normalized form). */
    name: string;
    /** Server-provided description; empty when absent. */
    description: string;
}
/**
 * Sanitized editing view of one row's config. Secret VALUES never appear:
 * env/header entries are exposed as KEYS only (the editor's "unchanged"
 * placeholder keeps the raw value host-side). The URL is credential-redacted
 * for display; editing semantics re-merge raw values host-side, so a redacted
 * value never round-trips.
 */
export interface McpServerConfigView {
    /** Effective namespace. */
    serverName: string;
    /** Declared transport; `unknown` when the row is malformed. */
    transport: McpTransport;
    /** stdio: the executable. */
    command: string | null;
    /** stdio: the argument list (display form). */
    args: readonly string[];
    /** stdio: working directory. */
    cwd: string | null;
    /** http: sanitized endpoint URL. */
    url: string | null;
    /** env keys present on the raw row (values never leave the host). */
    envKeys: readonly string[];
    /** header keys present on the raw row (values never leave the host). */
    headerKeys: readonly string[];
    /** Per-tool-call timeout ms, or null when unset. */
    toolCallTimeoutMs: number | null;
    /** failOnStartupError, or null when unset. */
    failOnStartupError: boolean | null;
    /** reconnect.enabled, or null when unset. */
    reconnectEnabled: boolean | null;
    /** reconnect.maxAttempts, or null when unset. */
    reconnectMaxAttempts: number | null;
}
/** One derived health suggestion (code = locale key, text = English fallback). */
export interface McpDiagnosticView {
    /** Localization code (`diag_<code>`). */
    code: string;
    /** English fallback text, always renderable. */
    text: string;
}
/** One MCP server's status view. */
export interface McpServerView {
    /** Stable namespace from plugin config. */
    serverName: string;
    /** Loader entry id carrying the mcp-client row. */
    entryId: string;
    /** Declared transport; `unknown` when the row is not an mcp-client row or is malformed. */
    transport: McpTransport;
    /** Display target: the command line (stdio) or the sanitized URL (streamable-http). */
    target: string;
    /** Effective loader disabled state (includes parent groups and `!!js` evaluation). */
    enabled: boolean;
    /** Cordis fiber phase of the row; `null` when no fiber exists. */
    fiberPhase: McpFiberPhase;
    /** Config-declared policy facts (reconnect budget, fail-fast, tool timeout); `null` = defaults. */
    configuredNote: string | null;
    /** Registered tools from `ctx.tools.schemas()` under `mcp__<server>__`. */
    toolCount: number;
    /** The model-visible tools; empty for a server with none registered. */
    tools: readonly McpToolView[];
    /** Connection phase; `unknown` when no upstream status was observed. */
    phase: McpConnectionPhase;
    /** Failed attempts in the current outage (upstream); `-1` when unknown. */
    attempt: number;
    /** Resolved reconnect budget (upstream); `-1` when unknown. */
    maxAttempts: number;
    /** Scheduled backoff delay while `waiting`; `null` otherwise or unknown. */
    delayMs: number | null;
    /** Reconnect attempts observed this process; `-1` when unknown. */
    reconnectCount: number;
    /** Most recent error, sanitized for display; `null` when none or unknown. */
    lastError: string | null;
    /** Epoch ms of the last successful connect (upstream); `null` otherwise or unknown. */
    connectedAt: number | null;
    /** Epoch ms when this process last received an upstream status event; `null` without one. */
    observedAt: number | null;
    /** Passive-probe reachability (`null` = probing disabled or never run). */
    probeState: 'reachable' | 'unreachable' | null;
    /** Epoch ms of the latest passive-probe settlement; `null` without one. */
    probeCheckedAt: number | null;
    /** Where the connection fields came from. */
    statusSource: McpStatusSource;
    /** Sanitized editing view of the row's config (`null` for leftover namespaces). */
    config: McpServerConfigView | null;
    /** Derived health suggestions (empty = nothing to suggest). */
    diagnostics: readonly McpDiagnosticView[];
    /** PROPOSED upstream: child exit code at failure; `null` = pending upstream support. */
    exitCode: number | null;
    /** PROPOSED upstream: sanitized stderr tail; `null` = pending upstream support. */
    stderrTail: string | null;
}
/** One background connectivity probe (panel-only; never model context). */
export interface McpProbeView {
    /** Background-job id (`mcp-probe-N`). */
    id: string;
    /** Server the probe targeted. */
    serverName: string;
    /** Job lifecycle state (`unknown` for registry states outside this panel's vocabulary). */
    status: 'running' | 'stopping' | 'completed' | 'killed' | 'failed' | 'unknown';
    /** Epoch ms when the probe started. */
    startedAt: number;
    /** Epoch ms when the probe settled; `null` while running. */
    finishedAt: number | null;
    /** Sanitized one-line detail (HTTP status, latency, server info, or error). */
    detail: string | null;
}
/** One bridged capability's availability (`false` = pending upstream support). */
export interface McpCapabilityView {
    /** Whether the upstream bridge exposes this capability today. */
    available: boolean;
}
/** One recommended MCP server catalog entry (non-secret display view). */
export interface McpCatalogEntryView {
    /** Stable slug, also the `serverName`. */
    id: string;
    /** Display name. */
    name: string;
    /** One-line description. */
    description: string;
    /** Declared transport. */
    transport: 'stdio' | 'streamable-http';
    /** stdio: executable. */
    command?: string;
    /** stdio: argument list. */
    args?: readonly string[];
    /** streamable-http: endpoint URL. */
    url?: string;
    /** Recommended env variable names (values are user-supplied, never shipped). */
    envKeys?: readonly string[];
    /** Recommended header names (values are user-supplied, never shipped). */
    headerKeys?: readonly string[];
    /** Discovery tags. */
    tags?: readonly string[];
}
/** One config layer kind the cross-layer inventory scans on disk. */
export type McpConfigLayerKind = 'profile-cordis' | 'profile-patch' | 'agent-preset';
/** One occurrence of an mcp-client row inside a scanned layer file. */
export interface McpConfigOccurrenceView {
    /** Loader entry id written in the layer file (e.g. `mcp-client-ida`). */
    entryId: string;
    /** Server namespace from the row config. */
    serverName: string;
    /** Which layer file this row lives in. */
    layer: McpConfigLayerKind;
    /** Human display of the layer (profile file name, or the agent-preset label). */
    layerLabel: string;
    /** Absolute file path that carries the row. */
    file: string;
    /** Effective disabled state at this occurrence; `null` = a `!!js` expression (never evaluated). */
    disabled: boolean | null;
    /** Whether the disabled fact is a `!!js` expression (`disabled` is then `null`). */
    disabledDynamic: boolean;
    /** Declared transport. */
    transport: McpTransport;
    /** Sanitized display target (stdio command line or redacted URL). */
    target: string;
}
/** One server namespace aggregated across every scanned layer. */
export interface McpConfigEntryView {
    /** Server namespace. */
    serverName: string;
    /** True when at least one occurrence is configured in this profile's own layer files. */
    profileVisible: boolean;
    /** True when a loader row for this namespace exists in the CURRENT snapshot. */
    effective: boolean;
    /** Every occurrence, ordered profile layer files first, then agent presets. */
    occurrences: readonly McpConfigOccurrenceView[];
}
/** The read-only cross-layer MCP config inventory (profile layer + agent presets). */
export interface McpConfigInventoryView {
    /** Whether a scan was possible (the profile directory was known). */
    scanned: boolean;
    /** Whole-scan failure detail; `null` when the scan ran or had nothing to scan. */
    error: string | null;
    /** Aggregated entries, sorted by server namespace. */
    entries: readonly McpConfigEntryView[];
}
/** The complete panel snapshot served by `mcpPanel/status`. */
export interface McpPanelSnapshot {
    /** True when the upstream `mcp/status` seam produced data this process. */
    observed: boolean;
    /** Absolute path of the profile patch layer that the CRUD console writes. */
    patchFile: string | null;
    /** Read-only cross-layer MCP config inventory (profile layer + agent presets). */
    configLayers: McpConfigInventoryView;
    /** Suggested panel refresh interval in ms; `0` = the tab refreshes on demand only. */
    refreshIntervalMs: number;
    /** One row per server namespace (configured rows first, leftover namespaces last). */
    servers: readonly McpServerView[];
    /** Connectivity probes this process, newest first. */
    probes: readonly McpProbeView[];
    /** Resources/Prompts availability (the official client exposes neither yet). */
    capabilities: {
        resources: McpCapabilityView;
        prompts: McpCapabilityView;
    };
    /** Trial console policy: enabled flag and panel-side limits. */
    trial: {
        enabled: boolean;
        timeoutMs: number;
        maxResultChars: number;
    };
    /** Whether profile-patch writes are allowed at all (kill switch). */
    writeEnabled: boolean;
    /** Recommended MCP server directory (built-in + user overlay). */
    catalog: readonly McpCatalogEntryView[];
}
/** Strict wire schema for {@link McpPanelSnapshot} (zod v4, both Typert faces). */
export declare const MCP_PANEL_SNAPSHOT_SCHEMA: z.ZodObject<{
    observed: z.ZodBoolean;
    patchFile: z.ZodNullable<z.ZodString>;
    configLayers: z.ZodObject<{
        scanned: z.ZodBoolean;
        error: z.ZodNullable<z.ZodString>;
        entries: z.ZodArray<z.ZodObject<{
            serverName: z.ZodString;
            profileVisible: z.ZodBoolean;
            effective: z.ZodBoolean;
            occurrences: z.ZodArray<z.ZodObject<{
                entryId: z.ZodString;
                serverName: z.ZodString;
                layer: z.ZodUnion<readonly [z.ZodLiteral<"profile-cordis">, z.ZodLiteral<"profile-patch">, z.ZodLiteral<"agent-preset">]>;
                layerLabel: z.ZodString;
                file: z.ZodString;
                disabled: z.ZodNullable<z.ZodBoolean>;
                disabledDynamic: z.ZodBoolean;
                transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                target: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    refreshIntervalMs: z.ZodNumber;
    servers: z.ZodArray<z.ZodObject<{
        serverName: z.ZodString;
        entryId: z.ZodString;
        transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
        target: z.ZodString;
        enabled: z.ZodBoolean;
        fiberPhase: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"loading">, z.ZodLiteral<"active">, z.ZodLiteral<"failed">, z.ZodLiteral<"unloading">, z.ZodNull]>;
        configuredNote: z.ZodNullable<z.ZodString>;
        toolCount: z.ZodNumber;
        tools: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
        }, z.core.$strip>>;
        phase: z.ZodUnion<readonly [z.ZodLiteral<"connecting">, z.ZodLiteral<"connected">, z.ZodLiteral<"waiting">, z.ZodLiteral<"exhausted">, z.ZodLiteral<"disposed">, z.ZodLiteral<"unknown">]>;
        attempt: z.ZodNumber;
        maxAttempts: z.ZodNumber;
        delayMs: z.ZodNullable<z.ZodNumber>;
        reconnectCount: z.ZodNumber;
        lastError: z.ZodNullable<z.ZodString>;
        connectedAt: z.ZodNullable<z.ZodNumber>;
        observedAt: z.ZodNullable<z.ZodNumber>;
        probeState: z.ZodUnion<readonly [z.ZodLiteral<"reachable">, z.ZodLiteral<"unreachable">, z.ZodNull]>;
        probeCheckedAt: z.ZodNullable<z.ZodNumber>;
        statusSource: z.ZodUnion<readonly [z.ZodLiteral<"upstream-event">, z.ZodLiteral<"derived">]>;
        config: z.ZodNullable<z.ZodObject<{
            serverName: z.ZodString;
            transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
            command: z.ZodNullable<z.ZodString>;
            args: z.ZodArray<z.ZodString>;
            cwd: z.ZodNullable<z.ZodString>;
            url: z.ZodNullable<z.ZodString>;
            envKeys: z.ZodArray<z.ZodString>;
            headerKeys: z.ZodArray<z.ZodString>;
            toolCallTimeoutMs: z.ZodNullable<z.ZodNumber>;
            failOnStartupError: z.ZodNullable<z.ZodBoolean>;
            reconnectEnabled: z.ZodNullable<z.ZodBoolean>;
            reconnectMaxAttempts: z.ZodNullable<z.ZodNumber>;
        }, z.core.$strip>>;
        diagnostics: z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            text: z.ZodString;
        }, z.core.$strip>>;
        exitCode: z.ZodNullable<z.ZodNumber>;
        stderrTail: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    probes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        serverName: z.ZodString;
        status: z.ZodUnion<readonly [z.ZodLiteral<"running">, z.ZodLiteral<"stopping">, z.ZodLiteral<"completed">, z.ZodLiteral<"killed">, z.ZodLiteral<"failed">, z.ZodLiteral<"unknown">]>;
        startedAt: z.ZodNumber;
        finishedAt: z.ZodNullable<z.ZodNumber>;
        detail: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>>;
    capabilities: z.ZodObject<{
        resources: z.ZodObject<{
            available: z.ZodBoolean;
        }, z.core.$strip>;
        prompts: z.ZodObject<{
            available: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>;
    trial: z.ZodObject<{
        enabled: z.ZodBoolean;
        timeoutMs: z.ZodNumber;
        maxResultChars: z.ZodNumber;
    }, z.core.$strip>;
    writeEnabled: z.ZodBoolean;
    catalog: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">]>;
        command: z.ZodOptional<z.ZodString>;
        args: z.ZodOptional<z.ZodArray<z.ZodString>>;
        url: z.ZodOptional<z.ZodString>;
        envKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        headerKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * The `mcpPanel/status` invocation descriptor, shared verbatim by the host
 * `TYPERT` manifest (`src/typert.host.ts`) and the client
 * `TypertRemoteContribution` (`src/client/remote.ts`). Hand-written in the
 * exact shape the Typert generator emits; validated by the typert loader and
 * the client registry at mount time.
 */
export declare const MCP_PANEL_STATUS_DESCRIPTOR: Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/status';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'status';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly never[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#McpPanelSnapshot";
        schema: z.ZodObject<{
            observed: z.ZodBoolean;
            patchFile: z.ZodNullable<z.ZodString>;
            configLayers: z.ZodObject<{
                scanned: z.ZodBoolean;
                error: z.ZodNullable<z.ZodString>;
                entries: z.ZodArray<z.ZodObject<{
                    serverName: z.ZodString;
                    profileVisible: z.ZodBoolean;
                    effective: z.ZodBoolean;
                    occurrences: z.ZodArray<z.ZodObject<{
                        entryId: z.ZodString;
                        serverName: z.ZodString;
                        layer: z.ZodUnion<readonly [z.ZodLiteral<"profile-cordis">, z.ZodLiteral<"profile-patch">, z.ZodLiteral<"agent-preset">]>;
                        layerLabel: z.ZodString;
                        file: z.ZodString;
                        disabled: z.ZodNullable<z.ZodBoolean>;
                        disabledDynamic: z.ZodBoolean;
                        transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                        target: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
            refreshIntervalMs: z.ZodNumber;
            servers: z.ZodArray<z.ZodObject<{
                serverName: z.ZodString;
                entryId: z.ZodString;
                transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                target: z.ZodString;
                enabled: z.ZodBoolean;
                fiberPhase: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"loading">, z.ZodLiteral<"active">, z.ZodLiteral<"failed">, z.ZodLiteral<"unloading">, z.ZodNull]>;
                configuredNote: z.ZodNullable<z.ZodString>;
                toolCount: z.ZodNumber;
                tools: z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    description: z.ZodString;
                }, z.core.$strip>>;
                phase: z.ZodUnion<readonly [z.ZodLiteral<"connecting">, z.ZodLiteral<"connected">, z.ZodLiteral<"waiting">, z.ZodLiteral<"exhausted">, z.ZodLiteral<"disposed">, z.ZodLiteral<"unknown">]>;
                attempt: z.ZodNumber;
                maxAttempts: z.ZodNumber;
                delayMs: z.ZodNullable<z.ZodNumber>;
                reconnectCount: z.ZodNumber;
                lastError: z.ZodNullable<z.ZodString>;
                connectedAt: z.ZodNullable<z.ZodNumber>;
                observedAt: z.ZodNullable<z.ZodNumber>;
                probeState: z.ZodUnion<readonly [z.ZodLiteral<"reachable">, z.ZodLiteral<"unreachable">, z.ZodNull]>;
                probeCheckedAt: z.ZodNullable<z.ZodNumber>;
                statusSource: z.ZodUnion<readonly [z.ZodLiteral<"upstream-event">, z.ZodLiteral<"derived">]>;
                config: z.ZodNullable<z.ZodObject<{
                    serverName: z.ZodString;
                    transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                    command: z.ZodNullable<z.ZodString>;
                    args: z.ZodArray<z.ZodString>;
                    cwd: z.ZodNullable<z.ZodString>;
                    url: z.ZodNullable<z.ZodString>;
                    envKeys: z.ZodArray<z.ZodString>;
                    headerKeys: z.ZodArray<z.ZodString>;
                    toolCallTimeoutMs: z.ZodNullable<z.ZodNumber>;
                    failOnStartupError: z.ZodNullable<z.ZodBoolean>;
                    reconnectEnabled: z.ZodNullable<z.ZodBoolean>;
                    reconnectMaxAttempts: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strip>>;
                diagnostics: z.ZodArray<z.ZodObject<{
                    code: z.ZodString;
                    text: z.ZodString;
                }, z.core.$strip>>;
                exitCode: z.ZodNullable<z.ZodNumber>;
                stderrTail: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            probes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                serverName: z.ZodString;
                status: z.ZodUnion<readonly [z.ZodLiteral<"running">, z.ZodLiteral<"stopping">, z.ZodLiteral<"completed">, z.ZodLiteral<"killed">, z.ZodLiteral<"failed">, z.ZodLiteral<"unknown">]>;
                startedAt: z.ZodNumber;
                finishedAt: z.ZodNullable<z.ZodNumber>;
                detail: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            capabilities: z.ZodObject<{
                resources: z.ZodObject<{
                    available: z.ZodBoolean;
                }, z.core.$strip>;
                prompts: z.ZodObject<{
                    available: z.ZodBoolean;
                }, z.core.$strip>;
            }, z.core.$strip>;
            trial: z.ZodObject<{
                enabled: z.ZodBoolean;
                timeoutMs: z.ZodNumber;
                maxResultChars: z.ZodNumber;
            }, z.core.$strip>;
            writeEnabled: z.ZodBoolean;
            catalog: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                description: z.ZodString;
                transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">]>;
                command: z.ZodOptional<z.ZodString>;
                args: z.ZodOptional<z.ZodArray<z.ZodString>>;
                url: z.ZodOptional<z.ZodString>;
                envKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
                headerKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
                tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>;
/** Result of the `mcpPanel/probe` invocation: a started panel-only probe. */
export interface ProbeStarted {
    /** Background-job id (`mcp-probe-N`). */
    jobId: string;
    /** Where the result lands: the settings tab, never model context. */
    note: string;
}
/** Strict wire schema for {@link ProbeStarted}. */
export declare const PROBE_STARTED_SCHEMA: z.ZodObject<{
    jobId: z.ZodString;
    note: z.ZodString;
}, z.core.$strip>;
/**
 * The `mcpPanel/probe` invocation descriptor: start a one-shot probe from the
 * settings panel (same background-job mechanics as the `mcp_probe` tool).
 */
export declare const MCP_PANEL_PROBE_DESCRIPTOR: Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/probe';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'probe';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#ProbeRequestServerName";
            schema: z.ZodString;
        }>;
    }>[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#ProbeStarted";
        schema: z.ZodObject<{
            jobId: z.ZodString;
            note: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>;
/** Result of `mcpPanel/previewPatch`: the generated fragment before any write. */
export interface PatchPreview {
    /** The generated YAML block (append-only operation). */
    fragment: string;
    /** Absolute target file, or null when the profile patch path is unknown. */
    file: string | null;
    /** Number of operations in the fragment (always 1). */
    ops: number;
}
/** Strict wire schema for {@link PatchPreview}. */
export declare const PATCH_PREVIEW_SCHEMA: z.ZodObject<{
    fragment: z.ZodString;
    file: z.ZodNullable<z.ZodString>;
    ops: z.ZodNumber;
}, z.core.$strip>;
/** The `mcpPanel/previewPatch` invocation descriptor: render one CRUD op. */
export declare const MCP_PANEL_PREVIEW_DESCRIPTOR: Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/previewPatch';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'previewPatch';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchOpJson";
            schema: z.ZodString;
        }>;
    }>[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#PatchPreview";
        schema: z.ZodObject<{
            fragment: z.ZodString;
            file: z.ZodNullable<z.ZodString>;
            ops: z.ZodNumber;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>;
/** Result of `mcpPanel/writePatch`: the applied append, with audit facts. */
export interface PatchWriteResult {
    /** Absolute file the fragment was appended to. */
    file: string;
    /** Absolute timestamped backup created before the append. */
    backupPath: string;
    /** Which approval path authorized the write. */
    approvalPath: 'harness-approval' | 'interactive-confirmation';
    /** Bytes appended. */
    bytes: number;
    /** Operations applied (always 1). */
    ops: number;
    /** What the user should do next (reload note). */
    note: string;
}
/** Strict wire schema for {@link PatchWriteResult}. */
export declare const PATCH_WRITE_RESULT_SCHEMA: z.ZodObject<{
    file: z.ZodString;
    backupPath: z.ZodString;
    approvalPath: z.ZodUnion<readonly [z.ZodLiteral<"harness-approval">, z.ZodLiteral<"interactive-confirmation">]>;
    bytes: z.ZodNumber;
    ops: z.ZodNumber;
    note: z.ZodString;
}, z.core.$strip>;
/** The `mcpPanel/writePatch` invocation descriptor: approval-gated append. */
export declare const MCP_PANEL_WRITE_DESCRIPTOR: Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/writePatch';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'writePatch';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly (Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchOpJson";
            schema: z.ZodString;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchWriteConfirmed";
            schema: z.ZodBoolean;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchWriteSessionId";
            schema: z.ZodString;
        }>;
        acceptsUndefined: true;
    }>)[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#PatchWriteResult";
        schema: z.ZodObject<{
            file: z.ZodString;
            backupPath: z.ZodString;
            approvalPath: z.ZodUnion<readonly [z.ZodLiteral<"harness-approval">, z.ZodLiteral<"interactive-confirmation">]>;
            bytes: z.ZodNumber;
            ops: z.ZodNumber;
            note: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>;
/** Result of `mcpPanel/callTool`: one trial call through the official pipeline. */
export interface McpTrialResultWire {
    /** Panel-assigned correlation id. */
    callId: string;
    /** Whether the pipeline settled the call as an error. */
    isError: boolean;
    /** Whether the JSON projection hit the display cap. */
    truncated: boolean;
    /** Wall-clock duration of the pipeline run in ms. */
    durationMs: number;
    /** Capped JSON of `{ value, content }` or `{ error, content }`. */
    resultJson: string;
}
/** Strict wire schema for {@link McpTrialResultWire}. */
export declare const MCP_TRIAL_RESULT_SCHEMA: z.ZodObject<{
    callId: z.ZodString;
    isError: z.ZodBoolean;
    truncated: z.ZodBoolean;
    durationMs: z.ZodNumber;
    resultJson: z.ZodString;
}, z.core.$strip>;
/** The `mcpPanel/callTool` invocation descriptor: official-pipeline trial call. */
export declare const MCP_PANEL_CALLTOOL_DESCRIPTOR: Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/callTool';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'callTool';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly (Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#TrialRequestJson";
            schema: z.ZodString;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#TrialSessionId";
            schema: z.ZodString;
        }>;
        acceptsUndefined: true;
    }>)[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#McpTrialResultWire";
        schema: z.ZodObject<{
            callId: z.ZodString;
            isError: z.ZodBoolean;
            truncated: z.ZodBoolean;
            durationMs: z.ZodNumber;
            resultJson: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>;
/**
 * The canonical invocation list both Typert faces register — the host
 * manifest and the client contribution share these exact descriptor objects,
 * so the two wire codecs can never drift apart.
 */
export declare const MCP_PANEL_INVOCATIONS: readonly (Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/status';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'status';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly never[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#McpPanelSnapshot";
        schema: z.ZodObject<{
            observed: z.ZodBoolean;
            patchFile: z.ZodNullable<z.ZodString>;
            configLayers: z.ZodObject<{
                scanned: z.ZodBoolean;
                error: z.ZodNullable<z.ZodString>;
                entries: z.ZodArray<z.ZodObject<{
                    serverName: z.ZodString;
                    profileVisible: z.ZodBoolean;
                    effective: z.ZodBoolean;
                    occurrences: z.ZodArray<z.ZodObject<{
                        entryId: z.ZodString;
                        serverName: z.ZodString;
                        layer: z.ZodUnion<readonly [z.ZodLiteral<"profile-cordis">, z.ZodLiteral<"profile-patch">, z.ZodLiteral<"agent-preset">]>;
                        layerLabel: z.ZodString;
                        file: z.ZodString;
                        disabled: z.ZodNullable<z.ZodBoolean>;
                        disabledDynamic: z.ZodBoolean;
                        transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                        target: z.ZodString;
                    }, z.core.$strip>>;
                }, z.core.$strip>>;
            }, z.core.$strip>;
            refreshIntervalMs: z.ZodNumber;
            servers: z.ZodArray<z.ZodObject<{
                serverName: z.ZodString;
                entryId: z.ZodString;
                transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                target: z.ZodString;
                enabled: z.ZodBoolean;
                fiberPhase: z.ZodUnion<readonly [z.ZodLiteral<"pending">, z.ZodLiteral<"loading">, z.ZodLiteral<"active">, z.ZodLiteral<"failed">, z.ZodLiteral<"unloading">, z.ZodNull]>;
                configuredNote: z.ZodNullable<z.ZodString>;
                toolCount: z.ZodNumber;
                tools: z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    description: z.ZodString;
                }, z.core.$strip>>;
                phase: z.ZodUnion<readonly [z.ZodLiteral<"connecting">, z.ZodLiteral<"connected">, z.ZodLiteral<"waiting">, z.ZodLiteral<"exhausted">, z.ZodLiteral<"disposed">, z.ZodLiteral<"unknown">]>;
                attempt: z.ZodNumber;
                maxAttempts: z.ZodNumber;
                delayMs: z.ZodNullable<z.ZodNumber>;
                reconnectCount: z.ZodNumber;
                lastError: z.ZodNullable<z.ZodString>;
                connectedAt: z.ZodNullable<z.ZodNumber>;
                observedAt: z.ZodNullable<z.ZodNumber>;
                probeState: z.ZodUnion<readonly [z.ZodLiteral<"reachable">, z.ZodLiteral<"unreachable">, z.ZodNull]>;
                probeCheckedAt: z.ZodNullable<z.ZodNumber>;
                statusSource: z.ZodUnion<readonly [z.ZodLiteral<"upstream-event">, z.ZodLiteral<"derived">]>;
                config: z.ZodNullable<z.ZodObject<{
                    serverName: z.ZodString;
                    transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">, z.ZodLiteral<"unknown">]>;
                    command: z.ZodNullable<z.ZodString>;
                    args: z.ZodArray<z.ZodString>;
                    cwd: z.ZodNullable<z.ZodString>;
                    url: z.ZodNullable<z.ZodString>;
                    envKeys: z.ZodArray<z.ZodString>;
                    headerKeys: z.ZodArray<z.ZodString>;
                    toolCallTimeoutMs: z.ZodNullable<z.ZodNumber>;
                    failOnStartupError: z.ZodNullable<z.ZodBoolean>;
                    reconnectEnabled: z.ZodNullable<z.ZodBoolean>;
                    reconnectMaxAttempts: z.ZodNullable<z.ZodNumber>;
                }, z.core.$strip>>;
                diagnostics: z.ZodArray<z.ZodObject<{
                    code: z.ZodString;
                    text: z.ZodString;
                }, z.core.$strip>>;
                exitCode: z.ZodNullable<z.ZodNumber>;
                stderrTail: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            probes: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                serverName: z.ZodString;
                status: z.ZodUnion<readonly [z.ZodLiteral<"running">, z.ZodLiteral<"stopping">, z.ZodLiteral<"completed">, z.ZodLiteral<"killed">, z.ZodLiteral<"failed">, z.ZodLiteral<"unknown">]>;
                startedAt: z.ZodNumber;
                finishedAt: z.ZodNullable<z.ZodNumber>;
                detail: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
            capabilities: z.ZodObject<{
                resources: z.ZodObject<{
                    available: z.ZodBoolean;
                }, z.core.$strip>;
                prompts: z.ZodObject<{
                    available: z.ZodBoolean;
                }, z.core.$strip>;
            }, z.core.$strip>;
            trial: z.ZodObject<{
                enabled: z.ZodBoolean;
                timeoutMs: z.ZodNumber;
                maxResultChars: z.ZodNumber;
            }, z.core.$strip>;
            writeEnabled: z.ZodBoolean;
            catalog: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                description: z.ZodString;
                transport: z.ZodUnion<readonly [z.ZodLiteral<"stdio">, z.ZodLiteral<"streamable-http">]>;
                command: z.ZodOptional<z.ZodString>;
                args: z.ZodOptional<z.ZodArray<z.ZodString>>;
                url: z.ZodOptional<z.ZodString>;
                envKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
                headerKeys: z.ZodOptional<z.ZodArray<z.ZodString>>;
                tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}> | Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/probe';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'probe';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#ProbeRequestServerName";
            schema: z.ZodString;
        }>;
    }>[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#ProbeStarted";
        schema: z.ZodObject<{
            jobId: z.ZodString;
            note: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}> | Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/previewPatch';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'previewPatch';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchOpJson";
            schema: z.ZodString;
        }>;
    }>[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#PatchPreview";
        schema: z.ZodObject<{
            fragment: z.ZodString;
            file: z.ZodNullable<z.ZodString>;
            ops: z.ZodNumber;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}> | Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/writePatch';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'writePatch';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly (Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchOpJson";
            schema: z.ZodString;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchWriteConfirmed";
            schema: z.ZodBoolean;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchWriteSessionId";
            schema: z.ZodString;
        }>;
        acceptsUndefined: true;
    }>)[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#PatchWriteResult";
        schema: z.ZodObject<{
            file: z.ZodString;
            backupPath: z.ZodString;
            approvalPath: z.ZodUnion<readonly [z.ZodLiteral<"harness-approval">, z.ZodLiteral<"interactive-confirmation">]>;
            bytes: z.ZodNumber;
            ops: z.ZodNumber;
            note: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}> | Readonly<{
    readonly id: 'dsh-mcp-panel#mcpPanel/callTool';
    readonly service: 'mcpPanel';
    readonly namespace: 'mcpPanel';
    readonly method: 'callTool';
    readonly invocation: Readonly<{
        kind: "direct";
    }>;
    readonly parameters: readonly (Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#TrialRequestJson";
            schema: z.ZodString;
        }>;
    }> | Readonly<{
        name: string;
        wire: string;
        source: "json";
        codec: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#TrialSessionId";
            schema: z.ZodString;
        }>;
        acceptsUndefined: true;
    }>)[];
    readonly result: Readonly<{
        mode: "strict";
        typeSymbol: "dsh-mcp-panel/types#McpTrialResultWire";
        schema: z.ZodObject<{
            callId: z.ZodString;
            isError: z.ZodBoolean;
            truncated: z.ZodBoolean;
            durationMs: z.ZodNumber;
            resultJson: z.ZodString;
        }, z.core.$strip>;
    }>;
    readonly sourceLocation: Readonly<{
        file: "src/wire.ts";
        line: 1;
        column: 1;
    }>;
}>)[];
//# sourceMappingURL=wire.d.ts.map