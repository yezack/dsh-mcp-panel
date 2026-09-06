import { a as number, c as union, i as literal, n as array, o as object, r as boolean, s as string, t as _null } from "./schemas-BhI7GrM5.js";
//#region src/wire.ts
/**
* The console's wire vocabulary: the snapshot types served over the
* `mcpPanel` Remote namespace, their zod v4 validation schema (the strict
* codec both Typert faces carry), and the invocation descriptors shared
* verbatim by the host `./typert` manifest (`src/typert.host.ts`) and the
* client Remote contribution (`src/client/remote.ts`). One canonical source
* for both faces keeps the host and client codecs from ever drifting apart.
*
* Values that could be large or heterogeneous (trial results) cross the wire
* as single bounded JSON strings; every scalar here has an explicit shape.
*
* @module dsh-mcp-panel/wire
*/
/** Strict wire schema for {@link McpPanelSnapshot} (zod v4, both Typert faces). */
const MCP_PANEL_SNAPSHOT_SCHEMA = object({
	observed: boolean(),
	patchFile: string().nullable(),
	configLayers: object({
		scanned: boolean(),
		error: string().nullable(),
		entries: array(object({
			serverName: string(),
			profileVisible: boolean(),
			effective: boolean(),
			occurrences: array(object({
				entryId: string(),
				serverName: string(),
				layer: union([
					literal("profile-cordis"),
					literal("profile-patch"),
					literal("agent-preset")
				]),
				layerLabel: string(),
				file: string(),
				disabled: boolean().nullable(),
				disabledDynamic: boolean(),
				transport: union([
					literal("stdio"),
					literal("streamable-http"),
					literal("unknown")
				]),
				target: string()
			}))
		}))
	}),
	refreshIntervalMs: number().int(),
	servers: array(object({
		serverName: string(),
		entryId: string(),
		transport: union([
			literal("stdio"),
			literal("streamable-http"),
			literal("unknown")
		]),
		target: string(),
		enabled: boolean(),
		fiberPhase: union([
			literal("pending"),
			literal("loading"),
			literal("active"),
			literal("failed"),
			literal("unloading"),
			_null()
		]),
		configuredNote: string().nullable(),
		toolCount: number().int(),
		tools: array(object({
			name: string(),
			description: string()
		})),
		phase: union([
			literal("connecting"),
			literal("connected"),
			literal("waiting"),
			literal("exhausted"),
			literal("disposed"),
			literal("unknown")
		]),
		attempt: number().int(),
		maxAttempts: number().int(),
		delayMs: number().int().nullable(),
		reconnectCount: number().int(),
		lastError: string().nullable(),
		connectedAt: number().int().nullable(),
		observedAt: number().int().nullable(),
		probeState: union([
			literal("reachable"),
			literal("unreachable"),
			_null()
		]),
		probeCheckedAt: number().int().nullable(),
		statusSource: union([literal("upstream-event"), literal("derived")]),
		config: object({
			serverName: string(),
			transport: union([
				literal("stdio"),
				literal("streamable-http"),
				literal("unknown")
			]),
			command: string().nullable(),
			args: array(string()),
			cwd: string().nullable(),
			url: string().nullable(),
			envKeys: array(string()),
			headerKeys: array(string()),
			toolCallTimeoutMs: number().int().nullable(),
			failOnStartupError: boolean().nullable(),
			reconnectEnabled: boolean().nullable(),
			reconnectMaxAttempts: number().int().nullable()
		}).nullable(),
		diagnostics: array(object({
			code: string(),
			text: string()
		})),
		exitCode: number().int().nullable(),
		stderrTail: string().nullable()
	})),
	probes: array(object({
		id: string(),
		serverName: string(),
		status: union([
			literal("running"),
			literal("stopping"),
			literal("completed"),
			literal("killed"),
			literal("failed"),
			literal("unknown")
		]),
		startedAt: number().int(),
		finishedAt: number().int().nullable(),
		detail: string().nullable()
	})),
	capabilities: object({
		resources: object({ available: boolean() }),
		prompts: object({ available: boolean() })
	}),
	trial: object({
		enabled: boolean(),
		timeoutMs: number().int(),
		maxResultChars: number().int()
	}),
	writeEnabled: boolean(),
	catalog: array(object({
		id: string(),
		name: string(),
		description: string(),
		transport: union([literal("stdio"), literal("streamable-http")]),
		command: string().optional(),
		args: array(string()).optional(),
		url: string().optional(),
		envKeys: array(string()).optional(),
		headerKeys: array(string()).optional(),
		tags: array(string()).optional()
	}))
});
/**
* The `mcpPanel/status` invocation descriptor, shared verbatim by the host
* `TYPERT` manifest (`src/typert.host.ts`) and the client
* `TypertRemoteContribution` (`src/client/remote.ts`). Hand-written in the
* exact shape the Typert generator emits; validated by the typert loader and
* the client registry at mount time.
*/
const MCP_PANEL_STATUS_DESCRIPTOR = Object.freeze({
	id: "dsh-mcp-panel#mcpPanel/status",
	service: "mcpPanel",
	namespace: "mcpPanel",
	method: "status",
	invocation: Object.freeze({ kind: "direct" }),
	parameters: Object.freeze([]),
	result: Object.freeze({
		mode: "strict",
		typeSymbol: "dsh-mcp-panel/types#McpPanelSnapshot",
		schema: MCP_PANEL_SNAPSHOT_SCHEMA
	}),
	sourceLocation: Object.freeze({
		file: "src/wire.ts",
		line: 1,
		column: 1
	})
});
/** Strict wire schema for {@link ProbeStarted}. */
const PROBE_STARTED_SCHEMA = object({
	jobId: string(),
	note: string()
});
/**
* The `mcpPanel/probe` invocation descriptor: start a one-shot probe from the
* settings panel (same background-job mechanics as the `mcp_probe` tool).
*/
const MCP_PANEL_PROBE_DESCRIPTOR = Object.freeze({
	id: "dsh-mcp-panel#mcpPanel/probe",
	service: "mcpPanel",
	namespace: "mcpPanel",
	method: "probe",
	invocation: Object.freeze({ kind: "direct" }),
	parameters: Object.freeze([Object.freeze({
		name: "serverName",
		wire: "serverName",
		source: "json",
		codec: Object.freeze({
			mode: "strict",
			typeSymbol: "dsh-mcp-panel/types#ProbeRequestServerName",
			schema: string()
		})
	})]),
	result: Object.freeze({
		mode: "strict",
		typeSymbol: "dsh-mcp-panel/types#ProbeStarted",
		schema: PROBE_STARTED_SCHEMA
	}),
	sourceLocation: Object.freeze({
		file: "src/wire.ts",
		line: 1,
		column: 1
	})
});
/** Strict wire schema for {@link PatchPreview}. */
const PATCH_PREVIEW_SCHEMA = object({
	fragment: string(),
	file: string().nullable(),
	ops: number().int()
});
/** The `mcpPanel/previewPatch` invocation descriptor: render one CRUD op. */
const MCP_PANEL_PREVIEW_DESCRIPTOR = Object.freeze({
	id: "dsh-mcp-panel#mcpPanel/previewPatch",
	service: "mcpPanel",
	namespace: "mcpPanel",
	method: "previewPatch",
	invocation: Object.freeze({ kind: "direct" }),
	parameters: Object.freeze([Object.freeze({
		name: "opJson",
		wire: "opJson",
		source: "json",
		codec: Object.freeze({
			mode: "strict",
			typeSymbol: "dsh-mcp-panel/types#PatchOpJson",
			schema: string()
		})
	})]),
	result: Object.freeze({
		mode: "strict",
		typeSymbol: "dsh-mcp-panel/types#PatchPreview",
		schema: PATCH_PREVIEW_SCHEMA
	}),
	sourceLocation: Object.freeze({
		file: "src/wire.ts",
		line: 1,
		column: 1
	})
});
/** Strict wire schema for {@link PatchWriteResult}. */
const PATCH_WRITE_RESULT_SCHEMA = object({
	file: string(),
	backupPath: string(),
	approvalPath: union([literal("harness-approval"), literal("interactive-confirmation")]),
	bytes: number().int(),
	ops: number().int(),
	note: string()
});
/** The `mcpPanel/writePatch` invocation descriptor: approval-gated append. */
const MCP_PANEL_WRITE_DESCRIPTOR = Object.freeze({
	id: "dsh-mcp-panel#mcpPanel/writePatch",
	service: "mcpPanel",
	namespace: "mcpPanel",
	method: "writePatch",
	invocation: Object.freeze({ kind: "direct" }),
	parameters: Object.freeze([
		Object.freeze({
			name: "opJson",
			wire: "opJson",
			source: "json",
			codec: Object.freeze({
				mode: "strict",
				typeSymbol: "dsh-mcp-panel/types#PatchOpJson",
				schema: string()
			})
		}),
		Object.freeze({
			name: "confirmed",
			wire: "confirmed",
			source: "json",
			codec: Object.freeze({
				mode: "strict",
				typeSymbol: "dsh-mcp-panel/types#PatchWriteConfirmed",
				schema: boolean()
			})
		}),
		Object.freeze({
			name: "sessionId",
			wire: "sessionId",
			source: "json",
			codec: Object.freeze({
				mode: "strict",
				typeSymbol: "dsh-mcp-panel/types#PatchWriteSessionId",
				schema: string()
			}),
			acceptsUndefined: true
		})
	]),
	result: Object.freeze({
		mode: "strict",
		typeSymbol: "dsh-mcp-panel/types#PatchWriteResult",
		schema: PATCH_WRITE_RESULT_SCHEMA
	}),
	sourceLocation: Object.freeze({
		file: "src/wire.ts",
		line: 1,
		column: 1
	})
});
/** Strict wire schema for {@link McpTrialResultWire}. */
const MCP_TRIAL_RESULT_SCHEMA = object({
	callId: string(),
	isError: boolean(),
	truncated: boolean(),
	durationMs: number().int(),
	resultJson: string()
});
/** The `mcpPanel/callTool` invocation descriptor: official-pipeline trial call. */
const MCP_PANEL_CALLTOOL_DESCRIPTOR = Object.freeze({
	id: "dsh-mcp-panel#mcpPanel/callTool",
	service: "mcpPanel",
	namespace: "mcpPanel",
	method: "callTool",
	invocation: Object.freeze({ kind: "direct" }),
	parameters: Object.freeze([Object.freeze({
		name: "requestJson",
		wire: "requestJson",
		source: "json",
		codec: Object.freeze({
			mode: "strict",
			typeSymbol: "dsh-mcp-panel/types#TrialRequestJson",
			schema: string()
		})
	}), Object.freeze({
		name: "sessionId",
		wire: "sessionId",
		source: "json",
		codec: Object.freeze({
			mode: "strict",
			typeSymbol: "dsh-mcp-panel/types#TrialSessionId",
			schema: string()
		}),
		acceptsUndefined: true
	})]),
	result: Object.freeze({
		mode: "strict",
		typeSymbol: "dsh-mcp-panel/types#McpTrialResultWire",
		schema: MCP_TRIAL_RESULT_SCHEMA
	}),
	sourceLocation: Object.freeze({
		file: "src/wire.ts",
		line: 1,
		column: 1
	})
});
/**
* The canonical invocation list both Typert faces register — the host
* manifest and the client contribution share these exact descriptor objects,
* so the two wire codecs can never drift apart.
*/
const MCP_PANEL_INVOCATIONS = Object.freeze([
	MCP_PANEL_STATUS_DESCRIPTOR,
	MCP_PANEL_PROBE_DESCRIPTOR,
	MCP_PANEL_PREVIEW_DESCRIPTOR,
	MCP_PANEL_WRITE_DESCRIPTOR,
	MCP_PANEL_CALLTOOL_DESCRIPTOR
]);
//#endregion
//#region src/typert.host.ts
/**
* The hand-written Typert HOST manifest for `dsh-mcp-panel`, exported as
* `./typert` so the harness's typert-loader registers the `mcpPanel` status
* and probe invocations automatically when this plugin mounts. Same shape as
* a generator output (validated by the loader): package face, empty model and
* schemas, and the canonical invocation list shared with the client Remote
* contribution (`src/wire.ts`).
*
* @module dsh-mcp-panel/typert
*/
/** Host Typert manifest (validated by `@deepseek-ai/dsh-typert-loader`). */
const TYPERT = Object.freeze({
	package: "dsh-mcp-panel",
	face: "host",
	schemas: Object.freeze([]),
	invocations: MCP_PANEL_INVOCATIONS,
	model: Object.freeze({
		services: Object.freeze([]),
		events: Object.freeze([]),
		objects: Object.freeze([])
	})
});
//#endregion
export { TYPERT };
