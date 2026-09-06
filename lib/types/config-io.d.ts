/**
 * MCP server config import/export: a versioned JSON document that round-trips
 * the console's server rows into a shareable/backup file, and parses an import
 * back into validated editor inputs (each ready to render as an append-only
 * `add` patch). Import/export never fabricates a row and never evaluates a
 * `!!js` expression — non-plain-JSON config is exported as `null` with a
 * reason instead of being silently corrupted.
 *
 * @module dsh-mcp-panel/config-io
 */
import { type McpServerConfigInput } from './patch.js';
/** Discriminator of the MCP config export document (version 1). */
export declare const MCP_CONFIG_EXPORT_SCHEMA: 'dsh-mcp-panel/mcp-config@v1';
/** One exported server row. */
export interface McpConfigExportRow {
    /** Loader entry id (the patch row id). */
    entryId: string;
    /** Raw config, or null when the row was not plain JSON (`!!js` present). */
    config: Record<string, unknown> | null;
    /** Present only when `config` is null. */
    reason?: string;
}
/** One parsed import row: an entry id plus a validated config input. */
export interface McpConfigImportRow {
    /** Loader entry id (imported, or the default from the serverName). */
    entryId: string;
    /** Validated editor config ready for an `add` patch. */
    config: McpServerConfigInput;
}
/**
 * Export the console's MCP server rows as a versioned JSON document. Rows
 * whose config carries a `!!js` expression (not plain JSON) export as
 * `{ config: null, reason }` — the expression is never evaluated or emitted.
 * @param servers - `{ entryId, config }` per mcp-client loader row.
 * @returns the pretty-printed JSON export.
 */
export declare function exportMcpConfigs(servers: ReadonlyArray<{
    entryId: string;
    config: unknown;
}>): string;
/**
 * Parse an MCP config export back into validated editor inputs. Every server's
 * `config` is validated against the official client face; the first invalid
 * entry fails the whole import with the offending field named (nothing is
 * silently skipped). `entryId` defaults to `mcp-<serverName>` when absent.
 * @param text - the export JSON text (untrusted).
 * @returns the import rows in document order.
 * @throws on malformed JSON, a missing `servers` array, or an invalid entry.
 */
export declare function parseMcpConfigsImport(text: string): McpConfigImportRow[];
//# sourceMappingURL=config-io.d.ts.map