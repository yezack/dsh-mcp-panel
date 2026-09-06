/** The MCP management console tab: server cards, CRUD editor, trial console, capabilities, probes. */
import { type ReactNode } from 'react';
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { McpPanelSnapshot, McpTrialResultWire, PatchPreview, PatchWriteResult, ProbeStarted } from '../wire.js';
/** Registration-side injected face: the console RPCs (RemoteResult already unwrapped). */
export interface McpPanelTabInjected {
    /** Read the current Host snapshot. */
    status: () => Promise<McpPanelSnapshot>;
    /** Start a one-shot probe of one streamable-http server (panel-only result). */
    probe: (serverName: string) => Promise<ProbeStarted>;
    /** Render one CRUD operation as its patch fragment (no write). */
    previewPatch: (opJson: string) => Promise<PatchPreview>;
    /** Approval-gated append of one CRUD operation to the profile patch layer. */
    writePatch: (opJson: string, confirmed: boolean) => Promise<PatchWriteResult>;
    /** Trial-call one tool through the official pipeline. */
    callTool: (requestJson: string) => Promise<McpTrialResultWire>;
}
/** Full component props assembled by the Settings slot renderer. */
export type McpPanelTabProps = PropsRuntime<'settings.plugins.tab'> & PropsLocale<'settings.mcpPanel'> & InjectFace<McpPanelTabInjected>;
/** Render the MCP management console tab. */
export declare function McpPanelTab({ status, probe, previewPatch, writePatch, callTool, t }: McpPanelTabProps): ReactNode;
//# sourceMappingURL=McpPanelTab.d.ts.map