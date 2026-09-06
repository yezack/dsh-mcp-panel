/**
 * The tool trial console's host half: runs ONE registered `mcp__*` tool
 * through the OFFICIAL pipeline — `ctx.tools.execute()` — so permission
 * policy (`tools/pre-execute`), approval asks, guards, around-dispatch, and
 * post-execute all apply exactly as they do for model calls. The console is
 * a caller, not a bypass.
 *
 * Approval routing: the client may pass the current session id; the service
 * resolves the live agent through `ctx.agents` and forwards it as the
 * execution agent, so an `ask` decision routes to the web approval channel
 * during an open turn. Without an agent, the registry fails the ask closed
 * with its documented "no agent to route it through" denial — the trial
 * result shows that message verbatim.
 *
 * Results are capped (`maxResultChars`) and returned as a single JSON string
 * so the strict wire codec carries one bounded scalar; the client re-parses
 * and pretty-prints. Trial results never enter model context.
 *
 * @module dsh-mcp-panel/trial
 */
import type { ToolRuntime } from '@deepseek-ai/dsh-tools';
/** Wire result of one trial call (lossless-JSON scalar payload). */
export interface McpTrialResult {
    /** Panel-assigned correlation id (mirrors the callId on the execution). */
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
/** Live agent registry face the trial reads opportunistically. */
export interface McpAgentRegistryFace {
    get(id: string): unknown | undefined;
}
/** One trial request (decoded from the client's JSON). */
export interface McpTrialRequest {
    serverName: string;
    toolName: string;
    /** JSON text of the arguments (lossless by construction). */
    argsJson: string;
}
/** Panel-side limits for one trial call. */
export interface McpTrialLimits {
    /** Deadline for the whole pipeline run. */
    timeoutMs: number;
    /** Cap on the JSON projection in chars. */
    maxResultChars: number;
}
/**
 * Validate one trial request structurally; returns an English error string
 * or null. Never throws on untrusted input.
 *
 * @param request - decoded client JSON.
 * @returns an error message, or null when the shape is acceptable.
 */
export declare function validateTrialRequest(request: unknown): string | null;
/**
 * Create the trial caller: one callId sequence per service instance, so a
 * plugin reload never carries counter state across mounts.
 * @returns the trial caller bound to its own sequence.
 */
export declare function createTrialCaller(): {
    /**
     * Run one trial call through the official tool pipeline.
     *
     * @param tools - the registry the call executes through.
     * @param agents - optional live agent registry for approval routing.
     * @param sessionId - optional current session id from the client.
     * @param request - the validated trial request.
     * @param limits - panel-side deadline and result cap.
     * @returns the wire result.
     */
    runTrialCall(tools: ToolRuntime, agents: McpAgentRegistryFace | undefined, sessionId: string | undefined, request: McpTrialRequest, limits: McpTrialLimits): Promise<McpTrialResult>;
};
//# sourceMappingURL=trial.d.ts.map