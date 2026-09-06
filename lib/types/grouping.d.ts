/**
 * Enumeration of model-facing MCP tools from the ToolRuntime schema list,
 * grouped by server namespace. The official bridge registers every MCP tool
 * under `mcp__<serverName>__<rawName>` (normalized deterministically), so a
 * prefix match against the configured server names is exact; leftover
 * `mcp__`-prefixed registrations from foreign plugins are preserved in
 * separate unconfigured groups instead of being mis-attributed or dropped.
 *
 * Pure functions of the schema snapshot — no registry reads.
 *
 * @module dsh-mcp-panel/grouping
 */
import type { McpToolView } from './wire.js';
/** The `mcp__` namespace prefix every bridged MCP tool name starts with. */
export declare const MCP_TOOL_PREFIX = "mcp__";
/** One tool group: a server namespace with its model-visible tools. */
export interface McpToolGroup {
    /** Server namespace (`mcp__<serverName>__…`); the best-effort segment for leftovers. */
    serverName: string;
    /** True when `serverName` is a configured mcp-client namespace. */
    configured: boolean;
    /** Model-visible tools under that namespace, sorted by public name. */
    tools: readonly McpToolView[];
}
/** The schema face this module reads; the ToolRuntime snapshot satisfies it. */
export interface ToolSchemaFace {
    /** Registered public tool name. */
    readonly name: string;
    /** One-line model-facing description; may be absent on hostile or partial input. */
    readonly description?: string;
}
/**
 * Split one registered tool schema list into per-server groups.
 *
 * @param schemas - the `ctx.tools.schemas()` snapshot (or any subset).
 * @param configuredNames - server namespaces from the loader's mcp-client rows.
 * @returns one group per configured namespace (even with zero tools) plus one
 *   group per unmatched `mcp__` namespace, sorted by server name.
 */
export declare function groupMcpTools(schemas: readonly ToolSchemaFace[], configuredNames: readonly string[]): McpToolGroup[];
/**
 * Count the tools registered under one configured server namespace.
 *
 * @param schemas - the `ctx.tools.schemas()` snapshot.
 * @param serverName - the configured namespace.
 * @returns the number of matching registrations.
 */
export declare function countServerTools(schemas: readonly ToolSchemaFace[], serverName: string): number;
//# sourceMappingURL=grouping.d.ts.map