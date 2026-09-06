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
export declare function installPanelStyles(): () => void;
//# sourceMappingURL=styles.d.ts.map