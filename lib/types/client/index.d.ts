/**
 * `dsh-mcp-panel`, browser half: mounts the `mcpPanel` Remote contribution,
 * then registers the MCP management console tab into the Plugins settings
 * section (`settings.plugins.tab`, id `mcp`). All data arrives through the
 * `remote.mcpPanel` namespace — the tab issues no other RPC and holds no
 * state of its own beyond expansion, the editor/trial forms, and the last
 * loaded snapshot. The current session id (for approval routing) is read
 * from the sessions store at call time.
 *
 * @module dsh-mcp-panel/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type McpPanelLocaleKey } from './locales.js';
export type { McpPanelTabInjected, McpPanelTabProps } from './McpPanelTab.js';
export type { McpPanelLocaleKey } from './locales.js';
export { presentMcpPanel, connectionBadge, probeBadge } from './present.js';
export type { PresentedMcpPanel, PresentedProbeRow, PresentedServerRow, BadgeTone } from './present.js';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** MCP management console copy. */
        'settings.mcpPanel': McpPanelLocaleKey;
    }
}
/** Dictionary namespace owned by this plugin. */
export declare const NS = "settings.mcpPanel";
/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export declare const name = "dsh-mcp-panel";
/** Services the console reads; `remote.mcpPanel` appears once this plugin mounts its contribution. */
export declare const inject: string[];
/**
 * Browser plugin body: dictionaries, the scoped stylesheet, the Remote
 * contribution mount, and the settings tab registration.
 *
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): Promise<void>;
//# sourceMappingURL=index.d.ts.map