/** Tool trial console: server → registered mcp__* tool → JSON args → official pipeline. */
import { type ReactNode } from 'react';
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { McpServerView, McpTrialResultWire } from '../wire.js';
/** Trial console props supplied by the tab. */
export interface TrialConsoleProps {
    t: PropsLocale<'settings.mcpPanel'>['t'];
    /** Snapshot server rows (tool lists ride along). */
    servers: readonly McpServerView[];
    /** Panel-side trial policy from the snapshot. */
    policy: {
        enabled: boolean;
        timeoutMs: number;
        maxResultChars: number;
    };
    callTool: (requestJson: string) => Promise<McpTrialResultWire>;
}
/** Render the trial console. */
export declare function TrialConsole({ t, servers, policy, callTool }: TrialConsoleProps): ReactNode;
//# sourceMappingURL=TrialConsole.d.ts.map