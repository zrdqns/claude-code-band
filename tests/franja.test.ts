import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 100,
} as never

const SCRATCH =
  'C:\\Users\\Daniel\\AppData\\Roaming\\Claude\\scratch-workspaces\\a1\\b2\\scratch-2026-10-08-7f54c4'

/**
 * A session in `demo` at this share of its context window, $1 spent: on
 * `main` with two files uncommitted, or with `head` null in no repository.
 */
const world = (
  on: On,
  percent: number,
  { head = 'ref: refs/heads/main\n' as string | null, cwd = 'C:\\Proyectos\\demo' } = {},
) => {
  const clock = mock.clock(on, { now: 1000000 })
  let usd = 1
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.cwd', () => ({ value: cwd }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { window: 1000000, percent },
      rateLimits: [{ kind: 'five_hour', percentUsed: 72 }],
      cost: { usd },
    } as never,
  }))
  on('fs.read', () =>
    head === null ? { deny: 'no such file' } : { value: head },
  )
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: ' M a.ts\n?? b.ts\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('tool.call', () => ({ result: null as never }))
  on('turn.complete', () => ({ text: '' }))

  return {
    clock,
    spend: (to: number) => {
      usd = to
    },
  }
}

const turn = ($: Engine, durationMs: number) =>
  $.turn.complete({
    answer: '',
    durationMs,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })

const drawn = async ($: Engine, surface: 'terminal' | 'desktop', props = BAND) => {
  const band = await $.ui.mount({
    plugin: 'franja',
    surface,
    component: 'AbovePrompt',
    props,
  })
  const texts = (await band.findAll({ type: 'Text' })).map(found => found.text)
  await band.unmount()

  return texts
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`en reposo en ${surface}: modelo, rama y cambios, contexto, último turno y límite`, async ($, on) => {
    world(on, 25)

    // A long turn ends with no toast and no sound: nothing beneath answers them.
    await turn($, 45000)
    const texts = await drawn($, surface)

    expect(texts).toEqual([
      '◆',
      'opus-5-5',
      '⎇',
      'main',
      '±2',
      '▰▰',
      '▱▱▱▱▱▱',
      '25%',
      'último 0:45',
      '5h',
      '72%',
    ])
  })
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`sin repositorio en ${surface}, la carpeta ocupa el lugar de la rama`, async ($, on) => {
    world(on, 25, { head: null })

    await turn($, 45000)
    const texts = await drawn($, surface)

    expect(texts.slice(0, 4)).toEqual(['◆', 'opus-5-5', '⌂', 'demo'])
    expect(texts).not.toContain('⎇')
  })
}

test('una sesión sin carpeta lo dice en vez de nombrar la de trabajo', async ($, on) => {
  world(on, 25, { head: null, cwd: SCRATCH })

  await turn($, 45000)
  const texts = await drawn($, 'desktop')

  expect(texts.slice(2, 4)).toEqual(['⌂', 'sin carpeta'])
})

test('el último turno lleva lo que costó', async ($, on) => {
  const { spend } = world(on, 25)

  await $.turn.start({ text: '', turnId: 't1' })
  spend(1.25)
  await turn($, 72000)
  const texts = await drawn($, 'terminal')

  expect(texts).toContain('último 1:12 · $0.25')
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`mientras trabaja en ${surface}, el rombo late, el cronómetro corre y el medidor no se mueve`, async ($, on) => {
    const { clock } = world(on, 90)

    await $.turn.start({ text: '', turnId: 't1' })
    await $.tool.call({
      tool: 'Read',
      file_path: 'C:\\Proyectos\\demo\\notas.md',
    })
    const band = await $.ui.mount({
      plugin: 'franja',
      surface,
      component: 'AbovePrompt',
      props: { ...(BAND as object), isWorking: true } as never,
    })
    const texts = async () =>
      (await band.findAll({ type: 'Text' })).map(found => found.text ?? '')
    const first = await texts()
    await clock.advance(6000)
    const later = await texts()
    await band.unmount()

    const beat = (all: string[]) => all.find(text => /^[◇◈◆]$/.test(text))
    expect(first).toContain('▰▰▰▰▰▰▰')
    expect(later).toContain('▰▰▰▰▰▰▰')
    expect(later).toContain('90%')
    expect(first).toContain('Read notas.md')
    expect(first).toContain('· 0:00')
    expect(later).toContain('· 0:06')
    expect(later.slice(-2)).toEqual(['5h', '72%'])
    expect(beat(first)).toBeDefined()
    expect(beat(later)).not.toBe(beat(first))
  })
}

test('antes de la primera herramienta solo corre el cronómetro', async ($, on) => {
  world(on, 25)

  await $.turn.start({ text: '', turnId: 't1' })
  const texts = await drawn($, 'terminal', {
    ...(BAND as object),
    isWorking: true,
  } as never)

  expect(texts.slice(-3)).toEqual(['0:00', '5h', '72%'])
})
