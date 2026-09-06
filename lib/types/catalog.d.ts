/**
 * The community MCP server catalog: a built-in recommended directory plus a
 * user-editable overlay (append new entries, override by id). Entries carry
 * only non-secret facts — recommended env/header VARIABLE NAMES are surfaced
 * as keys, never values, so the panel can prompt for credentials without ever
 * shipping one. Pure module: no I/O, no registry reads.
 *
 * @module dsh-mcp-panel/catalog
 */
import type { McpServerConfigInput } from './patch.js';
/** Schema discriminator of the catalog document (version 1). */
export declare const CATALOG_SCHEMA: 'dsh-mcp-panel/catalog@v1';
/** One recommended MCP server entry. The `id` doubles as the `serverName`. */
export interface CatalogEntry {
    /** Stable slug, also the `serverName` (`[A-Za-z0-9_-]{1,32}`). */
    id: string;
    /** Display name. */
    name: string;
    /** One-line description of what the server provides. */
    description: string;
    /** Declared transport. */
    transport: 'stdio' | 'streamable-http';
    /** stdio: executable + args (no shell interpretation). */
    command?: string;
    /** stdio: argument list. */
    args?: string[];
    /** streamable-http: endpoint URL. */
    url?: string;
    /** Recommended env variable names (values are user-supplied, never shipped). */
    envKeys?: string[];
    /** Recommended header names (values are user-supplied, never shipped). */
    headerKeys?: string[];
    /** Discovery tags. */
    tags?: string[];
}
/**
 * The built-in recommended directory. Generic public MCP servers only — no
 * credentials, no private endpoints. `envKeys` name the variables a user must
 * supply (e.g. a GitHub token), never the values.
 */
export declare const DEFAULT_CATALOG: readonly CatalogEntry[];
/**
 * Merge the built-in directory with a user overlay: entries keyed by `id`;
 * the user's entry REPLACES a built-in one with the same id, and appends when
 * the id is new. Returns entries in first-seen order (built-in order first,
 * then appended user entries).
 * @param builtin - the shipped directory.
 * @param user - the user overlay (append/override).
 * @returns the merged directory.
 */
export declare function mergeCatalog(builtin: readonly CatalogEntry[], user: readonly CatalogEntry[]): CatalogEntry[];
/** Validation problem for one catalog entry. */
export interface CatalogIssue {
    /** Field path, e.g. `catalog[2].command`. */
    field: string;
    /** English explanation. */
    text: string;
}
/**
 * Validate a raw catalog entry (untrusted JSON from config). A legal entry has
 * a slug id, a name, a description, a legal transport, and the transport's
 * required field (`command` for stdio, `url` for streamable-http).
 * @param value - the raw entry.
 * @param index - its position in the overlay, for error messages.
 * @returns issues (empty when valid).
 */
export declare function catalogIssues(value: unknown, index: number): CatalogIssue[];
/** Validate a whole overlay; returns the issues of every malformed entry. */
export declare function catalogOverlayIssues(value: unknown): CatalogIssue[];
/**
 * Normalize one validated catalog entry into an editor `add` config input.
 * The entry `id` becomes the `serverName`; env/header VALUES are never
 * synthesized — only the recommended variable names are surfaced.
 * @param entry - the catalog entry.
 * @returns the config input ready for a one-click `add` patch.
 */
export declare function catalogToConfigInput(entry: CatalogEntry): McpServerConfigInput;
//# sourceMappingURL=catalog.d.ts.map