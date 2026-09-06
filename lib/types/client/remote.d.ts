/**
 * The client-side Remote face of the `mcpPanel` namespace: the hand-written
 * `TypertRemoteContribution` mounted through `ctx.remote.$mount`, plus the
 * declaration merging that types `ctx.remote.mcpPanel`. The descriptor list
 * is shared with the host `./typert` manifest (`../wire.ts`), so the two
 * faces can never drift.
 *
 * @module dsh-mcp-panel/client/remote
 */
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { McpPanelSnapshot, McpTrialResultWire, PatchPreview, PatchWriteResult, ProbeStarted } from '../wire.js';
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$mcpPanel {
        /** Read the current console snapshot. */
        status: () => Promise<RemoteResult<McpPanelSnapshot>>;
        /** Start a one-shot connectivity probe of one streamable-http server. */
        probe: (serverName: string) => Promise<RemoteResult<ProbeStarted>>;
        /** Render one CRUD operation as its patch fragment (no write). */
        previewPatch: (opJson: string) => Promise<RemoteResult<PatchPreview>>;
        /** Approval-gated append of one CRUD operation to the profile patch layer. */
        writePatch: (opJson: string, confirmed: boolean, sessionId?: string) => Promise<RemoteResult<PatchWriteResult>>;
        /** Trial-call one tool through the official pipeline. */
        callTool: (requestJson: string, sessionId?: string) => Promise<RemoteResult<McpTrialResultWire>>;
    }
    interface TypertRemoteMap {
        'mcpPanel/status': () => Promise<RemoteResult<McpPanelSnapshot>>;
        'mcpPanel/probe': (serverName: string) => Promise<RemoteResult<ProbeStarted>>;
        'mcpPanel/previewPatch': (opJson: string) => Promise<RemoteResult<PatchPreview>>;
        'mcpPanel/writePatch': (opJson: string, confirmed: boolean, sessionId?: string) => Promise<RemoteResult<PatchWriteResult>>;
        'mcpPanel/callTool': (requestJson: string, sessionId?: string) => Promise<RemoteResult<McpTrialResultWire>>;
    }
    interface TypertRemoteNamespaceMap {
        mcpPanel: TypertRemoteNamespace$mcpPanel;
    }
}
/** The client Remote contribution for the `mcpPanel` namespace. */
export declare const MCP_PANEL_REMOTE: Readonly<{
    package: string;
    descriptors: readonly (Readonly<{
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
            schema: import("zod").ZodObject<{
                observed: import("zod").ZodBoolean;
                patchFile: import("zod").ZodNullable<import("zod").ZodString>;
                configLayers: import("zod").ZodObject<{
                    scanned: import("zod").ZodBoolean;
                    error: import("zod").ZodNullable<import("zod").ZodString>;
                    entries: import("zod").ZodArray<import("zod").ZodObject<{
                        serverName: import("zod").ZodString;
                        profileVisible: import("zod").ZodBoolean;
                        effective: import("zod").ZodBoolean;
                        occurrences: import("zod").ZodArray<import("zod").ZodObject<{
                            entryId: import("zod").ZodString;
                            serverName: import("zod").ZodString;
                            layer: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"profile-cordis">, import("zod").ZodLiteral<"profile-patch">, import("zod").ZodLiteral<"agent-preset">]>;
                            layerLabel: import("zod").ZodString;
                            file: import("zod").ZodString;
                            disabled: import("zod").ZodNullable<import("zod").ZodBoolean>;
                            disabledDynamic: import("zod").ZodBoolean;
                            transport: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"stdio">, import("zod").ZodLiteral<"streamable-http">, import("zod").ZodLiteral<"unknown">]>;
                            target: import("zod").ZodString;
                        }, import("zod/v4/core").$strip>>;
                    }, import("zod/v4/core").$strip>>;
                }, import("zod/v4/core").$strip>;
                refreshIntervalMs: import("zod").ZodNumber;
                servers: import("zod").ZodArray<import("zod").ZodObject<{
                    serverName: import("zod").ZodString;
                    entryId: import("zod").ZodString;
                    transport: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"stdio">, import("zod").ZodLiteral<"streamable-http">, import("zod").ZodLiteral<"unknown">]>;
                    target: import("zod").ZodString;
                    enabled: import("zod").ZodBoolean;
                    fiberPhase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"pending">, import("zod").ZodLiteral<"loading">, import("zod").ZodLiteral<"active">, import("zod").ZodLiteral<"failed">, import("zod").ZodLiteral<"unloading">, import("zod").ZodNull]>;
                    configuredNote: import("zod").ZodNullable<import("zod").ZodString>;
                    toolCount: import("zod").ZodNumber;
                    tools: import("zod").ZodArray<import("zod").ZodObject<{
                        name: import("zod").ZodString;
                        description: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>>;
                    phase: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"connecting">, import("zod").ZodLiteral<"connected">, import("zod").ZodLiteral<"waiting">, import("zod").ZodLiteral<"exhausted">, import("zod").ZodLiteral<"disposed">, import("zod").ZodLiteral<"unknown">]>;
                    attempt: import("zod").ZodNumber;
                    maxAttempts: import("zod").ZodNumber;
                    delayMs: import("zod").ZodNullable<import("zod").ZodNumber>;
                    reconnectCount: import("zod").ZodNumber;
                    lastError: import("zod").ZodNullable<import("zod").ZodString>;
                    connectedAt: import("zod").ZodNullable<import("zod").ZodNumber>;
                    observedAt: import("zod").ZodNullable<import("zod").ZodNumber>;
                    probeState: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"reachable">, import("zod").ZodLiteral<"unreachable">, import("zod").ZodNull]>;
                    probeCheckedAt: import("zod").ZodNullable<import("zod").ZodNumber>;
                    statusSource: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"upstream-event">, import("zod").ZodLiteral<"derived">]>;
                    config: import("zod").ZodNullable<import("zod").ZodObject<{
                        serverName: import("zod").ZodString;
                        transport: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"stdio">, import("zod").ZodLiteral<"streamable-http">, import("zod").ZodLiteral<"unknown">]>;
                        command: import("zod").ZodNullable<import("zod").ZodString>;
                        args: import("zod").ZodArray<import("zod").ZodString>;
                        cwd: import("zod").ZodNullable<import("zod").ZodString>;
                        url: import("zod").ZodNullable<import("zod").ZodString>;
                        envKeys: import("zod").ZodArray<import("zod").ZodString>;
                        headerKeys: import("zod").ZodArray<import("zod").ZodString>;
                        toolCallTimeoutMs: import("zod").ZodNullable<import("zod").ZodNumber>;
                        failOnStartupError: import("zod").ZodNullable<import("zod").ZodBoolean>;
                        reconnectEnabled: import("zod").ZodNullable<import("zod").ZodBoolean>;
                        reconnectMaxAttempts: import("zod").ZodNullable<import("zod").ZodNumber>;
                    }, import("zod/v4/core").$strip>>;
                    diagnostics: import("zod").ZodArray<import("zod").ZodObject<{
                        code: import("zod").ZodString;
                        text: import("zod").ZodString;
                    }, import("zod/v4/core").$strip>>;
                    exitCode: import("zod").ZodNullable<import("zod").ZodNumber>;
                    stderrTail: import("zod").ZodNullable<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                probes: import("zod").ZodArray<import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    serverName: import("zod").ZodString;
                    status: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"running">, import("zod").ZodLiteral<"stopping">, import("zod").ZodLiteral<"completed">, import("zod").ZodLiteral<"killed">, import("zod").ZodLiteral<"failed">, import("zod").ZodLiteral<"unknown">]>;
                    startedAt: import("zod").ZodNumber;
                    finishedAt: import("zod").ZodNullable<import("zod").ZodNumber>;
                    detail: import("zod").ZodNullable<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                capabilities: import("zod").ZodObject<{
                    resources: import("zod").ZodObject<{
                        available: import("zod").ZodBoolean;
                    }, import("zod/v4/core").$strip>;
                    prompts: import("zod").ZodObject<{
                        available: import("zod").ZodBoolean;
                    }, import("zod/v4/core").$strip>;
                }, import("zod/v4/core").$strip>;
                trial: import("zod").ZodObject<{
                    enabled: import("zod").ZodBoolean;
                    timeoutMs: import("zod").ZodNumber;
                    maxResultChars: import("zod").ZodNumber;
                }, import("zod/v4/core").$strip>;
                writeEnabled: import("zod").ZodBoolean;
                catalog: import("zod").ZodArray<import("zod").ZodObject<{
                    id: import("zod").ZodString;
                    name: import("zod").ZodString;
                    description: import("zod").ZodString;
                    transport: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"stdio">, import("zod").ZodLiteral<"streamable-http">]>;
                    command: import("zod").ZodOptional<import("zod").ZodString>;
                    args: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    url: import("zod").ZodOptional<import("zod").ZodString>;
                    envKeys: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    headerKeys: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    tags: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>>;
            }, import("zod/v4/core").$strip>;
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
                schema: import("zod").ZodString;
            }>;
        }>[];
        readonly result: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#ProbeStarted";
            schema: import("zod").ZodObject<{
                jobId: import("zod").ZodString;
                note: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
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
                schema: import("zod").ZodString;
            }>;
        }>[];
        readonly result: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchPreview";
            schema: import("zod").ZodObject<{
                fragment: import("zod").ZodString;
                file: import("zod").ZodNullable<import("zod").ZodString>;
                ops: import("zod").ZodNumber;
            }, import("zod/v4/core").$strip>;
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
                schema: import("zod").ZodString;
            }>;
        }> | Readonly<{
            name: string;
            wire: string;
            source: "json";
            codec: Readonly<{
                mode: "strict";
                typeSymbol: "dsh-mcp-panel/types#PatchWriteConfirmed";
                schema: import("zod").ZodBoolean;
            }>;
        }> | Readonly<{
            name: string;
            wire: string;
            source: "json";
            codec: Readonly<{
                mode: "strict";
                typeSymbol: "dsh-mcp-panel/types#PatchWriteSessionId";
                schema: import("zod").ZodString;
            }>;
            acceptsUndefined: true;
        }>)[];
        readonly result: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#PatchWriteResult";
            schema: import("zod").ZodObject<{
                file: import("zod").ZodString;
                backupPath: import("zod").ZodString;
                approvalPath: import("zod").ZodUnion<readonly [import("zod").ZodLiteral<"harness-approval">, import("zod").ZodLiteral<"interactive-confirmation">]>;
                bytes: import("zod").ZodNumber;
                ops: import("zod").ZodNumber;
                note: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
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
                schema: import("zod").ZodString;
            }>;
        }> | Readonly<{
            name: string;
            wire: string;
            source: "json";
            codec: Readonly<{
                mode: "strict";
                typeSymbol: "dsh-mcp-panel/types#TrialSessionId";
                schema: import("zod").ZodString;
            }>;
            acceptsUndefined: true;
        }>)[];
        readonly result: Readonly<{
            mode: "strict";
            typeSymbol: "dsh-mcp-panel/types#McpTrialResultWire";
            schema: import("zod").ZodObject<{
                callId: import("zod").ZodString;
                isError: import("zod").ZodBoolean;
                truncated: import("zod").ZodBoolean;
                durationMs: import("zod").ZodNumber;
                resultJson: import("zod").ZodString;
            }, import("zod/v4/core").$strip>;
        }>;
        readonly sourceLocation: Readonly<{
            file: "src/wire.ts";
            line: 1;
            column: 1;
        }>;
    }>)[];
}>;
//# sourceMappingURL=remote.d.ts.map