/**
 * The `/mcp` human command over the official MCP client's observable facts.
 * Output is a standard `CommandResult` (model-readable, logged by the
 * commands service as `command/run` + `command/done`, so every line is
 * reconstructable from the session log).
 *
 * - `/mcp` — one row per server: transport, target, tool count, connection
 *   status (honest: `unknown` until the upstream seam ships), recent error,
 *   reconnect count.
 * - `/mcp <server>` — that server's row.
 * - `/mcp <server> tools` — model-visible tool names + one-line descriptions.
 * - `/mcp <server> disable|enable` — a controlled patch suggestion (the exact
 *   `cordis.patch.yml` line + the reload path). The command never edits
 *   configuration files and never fakes a runtime effect.
 *
 * Renderers are pure functions of the snapshot plus a message dictionary, so
 * the output language is a config choice (`outputLanguage: en|zh`) without
 * touching the command lifecycle.
 *
 * @module dsh-mcp-panel/command
 */
import type { CommandDefinition } from '@deepseek-ai/dsh-commands';
import type { McpPanelService } from './service.js';
import type { McpPanelSnapshot, McpServerView } from './wire.js';
/** Display language for the `/mcp` output. */
export type CommandLanguage = 'en' | 'zh' | 'es' | 'pt' | 'hi';
/** Every display string the renderers emit, per language. */
export interface CommandMessages {
    enabled: string;
    disabled: string;
    /** State marker for leftover `mcp__` namespaces with no configured row. */
    unconfigured: string;
    status: string;
    reconnects: string;
    lastError: string;
    retryIn: string;
    cordisFiberFailed: string;
    tools: string;
    serversHeader: (count: number) => string;
    noServers: string;
    noteNoSeam: string;
    noteProposal: string;
    noTools: (server: string) => string;
    toolsHeader: (server: string, count: number) => string;
    noDescription: string;
    patchIntro: (action: string, server: string, entryId: string, patchFile: string | null) => string;
    patchNoRuntimeToggle: string;
    patchReloadPath: string;
    /** Rejection for disable/enable on an unconfigured leftover namespace. */
    noPatchForLeftover: (server: string) => string;
    usage: string;
    /** Command input hint shown in the command UI. */
    hint: string;
    probeStarted: (server: string, jobId: string) => string;
    unknownServer: (server: string, known: string) => string;
    /** Header for the /mcp <server> health diagnostics block. */
    healthHeader: (server: string) => string;
    /** Shown when the health derivation found no known failure pattern. */
    healthNone: string;
    /** Marker for facts the official client does not expose yet. */
    healthPending: string;
    /** Label above the derived suggestion list. */
    suggestions: string;
    /** Malformed trial-call usage. */
    callUsage: string;
    /** One-line trial-call summary (tool, callId, duration, outcome). */
    callResult: (tool: string, callId: string, ms: number, outcome: string) => string;
    /** Header above the cross-layer inventory lines (rows not effective here). */
    inventoryHeader: string;
    /** One inventory line: a server namespace plus its layer/state occurrences. */
    inventoryEntry: (server: string, occurrences: string) => string;
}
/** English output dictionary (default). */
export declare const EN_MESSAGES: CommandMessages;
/** Simplified Chinese output dictionary. */
export declare const ZH_MESSAGES: CommandMessages;
/** Spanish output dictionary. */
export declare const ES_MESSAGES: CommandMessages;
/** Portuguese output dictionary. */
export declare const PT_MESSAGES: CommandMessages;
/** Hindi output dictionary. */
export declare const HI_MESSAGES: CommandMessages;
/**
 * Render one server row: `name [entryId] transport target | N tools | …`.
 *
 * @param view - the assembled server view.
 * @param messages - the output dictionary.
 * @returns the single display line.
 */
export declare function renderServer(view: McpServerView, messages?: CommandMessages): string;
/**
 * Render the no-argument listing.
 *
 * @param snapshot - the current snapshot.
 * @param messages - the output dictionary.
 * @returns the full listing text.
 */
export declare function renderList(snapshot: McpPanelSnapshot, messages?: CommandMessages): string;
/**
 * Render the cross-layer inventory lines: mcp-client rows that exist in the
 * profile layer or agent-preset layers but are NOT effective in the current
 * loader scope (so they are not listed above). Read-only description — the
 * command never edits other layers.
 *
 * @param snapshot - the current snapshot.
 * @param messages - the output dictionary.
 * @returns the inventory text, or '' when there is nothing extra.
 */
export declare function renderInventory(snapshot: McpPanelSnapshot, messages?: CommandMessages): string;
/**
 * Render the tool list for one server.
 *
 * @param view - the assembled server view.
 * @param messages - the output dictionary.
 * @returns the tool listing text.
 */
export declare function renderTools(view: McpServerView, messages?: CommandMessages): string;
/**
 * Render the controlled enable/disable patch suggestion. Reads only; the user
 * applies the line themselves. The web surface hot-reloads the profile patch
 * layer; other surfaces apply it on restart.
 *
 * @param view - the assembled server view.
 * @param action - which direction the suggestion flips.
 * @param patchFile - absolute profile patch-layer path, or null when unknown.
 * @param messages - the output dictionary.
 * @returns the suggestion text.
 */
export declare function renderPatchSuggestion(view: McpServerView, action: 'disable' | 'enable', patchFile: string | null, messages?: CommandMessages): string;
/** Parsed `/mcp` arguments. */
export type McpCommandArgs = {
    readonly kind: 'list';
} | {
    readonly kind: 'server';
    readonly server: string;
    readonly action: 'detail' | 'tools' | 'disable' | 'enable' | 'probe' | 'health';
} | {
    readonly kind: 'server';
    readonly server: string;
    readonly action: 'call';
    readonly tool: string;
    readonly argsJson: string;
} | {
    readonly kind: 'usage';
};
/**
 * Parse the free-form command input. For `call`, the tool name and the raw
 * JSON-argument remainder are captured verbatim (arguments may contain
 * whitespace), so the official pipeline receives exactly what the user wrote.
 *
 * @param rawInput - text after `/mcp`, including leading whitespace.
 * @returns the parsed intent; malformed input becomes `usage`.
 */
export declare function parseMcpArgs(rawInput: string): McpCommandArgs;
/** Render one trial result for model-readable command output (capped). */
export declare function renderTrialCall(tool: string, result: {
    readonly callId: string;
    readonly isError: boolean;
    readonly durationMs: number;
    readonly resultJson: string;
}, messages?: CommandMessages): string;
/** Render the health diagnostics block for one server. */
export declare function renderHealth(view: McpServerView, messages?: CommandMessages): string;
/**
 * Build the `/mcp` command definition over one service instance.
 *
 * @param service - the panel service supplying snapshots and console actions.
 * @param language - output language for the rendered text.
 * @returns the registration-ready definition.
 */
export declare function mcpCommand(service: McpPanelService, language?: CommandLanguage): CommandDefinition;
//# sourceMappingURL=command.d.ts.map