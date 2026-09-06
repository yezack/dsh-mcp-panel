/**
 * Plugin configuration and its explicit resolve step. `resolveConfig` re-judges
 * every default and bound so programmatic construction that bypasses
 * Schemastery normalization still fails loud instead of running with hidden
 * defaults (the explicit-resolve contract).
 *
 * @module dsh-mcp-panel/config
 */
import z from '@deepseek-ai/schemastery';
import type { CatalogEntry } from './catalog.js';
/** Default per-probe timeout in milliseconds. */
export declare const DEFAULT_PROBE_TIMEOUT_MS = 10000;
/** Ceiling for a single probe timeout: a probe is a one-shot HTTP call. */
export declare const MAX_PROBE_TIMEOUT_MS = 300000;
/** Default cap on probe records shown in the panel. */
export declare const DEFAULT_MAX_PROBES = 10;
/** Ceiling on the suggested panel refresh interval (1 hour). */
export declare const MAX_REFRESH_INTERVAL_MS = 3600000;
/** Languages the `/mcp` command renders in (mirrors the five-language READMEs). */
export type OutputLanguage = 'en' | 'zh' | 'es' | 'pt' | 'hi';
/**
 * Whether the tool trial console is enabled. The trial path runs MCP tools
 * through the official `ctx.tools.execute` pipeline, so permission policy,
 * guards, and approval stay in force exactly as for model calls.
 */
export declare const DEFAULT_TRIAL_ENABLED = true;
/** Default panel-side deadline for one trial tool call (ms). */
export declare const DEFAULT_TRIAL_TIMEOUT_MS = 120000;
/** Ceiling for one trial call: the tool may block on a remote server. */
export declare const MAX_TRIAL_TIMEOUT_MS = 600000;
/** Default cap on the trial result payload (chars of the JSON projection). */
export declare const DEFAULT_TRIAL_MAX_RESULT_CHARS = 60000;
/** Ceiling on the trial result payload. */
export declare const MAX_TRIAL_RESULT_CHARS = 500000;
/** Whether profile-patch writes are allowed at all (kill switch; default true). */
export declare const DEFAULT_WRITE_ENABLED = true;
/** Default number of `cordis.patch.yml` backups retained per write. */
export declare const DEFAULT_BACKUP_COUNT = 5;
/** Ceiling on retained backups. */
export declare const MAX_BACKUP_COUNT = 50;
/** Configuration for the MCP management console. */
export interface Config {
    /** Register the optional `mcp_probe` connectivity tool (default true). */
    probeEnabled?: boolean;
    /** Per-probe timeout in milliseconds (default 10000). */
    probeTimeoutMs?: number;
    /** Cap on probe records shown in the panel (default 10). */
    maxProbes?: number;
    /** Suggested panel refresh interval in ms; 0 = on demand only (default 0). */
    refreshIntervalMs?: number;
    /** Output language of the `/mcp` command (default en). */
    outputLanguage?: OutputLanguage;
    /** Periodically probe streamable-http servers in the background (default false). */
    passiveProbeEnabled?: boolean;
    /** Passive probe interval in milliseconds (default 60000). */
    passiveProbeIntervalMs?: number;
    /** Enable the tool trial console (settings tab + /mcp call). Default true. */
    trialEnabled?: boolean;
    /** Panel-side deadline for one trial tool call in ms (default 120000). */
    trialTimeoutMs?: number;
    /** Cap on the trial result payload in chars (default 60000). */
    trialMaxResultChars?: number;
    /** Whether profile-patch writes are allowed at all (kill switch). Default true. */
    writeEnabled?: boolean;
    /** Number of `cordis.patch.yml` backups retained per write (default 5). */
    backupCount?: number;
    /** User overlay for the recommended MCP server catalog: entries append to the built-in directory, and an entry with the same `id` replaces the built-in one. */
    catalogEntries?: CatalogEntry[];
}
/** Fully resolved configuration captured at plugin load. */
export interface ResolvedConfig {
    /** Whether the `mcp_probe` tool is registered. */
    probeEnabled: boolean;
    /** Per-probe timeout in milliseconds. */
    probeTimeoutMs: number;
    /** Cap on probe records shown in the panel. */
    maxProbes: number;
    /** Suggested panel refresh interval in ms (0 = on demand). */
    refreshIntervalMs: number;
    /** Output language of the `/mcp` command. */
    outputLanguage: OutputLanguage;
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
    /** User catalog overlay (validated; empty = built-in directory only). */
    catalogEntries: readonly CatalogEntry[];
}
/** Schemastery schema for loader-validated configuration. */
export declare const Config: z<Config>;
/**
 * Resolve raw config to the runtime policy, re-validating defaults and bounds.
 *
 * @param config - raw loader config; `undefined` for a bare row.
 * @returns the frozen resolved config.
 */
export declare function resolveConfig(config: Config | undefined): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map