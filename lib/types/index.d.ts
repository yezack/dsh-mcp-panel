/**
 * `dsh-mcp-panel` — the MCP management console for the official DeepSeek
 * Harness MCP client (`@deepseek-ai/dsh-mcp-client`).
 *
 * The official client stays the ONLY bridge — one plugin instance per MCP
 * server in the profile's composition. This plugin is its experience layer:
 *
 * - the `mcpPanel` Remote service: status snapshot (loader rows + tool
 *   registry + the shipped upstream `mcp/status` seam), plus the console
 *   actions `previewPatch` / `writePatch` (append-only profile-patch CRUD
 *   with approval gate + automatic backups) and `callTool` (a tool trial
 *   through the OFFICIAL `ctx.tools.execute` pipeline, so permission policy
 *   and approval stay in force);
 * - the `/mcp` command where a command registry exists (status, tools,
 *   health diagnostics, patch suggestions, and pipeline trial calls);
 * - the optional `mcp_probe` background-job tool where a job registry exists;
 * - the browser half: an "MCP" tab in Settings → Plugins with server CRUD,
 *   the tool trial console, health diagnostics, and probes.
 *
 * Hard boundaries kept intact: configured env/header VALUES never enter a
 * snapshot; generated patches contain no `!!js` expressions; writes are
 * append-only and always backed up; the panel never fabricates connection
 * state; the panel injects NO prompt sections (tool descriptions only, in
 * the official client's minimal style).
 *
 * Function plugin — no default export (the Loader unwraps
 * `exports.default ?? exports`).
 *
 * @module dsh-mcp-panel
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.js';
export declare const name = "mcp-panel";
/** Hard services: the facts the console reads. `commands`/`jobs` are optional children. */
export declare const inject: string[];
export { Config, resolveConfig } from './config.js';
export { McpPanelService } from './service.js';
export { mcpCommand, parseMcpArgs, renderList, renderPatchSuggestion, renderServer, renderTools, renderTrialCall, renderHealth } from './command.js';
export { groupMcpTools, countServerTools } from './grouping.js';
export { aggregateServerView, aggregateSnapshot, configViewOf, deriveTarget, serverNameOf } from './aggregate.js';
export { sanitizeError, sanitizeText, sanitizeUrl } from './sanitize.js';
export { diagnoseServer, type McpDiagnostic, type McpSuggestionCode, type McpHealthFacts } from './diagnostics.js';
export { probeEndpoint, probeJob, mcpProbeTool } from './probe.js';
export { validateServerConfig, mergeServerConfig, renderPatchFragment, resolvePatchOp, nextEntryId, defaultEntryId, yamlScalar, type McpServerConfigInput, type McpPatchOp, type McpPatchResolution, } from './patch.js';
export { appendPatchFragment } from './write.js';
export { createTrialCaller, validateTrialRequest, type McpTrialRequest, type McpTrialResult } from './trial.js';
export { MCP_STATUS_EVENT, type McpStatusPayload, type McpStatusQuery, type McpServerStatus } from './upstream.js';
export { DEFAULT_CATALOG, CATALOG_SCHEMA, mergeCatalog, catalogToConfigInput, catalogIssues, catalogOverlayIssues } from './catalog.js';
export type { CatalogEntry, CatalogIssue } from './catalog.js';
export { exportMcpConfigs, parseMcpConfigsImport, MCP_CONFIG_EXPORT_SCHEMA } from './config-io.js';
export type { McpConfigExportRow, McpConfigImportRow } from './config-io.js';
export type * from './wire.js';
/**
 * Mount the console: the snapshot/action service, the upstream status seam
 * consumer, the `/mcp` command (when commands exist), and the probe tool
 * (when enabled and a job registry exists).
 *
 * @param ctx - context carrying tools + loader.
 * @param config - raw loader config; defaults applied through {@link resolveConfig}.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map