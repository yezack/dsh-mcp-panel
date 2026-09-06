/**
 * Cross-layer inventory tests: row extraction from parsed loader documents
 * (insert containers, direct rows, same-file bare disable overrides, `!!js`
 * disabled facts, non-mcp rows ignored) and an end-to-end file scan over a
 * temporary DSH home (profile layer + agent presets) with the wire-schema
 * round trip.
 *
 * @module dsh-mcp-panel/test/layers.spec
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { extractRowsFromLayer, scanConfigLayers } from '../src/layers.ts'
import { MCP_CLIENT_MODULE } from '../src/aggregate.ts'

describe('extractRowsFromLayer', () => {
  it('collects insert-container rows and skips non-mcp plugins', () => {
    const doc = [
      { insert: [
        { id: 'mcp-client-ida', name: MCP_CLIENT_MODULE, disabled: true, config: { serverName: 'ida' } },
        { id: 'mcp-client-github', name: MCP_CLIENT_MODULE, config: { serverName: 'github' } },
      ] },
      { id: 'some-plugin', name: 'dsh-something', config: {} },
    ]
    const rows = extractRowsFromLayer(doc)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ entryId: 'mcp-client-ida', disabled: true, disabledDynamic: false })
    expect(rows[1]).toMatchObject({ entryId: 'mcp-client-github', disabled: false, disabledDynamic: false })
  })

  it('accepts direct rows and ignores bare overrides of unknown ids', () => {
    const doc = [
      { id: 'mcp-client-x', name: MCP_CLIENT_MODULE, config: { serverName: 'x' } },
      { id: 'mcp-client-ghost', disabled: true },
    ]
    const rows = extractRowsFromLayer(doc)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.entryId).toBe('mcp-client-x')
  })

  it('applies same-file bare disable overrides to insert rows', () => {
    const doc = [
      { insert: [{ id: 'mcp-client-ida', name: MCP_CLIENT_MODULE, config: { serverName: 'ida' } }] },
      { id: 'mcp-client-ida', disabled: true },
    ]
    const rows = extractRowsFromLayer(doc)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ entryId: 'mcp-client-ida', disabled: true, disabledDynamic: false })
  })

  it('reports a !!js disabled fact as dynamic without evaluating it', () => {
    const doc = [
      { insert: [{ id: 'mcp-client-ida', name: MCP_CLIENT_MODULE, disabled: { __jsExpr: "process.platform === 'win32'" }, config: {} }] },
    ]
    const rows = extractRowsFromLayer(doc)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.disabled).toBeNull()
    expect(rows[0]?.disabledDynamic).toBe(true)
  })
})

describe('scanConfigLayers', () => {
  it('aggregates profile + preset rows with provenance, honoring !!js', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-mcp-panel-layers-'))
    const profile = join(root, 'profiles', 'code')
    mkdirSync(profile, { recursive: true })
    const ctf = join(root, '.agent-presets', 'ctf')
    mkdirSync(ctf, { recursive: true })

    writeFileSync(join(profile, 'cordis.yml'), '[]\n')
    writeFileSync(join(profile, 'cordis.patch.yml'), [
      '- insert:',
      '    - id: mcp-client-github',
      "      name: '@deepseek-ai/dsh-mcp-client'",
      '      config:',
      '        serverName: github',
      '        transport: stdio',
      '        command: npx',
      '        args: [\'-y\', \'@modelcontextprotocol/server-github\']',
    ].join('\n') + '\n')
    writeFileSync(join(ctf, 'preset.yml'), 'name: CTF综合模式\n')
    writeFileSync(join(ctf, 'agent.cordis.yml'), [
      '- insert:',
      '    - id: mcp-client-ida',
      "      name: '@deepseek-ai/dsh-mcp-client'",
      '      disabled: true',
      '      config:',
      '        serverName: ida',
      '        transport: streamable-http',
      '        url: http://127.0.0.1:13337/mcp',
      '- insert:',
      '    - id: mcp-client-metasploit',
      "      name: '@deepseek-ai/dsh-mcp-client'",
      '      config:',
      '        serverName: metasploit',
      '        transport: stdio',
      '        command: python',
      '- id: unrelated-plugin',
      "  disabled: !!js process.platform === 'win32'",
    ].join('\n') + '\n')

    const loaderRows = [
      { entryId: 'mcp-client-github', disabled: false, fiberPhase: 'active' as const, config: { serverName: 'github' } },
    ]
    const inventory = scanConfigLayers(profile, loaderRows)
    expect(inventory.scanned).toBe(true)
    expect(inventory.error).toBeNull()
    const names = inventory.entries.map(entry => entry.serverName)
    expect(names).toEqual(['github', 'ida', 'metasploit'])

    const github = inventory.entries.find(entry => entry.serverName === 'github')
    expect(github?.profileVisible).toBe(true)
    expect(github?.effective).toBe(true)
    expect(github?.occurrences[0]?.layer).toBe('profile-patch')

    const ida = inventory.entries.find(entry => entry.serverName === 'ida')
    expect(ida?.profileVisible).toBe(false)
    expect(ida?.effective).toBe(false)
    expect(ida?.occurrences[0]?.layerLabel).toBe('CTF综合模式')
    expect(ida?.occurrences[0]?.disabled).toBe(true)
    expect(ida?.occurrences[0]?.disabledDynamic).toBe(false)
    expect(ida?.occurrences[0]?.transport).toBe('streamable-http')
    // URL must be sanitized for display.
    expect(ida?.occurrences[0]?.target).toBe('http://127.0.0.1:13337/mcp')

    const metasploit = inventory.entries.find(entry => entry.serverName === 'metasploit')
    expect(metasploit?.profileVisible).toBe(false)
    expect(metasploit?.effective).toBe(false)
    expect(metasploit?.occurrences[0]?.disabled).toBe(false)

    // The unrelated !!js plugin row must not break the layer parse.
    expect(inventory.entries.every(entry => entry.occurrences.length >= 1)).toBe(true)

    rmSync(root, { recursive: true, force: true })
  })

  it('tolerates an unparsable preset file and reports the error', () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-mcp-panel-layers-'))
    const profile = join(root, 'profiles', 'code')
    mkdirSync(profile, { recursive: true })
    const ctf = join(root, '.agent-presets', 'ctf')
    mkdirSync(ctf, { recursive: true })
    writeFileSync(join(profile, 'cordis.patch.yml'), '[]\n')
    writeFileSync(join(ctf, 'agent.cordis.yml'), '- id: [unclosed\n')

    const inventory = scanConfigLayers(profile, [])
    expect(inventory.scanned).toBe(true)
    expect(inventory.error).toMatch(/agent\.cordis\.yml/)
    expect(inventory.entries).toHaveLength(0)

    rmSync(root, { recursive: true, force: true })
  })

  it('returns scanned=false when no profile dir is known', () => {
    expect(scanConfigLayers(null, [])).toMatchObject({ scanned: false, error: null, entries: [] })
  })
})
