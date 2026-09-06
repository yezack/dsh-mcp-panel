/**
 * Cross-layer MCP config inventory: enumerate every `@deepseek-ai/dsh-mcp-client`
 * row that exists in the profile's OWN layer files (cordis.yml + the
 * cordis.patch.yml the console writes) and in every agent-preset layer
 * (`.agent-presets/<name>/agent.cordis.yml`) of the same DSH home.
 *
 * The loader snapshot (`src/service.ts`) only sees rows effective in the
 * current host scope; agent-preset rows are scoped to preset conversations
 * and never appear there. This read-only scan closes that gap for the panel:
 * each occurrence is annotated with its layer, its disabled state (a `!!js`
 * expression is reported as dynamic and never evaluated), and whether the
 * server namespace is profile-visible and/or currently effective.
 *
 * Discovery is defensive: a missing file, an unparsable layer, or a
 * malformed row degrades to an explicit skip/error instead of throwing —
 * the panel must never go down because one preset file is broken.
 *
 * @module dsh-mcp-panel/layers
 */
import { type McpLoaderRow } from './aggregate.js';
import type { McpConfigInventoryView, McpConfigLayerKind } from './wire.js';
/** One scanned layer file plus how to present it. */
export interface LayerSpec {
    /** Which layer kind this file belongs to. */
    layer: McpConfigLayerKind;
    /** Short human label shown next to the file (preset display names pass through). */
    label: string;
    /** Absolute file path. */
    file: string;
}
/** The two profile-layer files of one profile directory. */
export declare function profileLayerSpecs(baseDir: string): readonly LayerSpec[];
/**
 * Discover every agent-preset config file under the DSH home that shares the
 * given profile directory. `baseDir` is expected to be
 * `<dsh-home>/profiles/<name>`; both the canonical relative layout and a
 * profile directory that IS the home are accepted.
 *
 * @param baseDir - absolute profile directory, or null when unknown.
 * @returns the preset specs sorted by display label.
 */
export declare function agentPresetSpecs(baseDir: string | null): readonly LayerSpec[];
/** One mcp-client row extracted from one layer file. */
interface ExtractedRow {
    /** Entry id written in the file, or the server namespace fallback. */
    entryId: string;
    /** Effective disabled at this occurrence; `null` = `!!js` (never evaluated). */
    disabled: boolean | null;
    /** Whether the disabled fact is a `!!js` expression. */
    disabledDynamic: boolean;
    /** Raw config; may be anything (kept raw; display helpers are defensive). */
    config: unknown;
}
/**
 * Collect the mcp-client rows of one parsed layer document, honoring
 * same-file bare disable overrides (`- id: mcp-client-x` + `disabled` rows,
 * which the loader applies to the insert row in the same file).
 *
 * @param doc - the parsed top-level loader patch array.
 * @returns rows keyed by entry id, in document order of first appearance.
 */
export declare function extractRowsFromLayer(doc: unknown): readonly ExtractedRow[];
/**
 * Build the read-only cross-layer inventory for one profile directory.
 *
 * @param baseDir - absolute profile directory, or null when unknown.
 * @param loaderRows - the loader rows of the current snapshot (for the
 *   `effective` flag). Pass an empty array when none are available.
 * @returns the wire inventory view.
 */
export declare function scanConfigLayers(baseDir: string | null, loaderRows?: readonly McpLoaderRow[]): McpConfigInventoryView;
export {};
//# sourceMappingURL=layers.d.ts.map