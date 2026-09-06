/**
 * Profile patch-layer writes for the console. APPEND-ONLY by design: the
 * console never rewrites `cordis.patch.yml` — it appends one generated
 * operation block at a time, after copying the current file to a timestamped
 * backup. The Loader applies patch lists in order, so an appended operation
 * is the effective configuration; user comments and unrelated rows stay
 * byte-for-byte untouched. Backups are pruned to the newest `backupCount`.
 *
 * Every write is reversible: the backup restores the previous state, and an
 * appended block can be hand-removed to undo.
 *
 * @module dsh-mcp-panel/write
 */
/**
 * Copy the current patch file to a timestamped backup, append one fragment,
 * and prune backups beyond `backupCount` (newest kept). Creates the file with
 * an empty list header when it does not exist.
 *
 * @param filePath - absolute path of the profile patch layer.
 * @param fragment - the generated YAML block (no trailing newline needed).
 * @param backupCount - backups retained (>= 1).
 * @returns the absolute backup path and the number of bytes appended.
 * @throws when any file operation fails; nothing is partially applied after
 *   the backup step (backup → append, in that order).
 */
export declare function appendPatchFragment(filePath: string, fragment: string, backupCount: number): Promise<{
    readonly backupPath: string;
    readonly bytes: number;
}>;
//# sourceMappingURL=write.d.ts.map