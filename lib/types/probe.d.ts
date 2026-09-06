/**
 * The optional `mcp_probe` tool: a one-shot connectivity probe of one
 * configured MCP server (streamable-http or stdio transport), executed as an
 * UNOWNED background job. Probe results are panel-only — the tool returns
 * just the job id and a pointer to the settings tab, the job carries no
 * owner (so no completion notice is injected into the model), and the panel
 * reads the sanitized snapshot back through `mcpPanel/status`.
 *
 * The stdio probe spawns the configured `command`/`args` with the same
 * `scrubbedParentEnv` base the mcp-client bridge uses (credential-shaped and
 * `DSH_*` names never leak into the child implicitly) plus the row's explicit
 * `env`/`cwd`, and completes one MCP `initialize` handshake over stdin/stdout.
 *
 * @module dsh-mcp-panel/probe
 */
import type { JobHooks, JobRegistry } from '@deepseek-ai/dsh-jobs';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { McpPanelService } from './service.js';
/** Producer kind; also the job-id prefix. */
export declare const PROBE_KIND = "mcp-probe";
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        /** One-shot connectivity probe (streamable-http or stdio; panel-only results). */
        'mcp-probe': 'mcp-probe';
    }
}
/** MCP clientInfo facts; protocol constants, not configuration. Exported so the
 * version-consistency tripwire (`tests/version.spec.ts`) can assert the
 * advertised version tracks the package version. */
export declare const PROBE_CLIENT_INFO: {
    name: string;
    version: string;
};
/** One settled probe: outcome status plus a sanitized one-line detail. */
export interface ProbeOutcome {
    /** How the job ended. */
    status: 'completed' | 'failed';
    /** Sanitized one-line detail (HTTP status, latency, server info, or error). */
    detail: string;
}
/** One configured server's probe spec: an HTTP endpoint or a stdio launch. */
export type ProbeTarget = {
    readonly kind: 'http';
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
} | {
    readonly kind: 'stdio';
    readonly command: string;
    readonly args: readonly string[];
    readonly env: Readonly<Record<string, string>>;
    readonly cwd?: string;
};
/**
 * POST one MCP `initialize` request and describe the outcome in one sanitized
 * line. Never sends or echoes credentials: the configured headers are used
 * for the request itself (exactly as the bridge would) and never rendered.
 *
 * @param url - endpoint URL (already parsed by the caller).
 * @param headers - the configured request headers; used, never displayed.
 * @param timeoutMs - probe deadline.
 * @param signal - caller-owned abort (job kill or timeout).
 * @returns the settled probe outcome.
 */
export declare function probeEndpoint(url: string, headers: Readonly<Record<string, string>>, timeoutMs: number, signal: AbortSignal): Promise<ProbeOutcome>;
/**
 * Complete one MCP `initialize` handshake over a spawned stdio server's
 * stdin/stdout and describe the outcome in one sanitized line. The child runs
 * under the same `scrubbedParentEnv` base the mcp-client bridge uses —
 * credential-shaped and `DSH_*` parent names never reach it implicitly — plus
 * the row's explicit `env` (merged after the scrub) and optional `cwd`. The
 * child's stderr is consumed and never rendered; the configured `command`/
 * `args` are launch facts, not display content, but any error is sanitized
 * before it lands in the outcome detail.
 *
 * @param target - resolved stdio launch spec.
 * @param timeoutMs - probe deadline.
 * @param signal - caller-owned abort (job kill or timeout).
 * @returns the settled probe outcome.
 */
export declare function probeStdio(target: Extract<ProbeTarget, {
    kind: 'stdio';
}>, timeoutMs: number, signal: AbortSignal): Promise<ProbeOutcome>;
/**
 * Create the background-job hooks for one probe: cancel aborts the fetch (or
 * the spawned child), the outcome settles `done` with sanitized detail only.
 *
 * @param target - resolved probe spec (http endpoint or stdio launch).
 * @param timeoutMs - probe deadline.
 * @returns the registry hooks.
 */
export declare function probeJob(target: ProbeTarget, timeoutMs: number): JobHooks;
/**
 * Build the `mcp_probe` tool definition.
 *
 * @param service - panel service (server lookup + snapshot for panel display).
 * @param jobs - background-job registry the probe runs on.
 * @param timeoutMs - per-probe deadline.
 * @returns the registration-ready definition.
 */
export declare function mcpProbeTool(service: McpPanelService, jobs: JobRegistry, timeoutMs: number): ToolDefinition;
//# sourceMappingURL=probe.d.ts.map