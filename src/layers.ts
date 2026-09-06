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

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { deriveTarget, MCP_CLIENT_MODULE, serverNameOf, type McpLoaderRow } from './aggregate.ts'
import type {
  McpConfigEntryView,
  McpConfigInventoryView,
  McpConfigLayerKind,
  McpConfigOccurrenceView,
} from './wire.ts'

/** Profile base-config filename (empty by default; kept for completeness). */
const PROFILE_BASE_FILENAME = 'cordis.yml'
/** The profile patch-layer filename the console writes (append-only). */
const PROFILE_PATCH_FILENAME = 'cordis.patch.yml'
/** Agent-preset file name inside each `.agent-presets/<name>/` directory. */
const AGENT_PRESET_FILENAME = 'agent.cordis.yml'
/** Agent-preset display-name file. */
const AGENT_PRESET_META_FILENAME = 'preset.yml'
/** Human label prefix used for the profile's own layer files. */
const PROFILE_LABEL_PREFIX = 'profile · '

/** The raw face of a `!!js` expression node after YAML parsing. */
interface JsExprNode {
  readonly __jsExpr?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsExpr(value: unknown): value is JsExprNode {
  return isObject(value) && '__jsExpr' in value
}

/** One scanned layer file plus how to present it. */
export interface LayerSpec {
  /** Which layer kind this file belongs to. */
  layer: McpConfigLayerKind
  /** Short human label shown next to the file (preset display names pass through). */
  label: string
  /** Absolute file path. */
  file: string
}

/** The two profile-layer files of one profile directory. */
export function profileLayerSpecs(baseDir: string): readonly LayerSpec[] {
  return [
    { layer: 'profile-cordis', label: `${PROFILE_LABEL_PREFIX}${PROFILE_BASE_FILENAME}`, file: join(baseDir, PROFILE_BASE_FILENAME) },
    { layer: 'profile-patch', label: `${PROFILE_LABEL_PREFIX}${PROFILE_PATCH_FILENAME}`, file: join(baseDir, PROFILE_PATCH_FILENAME) },
  ]
}

/**
 * Discover every agent-preset config file under the DSH home that shares the
 * given profile directory. `baseDir` is expected to be
 * `<dsh-home>/profiles/<name>`; both the canonical relative layout and a
 * profile directory that IS the home are accepted.
 *
 * @param baseDir - absolute profile directory, or null when unknown.
 * @returns the preset specs sorted by display label.
 */
export function agentPresetSpecs(baseDir: string | null): readonly LayerSpec[] {
  if (baseDir === null) return []
  const candidates: readonly string[] = [
    join(baseDir, '..', '..', '.agent-presets'),
    join(baseDir, '.agent-presets'),
  ]
  const presetsRoot = candidates.find(dir => existsSync(dir))
  if (presetsRoot === undefined) return []
  const specs: LayerSpec[] = []
  for (const entry of readdirSync(presetsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const presetDir = join(presetsRoot, entry.name)
    const file = join(presetDir, AGENT_PRESET_FILENAME)
    if (!existsSync(file)) continue
    specs.push({ layer: 'agent-preset', label: presetDisplayName(presetDir) ?? entry.name, file })
  }
  specs.sort((left, right) => (left.label < right.label ? -1 : 1))
  return specs
}

/** Display name of one agent preset (its `preset.yml` `name`), or null. */
function presetDisplayName(presetDir: string): string | null {
  const metaFile = join(presetDir, AGENT_PRESET_META_FILENAME)
  if (!existsSync(metaFile)) return null
  try {
    const doc = parseYamlText(readFileSync(metaFile, 'utf8'))
    if (!isObject(doc)) return null
    const name = doc['name']
    return typeof name === 'string' && name !== '' ? name : null
  } catch {
    return null
  }
}

/** Parse one layer text with the `!!js` tag handled (never evaluated). */
function parseYamlText(text: string): unknown {
  return parseYaml(text, {
    schema: 'core',
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string): unknown => ({ __jsExpr: value }) }],
  })
}

/** One mcp-client row extracted from one layer file. */
interface ExtractedRow {
  /** Entry id written in the file, or the server namespace fallback. */
  entryId: string
  /** Effective disabled at this occurrence; `null` = `!!js` (never evaluated). */
  disabled: boolean | null
  /** Whether the disabled fact is a `!!js` expression. */
  disabledDynamic: boolean
  /** Raw config; may be anything (kept raw; display helpers are defensive). */
  config: unknown
}

/** Normalize one raw `disabled` value. */
function normalizeDisabled(raw: unknown): { disabled: boolean | null; disabledDynamic: boolean } {
  if (typeof raw === 'boolean') return { disabled: raw, disabledDynamic: false }
  if (isJsExpr(raw)) return { disabled: null, disabledDynamic: true }
  // Absent or malformed: a loader row defaults to enabled.
  return { disabled: false, disabledDynamic: false }
}

/** Whether one raw loader entry is an mcp-client row (by module name). */
function isMcpClientEntry(raw: unknown): boolean {
  if (!isObject(raw)) return false
  return raw['name'] === MCP_CLIENT_MODULE
}

/**
 * Collect the mcp-client rows of one parsed layer document, honoring
 * same-file bare disable overrides (`- id: mcp-client-x` + `disabled` rows,
 * which the loader applies to the insert row in the same file).
 *
 * @param doc - the parsed top-level loader patch array.
 * @returns rows keyed by entry id, in document order of first appearance.
 */
export function extractRowsFromLayer(doc: unknown): readonly ExtractedRow[] {
  if (!Array.isArray(doc)) return []
  const rows = new Map<string, ExtractedRow>()
  const bareOverrides: Array<{ entryId: string; disabled: unknown }> = []
  let counter = 0
  const ingest = (raw: Record<string, unknown>): void => {
    const rawId = raw['id']
    const entryId = typeof rawId === 'string' && rawId !== '' ? rawId : `entry:${counter}`
    counter += 1
    const normalized = normalizeDisabled(raw['disabled'])
    rows.set(entryId, {
      entryId,
      disabled: normalized.disabled,
      disabledDynamic: normalized.disabledDynamic,
      config: raw['config'],
    })
  }
  for (const entry of doc) {
    if (!isObject(entry)) continue
    const insert = entry['insert']
    if (Array.isArray(insert)) {
      for (const item of insert) {
        if (isMcpClientEntry(item)) ingest(item)
      }
      continue
    }
    if (isMcpClientEntry(entry)) {
      ingest(entry)
      continue
    }
    // A bare override row (`- id: … disabled: …` without `name`): applied
    // after the pass so it can override an earlier insert row of the same id.
    if (typeof entry['id'] === 'string' && entry['id'] !== '' && 'disabled' in entry) {
      bareOverrides.push({ entryId: entry['id'], disabled: entry['disabled'] })
    }
  }
  for (const override of bareOverrides) {
    const target = rows.get(override.entryId)
    if (target === undefined) continue
    const normalized = normalizeDisabled(override.disabled)
    target.disabled = normalized.disabled
    target.disabledDynamic = normalized.disabledDynamic
  }
  return [...rows.values()]
}

/**
 * Scan one layer file text into occurrences. Returns `null` when the text
 * does not parse (the caller surfaces the file-level error).
 */
function scanText(spec: LayerSpec, text: string): readonly McpConfigOccurrenceView[] | null {
  let doc: unknown
  try {
    doc = parseYamlText(text)
  } catch {
    return null
  }
  const occurrences: McpConfigOccurrenceView[] = []
  for (const row of extractRowsFromLayer(doc)) {
    const config = isObject(row.config) ? row.config : {}
    const { transport, target } = deriveTarget(config)
    const serverName = serverNameOf(config, row.entryId)
    occurrences.push({
      entryId: row.entryId,
      serverName,
      layer: spec.layer,
      layerLabel: spec.label,
      file: spec.file,
      disabled: row.disabled,
      disabledDynamic: row.disabledDynamic,
      transport,
      target,
    })
  }
  return occurrences
}

/** Names of the loader rows in the current snapshot (effective now). */
function effectiveNamesOf(rows: readonly McpLoaderRow[]): ReadonlySet<string> {
  const names = new Set<string>()
  for (const row of rows) names.add(serverNameOf(row.config, `entry:${row.entryId}`))
  return names
}

/**
 * Build the read-only cross-layer inventory for one profile directory.
 *
 * @param baseDir - absolute profile directory, or null when unknown.
 * @param loaderRows - the loader rows of the current snapshot (for the
 *   `effective` flag). Pass an empty array when none are available.
 * @returns the wire inventory view.
 */
export function scanConfigLayers(baseDir: string | null, loaderRows: readonly McpLoaderRow[] = []): McpConfigInventoryView {
  if (baseDir === null) {
    return { scanned: false, error: null, entries: [] }
  }
  const specs: readonly LayerSpec[] = [...profileLayerSpecs(baseDir), ...agentPresetSpecs(baseDir)]
  const effective = effectiveNamesOf(loaderRows)
  const perName = new Map<string, McpConfigOccurrenceView[]>()
  const errors: string[] = []
  for (const spec of specs) {
    if (!existsSync(spec.file)) continue
    let text: string
    try {
      text = readFileSync(spec.file, 'utf8')
    } catch {
      errors.push(`${basename(spec.file)}: unreadable`)
      continue
    }
    const occurrences = scanText(spec, text)
    if (occurrences === null) {
      errors.push(`${basename(spec.file)}: unparsable layer`)
      continue
    }
    for (const occurrence of occurrences) {
      const list = perName.get(occurrence.serverName) ?? []
      list.push(occurrence)
      perName.set(occurrence.serverName, list)
    }
  }
  const entries: McpConfigEntryView[] = [...perName.entries()]
    .map(([serverName, occurrences]) => {
      const profileVisible = occurrences.some(occ => occ.layer === 'profile-cordis' || occ.layer === 'profile-patch')
      return {
        serverName,
        profileVisible,
        effective: effective.has(serverName),
        occurrences,
      }
    })
    .sort((left, right) => (left.serverName < right.serverName ? -1 : 1))
  return {
    scanned: true,
    error: errors.length === 0 ? null : errors.join('; '),
    entries,
  }
}
