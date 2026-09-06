window.__ModuleLoader__.load({
	id: "dsh-mcp-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/present.ts
		/**
		* Derive the connection badge for one server row. Order matters: the entry
		* being disabled or its fiber failed is a configuration fact that beats the
		* (derived or upstream) connection phase.
		*
		* @param view - the assembled server view.
		* @returns the badge code and tone.
		*/
		function connectionBadge(view) {
			if (view.entryId === "") return {
				badge: "unknown",
				tone: "muted"
			};
			if (!view.enabled) return {
				badge: "disabled",
				tone: "muted"
			};
			if (view.fiberPhase === "failed") return {
				badge: "failed",
				tone: "error"
			};
			switch (view.phase) {
				case "connected": return {
					badge: "connected",
					tone: "ok"
				};
				case "connecting":
				case "waiting": return {
					badge: view.phase,
					tone: "warn"
				};
				case "exhausted": return {
					badge: "exhausted",
					tone: "error"
				};
				case "disposed": return {
					badge: "disposed",
					tone: "muted"
				};
				default: return {
					badge: "unknown",
					tone: "muted"
				};
			}
		}
		/** Badge for one probe state. */
		function probeBadge(status) {
			switch (status) {
				case "completed": return {
					badge: "completed",
					tone: "ok"
				};
				case "running": return {
					badge: "running",
					tone: "warn"
				};
				case "stopping": return {
					badge: "stopping",
					tone: "warn"
				};
				case "failed": return {
					badge: "failed",
					tone: "error"
				};
				case "killed": return {
					badge: "killed",
					tone: "muted"
				};
				default: return {
					badge: "unknown",
					tone: "muted"
				};
			}
		}
		/**
		* Project the wire snapshot onto render-ready rows.
		*
		* @param snapshot - the `mcpPanel/status` value.
		* @param now - epoch ms anchor for age computations (keeps the fold pure).
		* @returns the tab model.
		*/
		function presentMcpPanel(snapshot, now = Date.now()) {
			return {
				servers: snapshot.servers.map((view) => {
					const { badge, tone } = connectionBadge(view);
					return {
						view,
						badge,
						tone,
						hasError: view.lastError !== null && view.lastError !== "",
						reconnects: view.reconnectCount < 0 ? null : view.reconnectCount,
						ageSeconds: view.observedAt === null ? null : Math.max(0, Math.floor((now - view.observedAt) / 1e3)),
						hasAttemptBudget: view.attempt >= 0 || view.maxAttempts > 0
					};
				}),
				probes: snapshot.probes.map((view) => {
					const { badge, tone } = probeBadge(view.status);
					return {
						view,
						badge,
						tone
					};
				}),
				empty: snapshot.servers.length === 0,
				observed: snapshot.observed,
				patchFile: snapshot.patchFile,
				configLayers: snapshot.configLayers,
				refreshIntervalMs: snapshot.refreshIntervalMs,
				capabilities: snapshot.capabilities,
				trial: snapshot.trial,
				writeEnabled: snapshot.writeEnabled
			};
		}
		/**
		* Count the summary facts for the tab header line. Counting is derived from
		* the same badge codes the cards show, so the line can never disagree with
		* the rows beneath it.
		*
		* @param servers - the presented server rows (typically the filtered list).
		* @returns the summary counts.
		*/
		function summarizePanel(servers) {
			let connected = 0;
			let errored = 0;
			for (const row of servers) if (row.badge === "connected") connected += 1;
			else if (row.badge === "failed" || row.badge === "exhausted") errored += 1;
			return {
				total: servers.length,
				connected,
				errored
			};
		}
		/**
		* Filter server rows by a case-insensitive substring match against the
		* server name or its display target. An empty query returns the rows
		* unchanged (stable identity, no copies).
		*
		* @param servers - the presented server rows.
		* @param query - the raw filter text.
		* @returns the matching rows.
		*/
		function filterServers(servers, query) {
			const needle = query.trim().toLocaleLowerCase();
			if (needle === "") return servers;
			return servers.filter((row) => row.view.serverName.toLocaleLowerCase().includes(needle) || row.view.target.toLocaleLowerCase().includes(needle));
		}
		//#endregion
		//#region src/client/ServerEditor.tsx
		/** Server CRUD editor: form → patch fragment → copy or approval-gated write. */
		let rowCounter = 0;
		/** Render the CRUD editor. */
		function ServerEditor({ t, view, entryId, writeEnabled, actions, onClose, onWritten }) {
			const isEdit = view !== null;
			const [serverName, setServerName] = (0, react.useState)(view?.serverName ?? "");
			const [transport, setTransport] = (0, react.useState)(view?.transport === "streamable-http" ? "streamable-http" : "stdio");
			const [command, setCommand] = (0, react.useState)(view?.command ?? "");
			const [args, setArgs] = (0, react.useState)((view?.args ?? []).join("\n"));
			const [cwd, setCwd] = (0, react.useState)(view?.cwd ?? "");
			const [url, setUrl] = (0, react.useState)(view?.url ?? "");
			const [timeout, setTimeoutText] = (0, react.useState)(view?.toolCallTimeoutMs === null ? "" : String(view?.toolCallTimeoutMs));
			const [failFast, setFailFast] = (0, react.useState)(view?.failOnStartupError === true);
			const [reconnectEnabled, setReconnectEnabled] = (0, react.useState)(view === null || view.reconnectEnabled === null ? true : view.reconnectEnabled);
			const [reconnectAttempts, setReconnectAttempts] = (0, react.useState)(view === null || view.reconnectMaxAttempts === null ? "" : String(view.reconnectMaxAttempts));
			const [envRows, setEnvRows] = (0, react.useState)(() => initialRows(view?.envKeys ?? []));
			const [headerRows, setHeaderRows] = (0, react.useState)(() => initialRows(view?.headerKeys ?? []));
			const [preview, setPreview] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [armed, setArmed] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [written, setWritten] = (0, react.useState)(null);
			const rowsToMap = (rows, existingKeys) => {
				const entries = {};
				const keep = [];
				for (const row of rows) {
					const key = row.key.trim();
					if (key === "") continue;
					if (existingKeys.includes(key) && row.value === "") keep.push(key);
					else entries[key] = row.value;
				}
				return {
					entries,
					keep
				};
			};
			const buildOp = () => {
				const existingEnv = view?.envKeys ?? [];
				const existingHeaders = view?.headerKeys ?? [];
				const env = rowsToMap(envRows, existingEnv);
				const headers = rowsToMap(headerRows, existingHeaders);
				const config = {
					serverName: serverName.trim(),
					transport,
					...transport === "stdio" ? {
						command: command.trim(),
						...args.trim() === "" ? {} : { args: args.split("\n").map((line) => line.trim()).filter((line) => line !== "") },
						...cwd.trim() === "" ? {} : { cwd: cwd.trim() },
						env: env.entries,
						...isEdit ? { keepEnv: env.keep } : {}
					} : {
						url: url.trim(),
						headers: headers.entries,
						...isEdit ? { keepHeaders: headers.keep } : {}
					},
					...timeout.trim() === "" ? {} : { toolCallTimeoutMs: Number(timeout) },
					...failFast ? { failOnStartupError: true } : {},
					...reconnectEnabled === false ? { reconnectEnabled: false } : {},
					...reconnectAttempts.trim() === "" ? {} : { reconnectMaxAttempts: Number(reconnectAttempts) }
				};
				return isEdit ? {
					kind: "edit",
					entryId,
					config
				} : {
					kind: "add",
					config
				};
			};
			const doPreview = () => {
				setError(null);
				setNotice(null);
				setWritten(null);
				setArmed(false);
				setBusy(true);
				Promise.resolve().then(() => actions.previewPatch(JSON.stringify(buildOp()))).then((result) => {
					setPreview(result);
					setBusy(false);
				}, (failure) => {
					setError(messageOf(failure));
					setBusy(false);
				});
			};
			const doWrite = () => {
				if (preview === null) return;
				setError(null);
				setNotice(null);
				setBusy(true);
				Promise.resolve().then(() => actions.writePatch(JSON.stringify(buildOp()), true)).then((result) => {
					setWritten(result);
					setBusy(false);
					setArmed(false);
					setNotice(t("writeDone").replace("{file}", result.file).replace("{backup}", result.backupPath));
					onWritten();
				}, (failure) => {
					setError(t("writeFailed").replace("{message}", messageOf(failure)));
					setBusy(false);
				});
			};
			const copy = () => {
				if (preview === null) return;
				navigator.clipboard?.writeText(preview.fragment).then(() => {
					setNotice(t("patchCopied"));
				}, (failure) => {
					setError(t("copyFailed").replace("{message}", messageOf(failure)));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dmcp-editor",
				"data-mcp-editor": isEdit ? entryId : "new",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", {
						className: "dmcp-heading",
						children: isEdit ? t("editorTitleEdit").replace("{name}", view?.serverName ?? "") : t("editorTitleAdd")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-form",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldServerName") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: serverName,
									onChange: (event) => {
										setServerName(event.currentTarget.value);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldTransport") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: transport,
									onChange: (event) => {
										setTransport(event.currentTarget.value === "streamable-http" ? "streamable-http" : "stdio");
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "stdio",
										children: "stdio"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "streamable-http",
										children: "streamable-http"
									})]
								})]
							}),
							transport === "stdio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dmcp-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldCommand") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										value: command,
										onChange: (event) => {
											setCommand(event.currentTarget.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dmcp-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldArgs") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										rows: 3,
										value: args,
										onChange: (event) => {
											setArgs(event.currentTarget.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "dmcp-field",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldCwd") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "text",
										value: cwd,
										onChange: (event) => {
											setCwd(event.currentTarget.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MapEditor, {
									label: t("fieldEnv"),
									rows: envRows,
									setRows: setEnvRows,
									t
								})
							] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldUrl") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "text",
									value: url,
									onChange: (event) => {
										setUrl(event.currentTarget.value);
									}
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MapEditor, {
								label: t("fieldHeaders"),
								rows: headerRows,
								setRows: setHeaderRows,
								t
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldTimeout") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									value: timeout,
									onChange: (event) => {
										setTimeoutText(event.currentTarget.value);
									}
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-check",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: failFast,
									onChange: (event) => {
										setFailFast(event.currentTarget.checked);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldFailFast") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-check",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: reconnectEnabled,
									onChange: (event) => {
										setReconnectEnabled(event.currentTarget.checked);
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldReconnectEnabled") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("fieldReconnectMaxAttempts") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									value: reconnectAttempts,
									onChange: (event) => {
										setReconnectAttempts(event.currentTarget.value);
									}
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-editor-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dmcp-action",
							onClick: doPreview,
							disabled: busy,
							children: t("previewPatch")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dmcp-action",
							onClick: onClose,
							disabled: busy,
							children: t("cancel")
						})]
					}),
					error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-error-text",
						role: "alert",
						children: error
					}) : null,
					notice !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-notice",
						children: notice
					}) : null,
					preview !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-patch",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-patch-hint",
								children: preview.file === null ? t("patchFileUnknown") : t("patchFor").replace("{file}", preview.file)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: "dmcp-fragment",
								children: preview.fragment
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dmcp-editor-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dmcp-action",
									onClick: copy,
									children: t("copyPatch")
								}), writeEnabled && preview.file !== null ? armed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dmcp-action dmcp-confirm",
									onClick: doWrite,
									disabled: busy,
									children: t("confirmWrite")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dmcp-action",
									onClick: () => {
										setArmed(true);
									},
									disabled: busy,
									children: t("writeToProfile")
								}) : null]
							}),
							armed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-notice",
								children: t("writeRequiresConfirm")
							}) : null,
							!writeEnabled ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-error-text",
								children: t("writeDisabled")
							}) : null,
							written !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-notice",
								children: t(prevWrittenLabel(written.approvalPath))
							}) : null
						]
					}) : null
				]
			});
		}
		/** Localized approval-channel label for one write result. */
		function prevWrittenLabel(path) {
			return path === "harness-approval" ? "approvalHarness" : "approvalInteractive";
		}
		/** Build the initial row list from existing keys (values left blank = keep). */
		function initialRows(keys) {
			return keys.map((key) => ({
				id: ++rowCounter,
				key,
				value: ""
			}));
		}
		/** Key/value row editor with add/remove; blank values on existing keys mean "keep". */
		function MapEditor({ label, rows, setRows, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
				className: "dmcp-map",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: label }),
					rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-status",
						children: t("none")
					}) : null,
					rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-map-row",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "text",
								className: "dmcp-map-key",
								"aria-label": t("keyColumn"),
								placeholder: t("keyColumn"),
								value: row.key,
								onChange: (event) => {
									setRows((current) => current.map((entry) => entry.id === row.id ? {
										...entry,
										key: event.currentTarget.value
									} : entry));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "text",
								className: "dmcp-map-value",
								"aria-label": t("valueColumn"),
								placeholder: t("unchanged"),
								value: row.value,
								onChange: (event) => {
									setRows((current) => current.map((entry) => entry.id === row.id ? {
										...entry,
										value: event.currentTarget.value
									} : entry));
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dmcp-action",
								"aria-label": t("removeRow"),
								onClick: () => {
									setRows((current) => current.filter((entry) => entry.id !== row.id));
								},
								children: t("removeRow")
							})
						]
					}, row.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dmcp-action",
						onClick: () => {
							setRows((current) => [...current, {
								id: ++rowCounter,
								key: "",
								value: ""
							}]);
						},
						children: t("addRow")
					})
				]
			});
		}
		/** Message text of an arbitrary thrown value. */
		function messageOf(failure) {
			return failure instanceof Error ? failure.message : String(failure);
		}
		//#endregion
		//#region src/client/TrialConsole.tsx
		/** Tool trial console: server → registered mcp__* tool → JSON args → official pipeline. */
		/** Render the trial console. */
		function TrialConsole({ t, servers, policy, callTool }) {
			const configured = servers.filter((server) => server.entryId !== "");
			const [serverName, setServerName] = (0, react.useState)("");
			const [toolName, setToolName] = (0, react.useState)("");
			const [argsText, setArgsText] = (0, react.useState)("{}");
			const [running, setRunning] = (0, react.useState)(false);
			const [result, setResult] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const server = configured.find((candidate) => candidate.serverName === serverName) ?? configured[0];
			(0, react.useEffect)(() => {
				if (configured.length > 0 && serverName === "") setServerName(configured[0]?.serverName ?? "");
			}, [configured, serverName]);
			const tools = server?.tools ?? [];
			(0, react.useEffect)(() => {
				if (tools.length > 0 && !tools.some((tool) => tool.name === toolName)) setToolName(tools[0]?.name ?? "");
				if (tools.length === 0 && toolName !== "") setToolName("");
			}, [tools, toolName]);
			const run = () => {
				const selectedServer = server;
				if (selectedServer === void 0 || toolName === "") return;
				try {
					JSON.parse(argsText.trim() === "" ? "{}" : argsText);
				} catch {
					setError(t("trialArgsInvalid"));
					return;
				}
				setError(null);
				setResult(null);
				setRunning(true);
				Promise.resolve().then(() => callTool(JSON.stringify({
					serverName: selectedServer.serverName,
					toolName,
					argsJson: argsText.trim() === "" ? "{}" : argsText
				}))).then((outcome) => {
					setResult(outcome);
					setRunning(false);
				}, (failure) => {
					setError(failure instanceof Error ? failure.message : String(failure));
					setRunning(false);
				});
			};
			if (!policy.enabled) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dmcp-trial",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					className: "dmcp-heading",
					children: t("trial")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dmcp-status",
					children: t("trialDisabled")
				})]
			});
			const pretty = result === null ? null : prettyJson(result.resultJson);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dmcp-trial",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "dmcp-heading",
						children: t("trial")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-status",
						children: t("trialHint")
					}),
					configured.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-status",
						children: t("empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-trial-row",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("trialServer") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									value: server?.serverName ?? "",
									onChange: (event) => {
										setServerName(event.currentTarget.value);
										setToolName("");
									},
									children: configured.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: candidate.serverName,
										children: candidate.serverName
									}, candidate.serverName))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dmcp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("trialTool") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: toolName,
									onChange: (event) => {
										setToolName(event.currentTarget.value);
									},
									children: [tools.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("trialNoTools")
									}) : null, tools.map((tool) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: tool.name,
										children: tool.name
									}, tool.name))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dmcp-action",
								onClick: run,
								disabled: running || toolName === "",
								children: running ? t("trialRunning") : t("trialRun")
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "dmcp-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("trialArgs") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							rows: 4,
							spellCheck: false,
							value: argsText,
							onChange: (event) => {
								setArgsText(event.currentTarget.value);
							}
						})]
					})] }),
					error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-error-text",
						role: "alert",
						children: error
					}) : null,
					result !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-trial-result",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "dmcp-trial-meta",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BadgeTone, {
									ok: !result.isError,
									label: result.isError ? "error" : "ok"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("trialDuration").replace("{ms}", String(result.durationMs)) }),
								result.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dmcp-warn-text",
									children: t("trialTruncated")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dmcp-trial-call",
									children: result.callId
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "dmcp-fragment dmcp-trial-json",
							children: pretty
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-status",
						children: t("trialApprovalNote")
					})
				]
			});
		}
		/** One tone-colored badge chip (label is visible text). */
		function BadgeTone({ ok, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dmcp-badge",
				"data-tone": ok ? "ok" : "error",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dmcp-dot",
					"aria-hidden": "true"
				}), label]
			});
		}
		/** Pretty-print one result JSON; unparseable (truncated) text renders raw. */
		function prettyJson(json) {
			try {
				return JSON.stringify(JSON.parse(json), null, 2);
			} catch {
				return json;
			}
		}
		//#endregion
		//#region src/client/McpPanelTab.tsx
		/** The MCP management console tab: server cards, CRUD editor, trial console, capabilities, probes. */
		/** Localized label for one server badge code. */
		function badgeLabel(badge, t) {
			switch (badge) {
				case "disabled": return t("statusDisabled");
				case "failed": return t("statusFailed");
				case "connecting": return t("statusConnecting");
				case "connected": return t("statusConnected");
				case "waiting": return t("statusWaiting");
				case "exhausted": return t("statusExhausted");
				case "disposed": return t("statusDisposed");
				default: return t("statusUnknown");
			}
		}
		/** Localized label for one probe badge code. */
		function probeLabel(badge, t) {
			switch (badge) {
				case "running": return t("probeRunning");
				case "completed": return t("probeCompleted");
				case "failed": return t("probeFailed");
				case "killed": return t("probeKilled");
				case "stopping": return t("probeStopping");
				default: return t("probeUnknown");
			}
		}
		/** Local wall-clock range for one probe row; component-layer formatting only. */
		function formatProbeTime(view) {
			const format = (ms) => new Date(ms).toLocaleTimeString(void 0, { hour12: false });
			const start = format(view.startedAt);
			return view.finishedAt === null ? start : `${start}–${format(view.finishedAt)}`;
		}
		/** Localized text for one diagnostic code (fallback: the wire's English text). */
		function diagnosticText(code, text, t) {
			const key = `diag_${code}`;
			const candidate = t(key);
			return candidate === key ? text : candidate;
		}
		/** Render the MCP management console tab. */
		function McpPanelTab({ status, probe, previewPatch, writePatch, callTool, t }) {
			const listId = (0, react.useId)();
			const [request, setRequest] = (0, react.useState)(0);
			const [expanded, setExpanded] = (0, react.useState)({});
			const [probeError, setProbeError] = (0, react.useState)(null);
			const [state, setState] = (0, react.useState)({ status: "loading" });
			const [toolQueries, setToolQueries] = (0, react.useState)({});
			const [serverQuery, setServerQuery] = (0, react.useState)("");
			const [editor, setEditor] = (0, react.useState)(null);
			const [removeArm, setRemoveArm] = (0, react.useState)(null);
			const [removeError, setRemoveError] = (0, react.useState)(null);
			const reload = () => {
				setRequest((value) => value + 1);
			};
			(0, react.useEffect)(() => {
				let current = true;
				Promise.resolve().then(() => status()).then((snapshot) => {
					if (current) setState({
						status: "ready",
						snapshot
					});
				}, (error) => {
					if (current) setState({
						status: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					current = false;
				};
			}, [status, request]);
			const intervalMs = state.status === "ready" ? state.snapshot.refreshIntervalMs : 0;
			(0, react.useEffect)(() => {
				if (intervalMs <= 0) return void 0;
				const tick = () => {
					if (!document.hidden) reload();
				};
				const timer = setInterval(tick, intervalMs);
				const onVisible = () => {
					if (!document.hidden) reload();
				};
				document.addEventListener("visibilitychange", onVisible);
				return () => {
					clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisible);
				};
			}, [intervalMs]);
			const model = state.status === "ready" ? presentMcpPanel(state.snapshot) : void 0;
			const visibleServers = model !== void 0 ? filterServers(model.servers, serverQuery) : [];
			const summary = model !== void 0 ? summarizePanel(visibleServers) : null;
			const summaryText = summary === null ? "" : t("summary").replace("{total}", String(summary.total)).replace("{connected}", String(summary.connected)).replace("{errored}", String(summary.errored));
			const probeRunning = model !== void 0 && model.probes.some((probeRow) => probeRow.view.status === "running");
			(0, react.useEffect)(() => {
				if (!probeRunning) return void 0;
				const timer = setInterval(() => {
					if (!document.hidden) reload();
				}, 1500);
				return () => {
					clearInterval(timer);
				};
			}, [probeRunning]);
			const retry = () => {
				setState({ status: "loading" });
				reload();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dmcp-section",
				"data-dsh-mcp-panel": "",
				"aria-busy": state.status === "loading",
				children: [
					state.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dmcp-status",
						children: t("loading")
					}) : null,
					state.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-failure",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								role: "alert",
								children: t("error")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-failure-detail",
								children: state.message
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: retry,
								children: t("retry")
							})
						]
					}) : null,
					model !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dmcp-panel",
						children: [
							model.empty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-status",
								children: t("empty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dmcp-heading",
									children: t("servers")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dmcp-summary",
									children: summaryText
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dmcp-toolbar",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "search",
											className: "dmcp-tool-filter dmcp-server-filter",
											value: serverQuery,
											placeholder: t("filterServers"),
											"aria-label": t("filterServers"),
											onChange: (event) => {
												setServerQuery(event.currentTarget.value);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dmcp-action",
											onClick: () => {
												setExpanded(Object.fromEntries(visibleServers.map((row) => [row.view.serverName, true])));
											},
											children: t("expandAll")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dmcp-action",
											onClick: () => {
												setExpanded({});
											},
											children: t("collapseAll")
										})
									]
								}),
								visibleServers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dmcp-status",
									children: t("noMatch")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: "dmcp-cards",
									children: visibleServers.map((row) => {
										const open = expanded[row.view.serverName] === true;
										const detailId = `${listId}-${encodeURIComponent(row.view.serverName)}`;
										const toolQuery = toolQueries[row.view.serverName] ?? "";
										const rowProbeRunning = model.probes.some((probeRow) => probeRow.view.status === "running" && probeRow.view.serverName === row.view.serverName);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											className: "dmcp-card",
											"data-mcp-server": row.view.serverName,
											"data-open": open ? "true" : void 0,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												type: "button",
												className: "dmcp-card-content",
												"aria-expanded": open,
												"aria-controls": detailId,
												onClick: () => {
													setExpanded((current) => {
														const next = { ...current };
														if (next[row.view.serverName] === true) delete next[row.view.serverName];
														else next[row.view.serverName] = true;
														return next;
													});
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
													className: "dmcp-card-title",
													children: row.view.serverName
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "dmcp-card-trailing",
													children: [
														row.view.probeState !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
															tone: row.view.probeState === "reachable" ? "ok" : "error",
															label: row.view.probeState === "reachable" ? t("probeReachable") : t("probeUnreachable")
														}) : null,
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
															tone: row.tone,
															label: badgeLabel(row.badge, t)
														}),
														/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
															className: "dmcp-tool-count",
															children: [
																row.view.toolCount,
																" ",
																t("tools")
															]
														})
													]
												})]
											}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: "dmcp-card-details",
												id: detailId,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
														className: "dmcp-details",
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("status") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: badgeLabel(row.badge, t) })] }),
															row.hasAttemptBudget ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("attempt") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [
																row.view.attempt < 0 ? t("none") : row.view.attempt,
																"/",
																row.view.maxAttempts < 0 ? t("none") : row.view.maxAttempts
															] })] }) : null,
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("reconnects") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: row.reconnects ?? t("none") })] }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("lastError") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
																className: row.hasError ? "dmcp-error-text" : void 0,
																children: row.view.lastError ?? t("none")
															})] }),
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("fiber") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: row.view.fiberPhase ?? t("none") })] }),
															row.view.configuredNote !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("configured") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: row.view.configuredNote })] }) : null,
															row.ageSeconds !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("lastEvent") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [row.ageSeconds, "s"] })] }) : null,
															row.view.delayMs !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("retryIn") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [
																row.view.delayMs,
																" ",
																t("ms")
															] })] }) : null,
															row.view.exitCode !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("exitCode") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: row.view.exitCode })] }) : null,
															row.view.stderrTail !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("stderrTail") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: row.view.stderrTail })] }) : null
														]
													}),
													row.view.diagnostics.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: "dmcp-health",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
															className: "dmcp-health-title",
															children: t("healthSuggestions")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
															className: "dmcp-health-list",
															children: row.view.diagnostics.map((diagnostic) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
																diagnosticText(diagnostic.code, diagnostic.text, t),
																" ",
																/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
																	className: "dmcp-diag-code",
																	children: [
																		"(",
																		diagnostic.code,
																		")"
																	]
																})
															] }, diagnostic.code))
														})]
													}) : null,
													row.view.exitCode === null && row.view.stderrTail === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: "dmcp-status",
														children: t("healthPending")
													}) : null,
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
														className: "dmcp-target",
														title: row.view.target,
														children: [
															row.view.transport,
															" ",
															row.view.target
														]
													}),
													row.view.config !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: "dmcp-editor-actions",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: "dmcp-action",
															onClick: () => {
																setEditor({
																	entryId: row.view.entryId,
																	view: row.view.config
																});
															},
															children: t("editServer")
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
															type: "button",
															className: "dmcp-action dmcp-danger",
															onClick: () => {
																setRemoveArm(row.view.serverName);
																setRemoveError(null);
															},
															children: t("removeServer")
														})]
													}) : null,
													removeArm === row.view.serverName && row.view.entryId !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
														className: "dmcp-remove",
														children: [
															/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
																className: "dmcp-status",
																children: t("removeConfirm")
															}),
															removeError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
																className: "dmcp-error-text",
																role: "alert",
																children: removeError
															}) : null,
															/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
																className: "dmcp-editor-actions",
																children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	type: "button",
																	className: "dmcp-action dmcp-danger",
																	onClick: () => {
																		setRemoveError(null);
																		Promise.resolve().then(() => writePatch(JSON.stringify({
																			kind: "disable",
																			entryId: row.view.entryId,
																			serverName: row.view.serverName
																		}), true)).then(() => {
																			setRemoveArm(null);
																			reload();
																		}, (error) => {
																			setRemoveError(error instanceof Error ? error.message : String(error));
																		});
																	},
																	children: t("confirmWrite")
																}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
																	type: "button",
																	className: "dmcp-action",
																	onClick: () => {
																		setRemoveArm(null);
																	},
																	children: t("cancel")
																})]
															})
														]
													}) : null,
													row.view.transport === "streamable-http" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dmcp-probe-now",
														disabled: rowProbeRunning,
														onClick: () => {
															setProbeError(null);
															Promise.resolve().then(() => probe(row.view.serverName)).then(() => {
																reload();
															}, (error) => {
																setProbeError(error instanceof Error ? error.message : String(error));
															});
														},
														children: rowProbeRunning ? t("probeRunning") : t("probeNow")
													}) : null,
													row.view.tools.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
														className: "dmcp-status",
														children: t("noTools")
													}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														type: "search",
														className: "dmcp-tool-filter",
														value: toolQuery,
														placeholder: t("filterTools"),
														"aria-label": t("filterTools"),
														onChange: (event) => {
															setToolQueries((current) => ({
																...current,
																[row.view.serverName]: event.currentTarget.value
															}));
														}
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
														className: "dmcp-tools",
														children: row.view.tools.filter((tool) => toolQuery.trim() === "" || tool.name.toLocaleLowerCase().includes(toolQuery.trim().toLocaleLowerCase()) || tool.description.toLocaleLowerCase().includes(toolQuery.trim().toLocaleLowerCase())).map((tool) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: tool.name }), tool.description !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: "dmcp-tool-description",
															children: tool.description
														}) : null] }, tool.name))
													})] })
												]
											}) : null]
										}, row.view.serverName);
									})
								})
							] }),
							(() => {
								const modeEntries = model.configLayers.entries.filter((entry) => !entry.profileVisible);
								if (modeEntries.length === 0) return null;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dmcp-inventory-note",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										className: "dmcp-heading",
										children: t("invHeading")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: "dmcp-inventory",
										children: modeEntries.map((entry) => {
											const modes = entry.occurrences.map((occ) => {
												const suffix = occ.disabledDynamic ? `（${t("invConditionalTag")}）` : occ.disabled === true ? `（${t("invDisabledTag")}）` : "";
												return `${occ.layerLabel}${suffix}`;
											});
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
												className: "dmcp-inv-entry",
												"data-mcp-config": entry.serverName,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
													className: "dmcp-card-title",
													children: entry.serverName
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "dmcp-inv-modes",
													children: modes.join(" · ")
												})]
											}, entry.serverName);
										})
									})]
								});
							})(),
							!model.observed && !model.empty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-derived-note",
								children: t("derivedNote")
							}) : null,
							probeError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dmcp-error-text",
								role: "alert",
								children: [
									t("probeFailedAction"),
									": ",
									probeError
								]
							}) : null,
							model.patchFile !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "dmcp-patch-hint",
								children: [
									t("patchHint"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: model.patchFile })
								]
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "dmcp-toolbar",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "dmcp-action",
									onClick: () => {
										setEditor({
											entryId: "",
											view: null
										});
									},
									children: t("addServer")
								})
							}),
							editor !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ServerEditor, {
								t,
								view: editor.view,
								entryId: editor.entryId,
								writeEnabled: model.writeEnabled,
								actions: {
									previewPatch,
									writePatch
								},
								onClose: () => {
									setEditor(null);
									reload();
								},
								onWritten: () => {
									reload();
								}
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrialConsole, {
								t,
								servers: model.servers.map((row) => row.view),
								policy: state.status === "ready" ? state.snapshot.trial : {
									enabled: false,
									timeoutMs: 0,
									maxResultChars: 0
								},
								callTool
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dmcp-capabilities",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: "dmcp-heading",
									children: t("capabilities")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
									className: "dmcp-capabilities-list",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
										tone: model.capabilities.resources.available ? "ok" : "muted",
										label: t("capResources")
									}), !model.capabilities.resources.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dmcp-tool-description",
										children: t("capPending")
									}) : null] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
										tone: model.capabilities.prompts.available ? "ok" : "muted",
										label: t("capPrompts")
									}), !model.capabilities.prompts.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dmcp-tool-description",
										children: t("capPending")
									}) : null] })]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: "dmcp-heading",
								children: t("probes")
							}),
							model.probes.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dmcp-status",
								children: t("probeEmpty")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: "dmcp-probes",
								children: model.probes.map((probeRow) => {
									const badge = probeBadge(probeRow.view.status);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: "dmcp-probe",
										"data-mcp-probe": probeRow.view.id,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Badge, {
												tone: badge.tone,
												label: probeLabel(badge.badge, t)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: probeRow.view.serverName }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dmcp-probe-time",
												children: formatProbeTime(probeRow.view)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "dmcp-probe-detail",
												children: probeRow.view.detail ?? t("none")
											})
										]
									}, probeRow.view.id);
								})
							})
						]
					}) : null
				]
			});
		}
		/** One tone-colored badge chip. The label is visible text, so no `role="img"`
		* or `aria-label`: screen readers announce it exactly once. */
		function Badge({ tone, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dmcp-badge",
				"data-tone": tone,
				title: label,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dmcp-dot",
					"aria-hidden": "true"
				}), label]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Copy dictionaries for the MCP management console tab. */
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			tab: "MCP",
			loading: "正在读取 MCP 状态…",
			error: "暂时无法读取 MCP 状态。",
			retry: "重试",
			empty: "此 profile 未配置官方 MCP 服务器（@deepseek-ai/dsh-mcp-client 行）。",
			servers: "服务器",
			summary: "服务器 {total} 台：已连接 {connected}，错误 {errored}",
			filterServers: "过滤服务器",
			noMatch: "没有匹配的服务器。",
			expandAll: "全部展开",
			collapseAll: "全部折叠",
			tools: "工具",
			noTools: "未注册工具",
			status: "状态",
			statusUnknown: "未知",
			statusDisabled: "已停用",
			statusFailed: "挂载失败",
			statusConnecting: "连接中",
			statusConnected: "已连接",
			statusWaiting: "重连等待",
			statusExhausted: "重连放弃",
			statusDisposed: "已卸载",
			reconnects: "重连",
			lastError: "最近错误",
			none: "—",
			fiber: "Cordis fiber",
			configured: "已配置",
			retryIn: "重试等待",
			attempt: "尝试",
			lastEvent: "最后事件",
			filterTools: "过滤工具",
			ms: "ms",
			derivedNote: "连接状态/重连计数来自上游 mcp/status 事件；未观察到上游数据时连接字段显示为\"未知\"，其余为配置与工具注册表事实。",
			probes: "连通性探测",
			probeEmpty: "暂无探测记录。用 mcp_probe 工具发起一次探测。",
			probeRunning: "运行中",
			probeCompleted: "完成",
			probeFailed: "失败",
			probeKilled: "已取消",
			probeStopping: "取消中",
			probeUnknown: "未知",
			probeNow: "探测",
			probeReachable: "可达",
			probeUnreachable: "不可达",
			probeFailedAction: "探测失败",
			patchHint: "本控制台以\"追加操作\"方式写入 profile patch 层（永不改写既有内容），每次写入前自动备份。",
			health: "健康诊断",
			healthSuggestions: "自愈建议",
			healthNone: "未发现已知故障模式——可观测事实一切正常。",
			healthPending: "进程退出码 / stderr 尾部：待官方支持（官方 client 尚未暴露进程诊断）。",
			exitCode: "退出码",
			stderrTail: "stderr 尾部",
			diag_commandNotFound: "配置的命令不存在——安装对应包或修正可执行文件路径。",
			diag_commandSpawnFailed: "服务器进程启动失败或已退出——检查命令行、参数与服务器自身日志。",
			diag_connectionRefused: "服务器拒绝连接——先启动服务器，或检查 URL 中的主机/端口。",
			diag_connectionDropped: "连接中途断开——服务器可能崩溃或重启。",
			diag_timeout: "请求超时——服务器可能过载或 URL 错误；调用慢时可调整 toolCallTimeoutMs。",
			diag_dns: "主机名无法解析——检查 URL 中的域名与网络。",
			diag_auth401: "服务器拒绝了凭据（HTTP 401）——检查 Authorization 头或 token。",
			diag_auth403: "服务器拒绝访问（HTTP 403）——凭据有效但缺少权限。",
			diag_path404: "端点路径返回 404——检查 URL 路径（例如 /mcp）。",
			diag_rateLimit: "服务器限流——等待，或降低重连/请求频率。",
			diag_permission: "权限错误——检查文件权限、PATH 与命令是否可执行。",
			diag_reconnectExhausted: "重连预算已耗尽、客户端放弃——先修复根因，再重载该行（web 面板热重载 cordis.patch.yml）或重启。",
			diag_reconnectWaiting: "客户端正在退避等待重连——会自动重试；修复根因即可终止循环。",
			diag_entryFailed: "cordis 行挂载失败——查看 loader 诊断，修复该行后重载。",
			diagCodeFallback: "建议",
			addServer: "添加服务器",
			editServer: "编辑",
			removeServer: "删除（停用）",
			removeConfirm: "删除 = 追加 `set disabled: true` 操作（patch 词汇表没有 remove）。行保留在文件中，可随时重新启用。",
			editorTitleAdd: "添加 MCP 服务器",
			editorTitleEdit: "编辑 {name}",
			fieldServerName: "serverName（命名空间）",
			fieldTransport: "transport",
			fieldCommand: "command",
			fieldArgs: "args（每行一个参数）",
			fieldCwd: "cwd（可选）",
			fieldUrl: "url",
			fieldTimeout: "toolCallTimeoutMs（每次调用超时）",
			fieldFailFast: "failOnStartupError（启动失败即挂载失败）",
			fieldReconnectEnabled: "自动重连",
			fieldReconnectMaxAttempts: "reconnect.maxAttempts",
			fieldEnv: "env（环境变量）",
			fieldHeaders: "headers（请求头）",
			keyColumn: "键",
			valueColumn: "值",
			unchanged: "（未改动 = 保留原值）",
			addRow: "添加一行",
			removeRow: "删除",
			save: "保存",
			cancel: "取消",
			previewPatch: "生成 patch 片段",
			copyPatch: "复制片段",
			patchCopied: "已复制到剪贴板。",
			copyFailed: "复制失败（剪贴板不可用）：{message}",
			patchFor: "将追加到 {file}：",
			patchFileUnknown: "无法确定 profile patch 文件路径（无 baseUrl）——只能复制片段。",
			writeToProfile: "写入 profile",
			confirmWrite: "确认写入",
			writeRequiresConfirm: "写入需要确认：请核对上面的片段，然后点击\"确认写入\"。",
			writeDone: "已写入 {file}（备份：{backup}）。web 面板热重载 cordis.patch.yml；其他面板重启生效。",
			writeFailed: "写入失败：{message}",
			writeDisabled: "写入已被禁用（config.writeEnabled: false）——只能复制片段。",
			approvalHarness: "审批通道：ctx.approval",
			approvalInteractive: "审批通道：界面确认",
			trial: "工具试用台",
			trialHint: "通过官方工具管线调用（权限与审批生效）；结果只显示在本页，不会进入模型上下文。",
			trialServer: "服务器",
			trialTool: "工具",
			trialArgs: "参数（JSON）",
			trialRun: "调用",
			trialRunning: "调用中…",
			trialResult: "结果（规范 JSON 与 render）",
			trialDuration: "耗时 {ms} ms",
			trialTruncated: "结果超过显示上限，已截断。",
			trialApprovalNote: "审批类调用需要当前会话处于开启轮次；否则 fail-closed 拒绝。",
			trialDisabled: "试用台已被禁用（config.trialEnabled: false）。",
			trialNoTools: "该服务器没有已注册工具——服务器可能未连接或同步失败。",
			trialArgsInvalid: "参数必须是合法 JSON。",
			capabilities: "能力一览",
			capResources: "Resources",
			capPrompts: "Prompts",
			capPending: "待官方支持——官方 client 尚未桥接该能力（Tools 是当前唯一桥接的 MCP 能力）。",
			invHeading: "预设模式专属的 MCP 服务器",
			invDisabledTag: "已停用",
			invConditionalTag: "条件(!!js)"
		};
		/** English dictionary checked against the Chinese key set. */
		const en = {
			tab: "MCP",
			loading: "Reading MCP status…",
			error: "MCP status is temporarily unavailable.",
			retry: "Retry",
			empty: "This profile configures no official MCP servers (@deepseek-ai/dsh-mcp-client rows).",
			servers: "Servers",
			summary: "{total} servers: {connected} connected, {errored} with errors",
			filterServers: "Filter servers",
			noMatch: "No servers match the filter.",
			expandAll: "Expand all",
			collapseAll: "Collapse all",
			tools: "Tools",
			noTools: "No tools registered",
			status: "Status",
			statusUnknown: "Unknown",
			statusDisabled: "Disabled",
			statusFailed: "Mount failed",
			statusConnecting: "Connecting",
			statusConnected: "Connected",
			statusWaiting: "Reconnect waiting",
			statusExhausted: "Reconnect gave up",
			statusDisposed: "Disposed",
			reconnects: "Reconnects",
			lastError: "Last error",
			none: "—",
			fiber: "Cordis fiber",
			configured: "Configured",
			retryIn: "Retry in",
			attempt: "Attempt",
			lastEvent: "Last event",
			filterTools: "Filter tools",
			ms: "ms",
			derivedNote: "Connection status and reconnect counts come from the upstream mcp/status seam; without observed upstream data, connection fields read \"unknown\" and the rest are config and tool-registry facts.",
			probes: "Connectivity probes",
			probeEmpty: "No probes yet. Start one with the mcp_probe tool.",
			probeRunning: "Running",
			probeCompleted: "Completed",
			probeFailed: "Failed",
			probeKilled: "Killed",
			probeStopping: "Stopping",
			probeUnknown: "Unknown",
			probeNow: "Probe",
			probeReachable: "Reachable",
			probeUnreachable: "Unreachable",
			probeFailedAction: "Probe failed",
			patchHint: "This console writes the profile patch layer by APPENDING operations (existing content is never rewritten), and backs up the file before every write.",
			health: "Health diagnostics",
			healthSuggestions: "Self-heal suggestions",
			healthNone: "No known failure pattern detected from the observable facts.",
			healthPending: "Exit code / stderr tail: pending upstream support (the official client does not expose process diagnostics yet).",
			exitCode: "Exit code",
			stderrTail: "stderr tail",
			diag_commandNotFound: "The configured command was not found — install the package or fix the executable path.",
			diag_commandSpawnFailed: "The server process failed to start or exited — check the command line, its arguments, and the server's own logs.",
			diag_connectionRefused: "The server refused the connection — start the server or check the host/port in the URL.",
			diag_connectionDropped: "The connection dropped mid-session — the server may have crashed or restarted.",
			diag_timeout: "A request timed out — the server may be overloaded, or the URL may be wrong. Check toolCallTimeoutMs if calls are slow.",
			diag_dns: "The server hostname did not resolve — check the DNS name in the URL and the network.",
			diag_auth401: "The server rejected the credentials (HTTP 401) — check the Authorization header or token.",
			diag_auth403: "The server denied access (HTTP 403) — the credential is valid but lacks permission.",
			diag_path404: "The endpoint path returned 404 — check the URL path (e.g. /mcp).",
			diag_rateLimit: "The server rate-limited the client — wait, or reduce the reconnect/request rate.",
			diag_permission: "A permission error occurred — check file permissions, PATH access, and whether the command is executable.",
			diag_reconnectExhausted: "The reconnect budget is exhausted and the client has given up — fix the root cause, then reload the row (the web surface hot-reloads cordis.patch.yml edits) or restart.",
			diag_reconnectWaiting: "The client is waiting in reconnect backoff — it will retry automatically; fix the root cause to stop the cycle.",
			diag_entryFailed: "The cordis row failed to mount — read the loader diagnostics, then fix the row and reload.",
			diagCodeFallback: "Suggestion",
			addServer: "Add server",
			editServer: "Edit",
			removeServer: "Remove (disable)",
			removeConfirm: "Removal = appending a `set disabled: true` operation (the patch vocabulary has no remove). The row stays in the file and can be re-enabled anytime.",
			editorTitleAdd: "Add MCP server",
			editorTitleEdit: "Edit {name}",
			fieldServerName: "serverName (namespace)",
			fieldTransport: "transport",
			fieldCommand: "command",
			fieldArgs: "args (one argument per line)",
			fieldCwd: "cwd (optional)",
			fieldUrl: "url",
			fieldTimeout: "toolCallTimeoutMs (per-call timeout)",
			fieldFailFast: "failOnStartupError (fail the mount on startup errors)",
			fieldReconnectEnabled: "Auto reconnect",
			fieldReconnectMaxAttempts: "reconnect.maxAttempts",
			fieldEnv: "env (environment variables)",
			fieldHeaders: "headers (request headers)",
			keyColumn: "Key",
			valueColumn: "Value",
			unchanged: "(unchanged = keep the original value)",
			addRow: "Add a row",
			removeRow: "Remove",
			save: "Save",
			cancel: "Cancel",
			previewPatch: "Generate patch fragment",
			copyPatch: "Copy fragment",
			patchCopied: "Copied to the clipboard.",
			copyFailed: "Copy failed (clipboard unavailable): {message}",
			patchFor: "Will be appended to {file}:",
			patchFileUnknown: "The profile patch path is unknown (no baseUrl) — the fragment can only be copied.",
			writeToProfile: "Write to profile",
			confirmWrite: "Confirm write",
			writeRequiresConfirm: "Writing needs confirmation: review the fragment above, then press \"Confirm write\".",
			writeDone: "Written to {file} (backup: {backup}). The web surface hot-reloads cordis.patch.yml edits; other surfaces restart.",
			writeFailed: "Write failed: {message}",
			writeDisabled: "Writes are disabled (config.writeEnabled: false) — the fragment can only be copied.",
			approvalHarness: "Approval channel: ctx.approval",
			approvalInteractive: "Approval channel: interactive confirmation",
			trial: "Tool trial console",
			trialHint: "Calls run through the official tool pipeline (permission policy and approval stay in force); results are shown only here and never enter model context.",
			trialServer: "Server",
			trialTool: "Tool",
			trialArgs: "Arguments (JSON)",
			trialRun: "Call",
			trialRunning: "Calling…",
			trialResult: "Result (canonical JSON and render)",
			trialDuration: "{ms} ms",
			trialTruncated: "The result exceeded the display cap and was truncated.",
			trialApprovalNote: "Approval-style calls need the current session to be inside an open turn; otherwise they fail closed.",
			trialDisabled: "The trial console is disabled (config.trialEnabled: false).",
			trialNoTools: "This server has no registered tools — it may be disconnected or its sync failed.",
			trialArgsInvalid: "Arguments must be valid JSON.",
			capabilities: "Capabilities",
			capResources: "Resources",
			capPrompts: "Prompts",
			capPending: "Pending upstream support — the official client does not bridge this capability yet (tools are the only bridged MCP capability today).",
			invHeading: "MCP servers configured for preset modes only",
			invDisabledTag: "disabled",
			invConditionalTag: "conditional (!!js)"
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const _null$2 = /^null$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodNull = /*@__PURE__*/ $constructor("$ZodNull", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = _null$2;
			inst._zod.values = /* @__PURE__ */ new Set([null]);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (input === null) return payload;
				payload.issues.push({
					expected: "null",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _null$1(Class, params) {
			return new Class({
				type: "null",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const nullProcessor = (_schema, ctx, json, _params) => {
			if (ctx.target === "openapi-3.0") {
				json.type = "string";
				json.nullable = true;
				json.enum = [null];
			} else json.type = "null";
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodNull = /*@__PURE__*/ $constructor("ZodNull", (inst, def) => {
			$ZodNull.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullProcessor(inst, ctx, json, params);
		});
		function _null(params) {
			return /* @__PURE__ */ _null$1(ZodNull, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
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
		//#region src/client/remote.ts
		/** The client Remote contribution for the `mcpPanel` namespace. */
		const MCP_PANEL_REMOTE = Object.freeze({
			package: "dsh-mcp-panel",
			descriptors: MCP_PANEL_INVOCATIONS
		});
		//#endregion
		//#region src/client/styles.ts
		/**
		* Scoped stylesheet for the MCP tab. Standalone client bundles cannot use the
		* in-repo CSS-module pipeline, so the sheet ships as a string and is
		* installed effect-scoped into a `<style data-dsh-mcp-panel>` element.
		* Every selector is scoped under `[data-dsh-mcp-panel]` and uses theme
		* design tokens only, so it follows both color schemes.
		*
		* @module dsh-mcp-panel/client/styles
		*/
		/** One `<style>` installation; returns the exact disposer that removes it. */
		function installPanelStyles() {
			if (document.querySelector("style[data-dsh-mcp-panel]") !== null) return () => {};
			const element = document.createElement("style");
			element.dataset.dshMcpPanel = "";
			element.textContent = PANEL_CSS;
			document.head.append(element);
			return () => {
				element.remove();
			};
		}
		/** The panel stylesheet, scoped and token-driven. */
		const PANEL_CSS = `
[data-dsh-mcp-panel] .dmcp-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
[data-dsh-mcp-panel] .dmcp-status {
  color: var(--dsw-alias-label-secondary);
  margin: 0;
}
[data-dsh-mcp-panel] .dmcp-failure {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
[data-dsh-mcp-panel] .dmcp-failure button {
  font: inherit;
  cursor: pointer;
}
[data-dsh-mcp-panel] .dmcp-failure-detail {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
[data-dsh-mcp-panel] .dmcp-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
[data-dsh-mcp-panel] .dmcp-heading {
  margin: 4px 0 0;
  font-size: 1em;
  color: var(--dsw-alias-label-primary);
}
[data-dsh-mcp-panel] .dmcp-summary {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
[data-dsh-mcp-panel] .dmcp-server-filter {
  flex: 1 1 180px;
  min-width: 0;
}
[data-dsh-mcp-panel] .dmcp-action {
  font: inherit;
  cursor: pointer;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 10px;
}
[data-dsh-mcp-panel] .dmcp-action:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
[data-dsh-mcp-panel] .dmcp-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
[data-dsh-mcp-panel] .dmcp-card {
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
[data-dsh-mcp-panel] .dmcp-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  font: inherit;
  text-align: left;
  background: none;
  border: 0;
  color: var(--dsw-alias-label-primary);
  padding: 10px 12px;
  cursor: pointer;
}
[data-dsh-mcp-panel] .dmcp-card-content:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
[data-dsh-mcp-panel] .dmcp-tool-filter {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 8px;
}
[data-dsh-mcp-panel] .dmcp-probe-now {
  align-self: flex-start;
  font: inherit;
  cursor: pointer;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 10px;
}
[data-dsh-mcp-panel] .dmcp-probe-now:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
[data-dsh-mcp-panel] .dmcp-probe-now:disabled {
  opacity: 0.6;
  cursor: default;
}
[data-dsh-mcp-panel] .dmcp-card-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-dsh-mcp-panel] .dmcp-card-trailing {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
[data-dsh-mcp-panel] .dmcp-tool-count {
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
[data-dsh-mcp-panel] .dmcp-card-details {
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
[data-dsh-mcp-panel] .dmcp-details {
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
}
[data-dsh-mcp-panel] .dmcp-details dt {
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-details dd {
  margin: 0;
  overflow-wrap: anywhere;
  min-width: 0;
  color: var(--dsw-alias-label-primary);
}
[data-dsh-mcp-panel] .dmcp-error-text {
  color: var(--dsw-alias-state-error-primary);
}
[data-dsh-mcp-panel] .dmcp-target {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-tools {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-tools li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
[data-dsh-mcp-panel] .dmcp-tool-description {
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
[data-dsh-mcp-panel] .dmcp-derived-note,
[data-dsh-mcp-panel] .dmcp-patch-hint {
  color: var(--dsw-alias-label-secondary);
  margin: 0;
  overflow-wrap: anywhere;
}
[data-dsh-mcp-panel] .dmcp-probes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-probe {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
[data-dsh-mcp-panel] .dmcp-probe-time {
  color: var(--dsw-alias-label-tertiary);
  white-space: nowrap;
}
[data-dsh-mcp-panel] .dmcp-probe-detail {
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
  flex: 1 1 100%;
}
[data-dsh-mcp-panel] .dmcp-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.85em;
  white-space: nowrap;
  border: 1px solid currentColor;
}
[data-dsh-mcp-panel] .dmcp-badge[data-tone='ok'] {
  color: var(--dsw-alias-state-success-primary);
}
[data-dsh-mcp-panel] .dmcp-badge[data-tone='warn'] {
  color: var(--dsw-alias-state-warn-primary);
}
[data-dsh-mcp-panel] .dmcp-badge[data-tone='error'] {
  color: var(--dsw-alias-state-error-primary);
}
[data-dsh-mcp-panel] .dmcp-badge[data-tone='muted'] {
  color: var(--dsw-alias-label-tertiary);
}
[data-dsh-mcp-panel] .dmcp-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
[data-dsh-mcp-panel] .dmcp-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 12px;
}
[data-dsh-mcp-panel] .dmcp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
[data-dsh-mcp-panel] .dmcp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.9em;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-field input,
[data-dsh-mcp-panel] .dmcp-field select,
[data-dsh-mcp-panel] .dmcp-field textarea {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 8px;
}
[data-dsh-mcp-panel] .dmcp-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-map {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}
[data-dsh-mcp-panel] .dmcp-map legend {
  font-size: 0.9em;
  color: var(--dsw-alias-label-secondary);
  padding: 0 4px;
}
[data-dsh-mcp-panel] .dmcp-map-row {
  display: flex;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-map-row input {
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: 4px;
  padding: 4px 8px;
  min-width: 0;
}
[data-dsh-mcp-panel] .dmcp-map-key {
  flex: 1 1 40%;
}
[data-dsh-mcp-panel] .dmcp-map-value {
  flex: 2 1 60%;
}
[data-dsh-mcp-panel] .dmcp-editor-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
[data-dsh-mcp-panel] .dmcp-action:disabled {
  opacity: 0.6;
  cursor: default;
}
[data-dsh-mcp-panel] .dmcp-danger {
  color: var(--dsw-alias-state-error-primary);
  border-color: currentColor;
}
[data-dsh-mcp-panel] .dmcp-confirm {
  color: var(--dsw-alias-state-warn-primary);
  border-color: currentColor;
}
[data-dsh-mcp-panel] .dmcp-patch {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
[data-dsh-mcp-panel] .dmcp-fragment {
  margin: 0;
  padding: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  overflow: auto;
  max-height: 240px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--dsw-alias-font-mono, monospace);
  font-size: 0.85em;
}
[data-dsh-mcp-panel] .dmcp-notice {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
[data-dsh-mcp-panel] .dmcp-warn-text {
  color: var(--dsw-alias-state-warn-primary);
}
[data-dsh-mcp-panel] .dmcp-health {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
[data-dsh-mcp-panel] .dmcp-health-title {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-health-list {
  list-style: disc;
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: var(--dsw-alias-label-primary);
}
[data-dsh-mcp-panel] .dmcp-diag-code {
  color: var(--dsw-alias-label-tertiary);
}
[data-dsh-mcp-panel] .dmcp-remove {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--dsw-alias-state-error-primary);
  border-radius: 4px;
  padding: 8px;
}
[data-dsh-mcp-panel] .dmcp-trial {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding-top: 12px;
}
[data-dsh-mcp-panel] .dmcp-trial-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: flex-end;
}
[data-dsh-mcp-panel] .dmcp-trial-row .dmcp-field {
  flex: 1 1 180px;
  min-width: 0;
}
[data-dsh-mcp-panel] .dmcp-trial-result {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-trial-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0;
  color: var(--dsw-alias-label-secondary);
}
[data-dsh-mcp-panel] .dmcp-trial-call {
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--dsw-alias-font-mono, monospace);
  font-size: 0.85em;
}
[data-dsh-mcp-panel] .dmcp-trial-json {
  max-height: 320px;
}
[data-dsh-mcp-panel] .dmcp-capabilities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-capabilities-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-capabilities-list li {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
[data-dsh-mcp-panel] .dmcp-inventory {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
[data-dsh-mcp-panel] .dmcp-inv-entry {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
[data-dsh-mcp-panel] .dmcp-inv-modes {
  color: var(--dsw-alias-label-secondary);
  font-size: 0.9em;
}
[data-dsh-mcp-panel] .dmcp-inventory-note {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
`;
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "settings.mcpPanel";
		/** Plugin name: matches the package name, the graph row id, and the bundle id. */
		const name = "dsh-mcp-panel";
		/** Services the console reads; `remote.mcpPanel` appears once this plugin mounts its contribution. */
		const inject = [
			"slots",
			"locale",
			"remote",
			"sessions"
		];
		/**
		* Browser plugin body: dictionaries, the scoped stylesheet, the Remote
		* contribution mount, and the settings tab registration.
		*
		* @param ctx - client root context.
		*/
		async function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-mcp-panel: dictionaries");
			ctx.effect(() => installPanelStyles(), "dsh-mcp-panel: stylesheet");
			await ctx.remote.$mount(MCP_PANEL_REMOTE);
			ctx.inject(["remote.mcpPanel"], (scope) => {
				const slots = scope.get("slots");
				const t = scope.locale.bind(NS);
				const unwrap = (result, method) => {
					if (!result.ok) throw new Error(`mcpPanel.${method} failed: ${result.error.code}: ${result.error.message}`);
					return result.value;
				};
				const status = async () => unwrap(await scope.remote.mcpPanel.status(), "status");
				const probe = async (serverName) => unwrap(await scope.remote.mcpPanel.probe(serverName), "probe");
				const previewPatch = async (opJson) => unwrap(await scope.remote.mcpPanel.previewPatch(opJson), "previewPatch");
				const writePatch = async (opJson, confirmed) => unwrap(await scope.remote.mcpPanel.writePatch(opJson, confirmed, currentSessionId(scope.get("sessions"))), "writePatch");
				const callTool = async (requestJson) => unwrap(await scope.remote.mcpPanel.callTool(requestJson, currentSessionId(scope.get("sessions"))), "callTool");
				slots.inject("settings.plugins.tab", () => slots.register({
					name: "settings.plugins.tab",
					id: "mcp",
					order: 30,
					label: () => t("tab"),
					locale: NS,
					inject: () => ({
						status,
						probe,
						previewPatch,
						writePatch,
						callTool
					})
				}, McpPanelTab));
			});
		}
		/**
		* Read the current session id from the sessions store face (structural:
		* the store shape differs across harness lines, so only the leaf is read).
		*/
		function currentSessionId(sessions) {
			try {
				const list = sessions?.list;
				if (typeof list !== "object" || list === null) return void 0;
				const getSnapshot = list.getSnapshot;
				if (typeof getSnapshot !== "function") return void 0;
				const current = getSnapshot().current;
				return typeof current === "string" ? current : void 0;
			} catch {
				return;
			}
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.connectionBadge = connectionBadge;
		exports.inject = inject;
		exports.name = name;
		exports.presentMcpPanel = presentMcpPanel;
		exports.probeBadge = probeBadge;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map