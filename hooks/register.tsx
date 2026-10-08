import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

const place = atom({ plugin: 'franja', key: 'place' } as const, {
  branch: null,
  changes: 0,
  folder: null,
})
const turn = atom({ plugin: 'franja', key: 'turn' } as const, null)
const last = atom({ plugin: 'franja', key: 'last' } as const, null)

// Cells of the context gauge.
const CELLS = 8
// One frame of the band while a turn runs; the desktop redraws ten times a second at most.
const FRAME_MS = 120
// Frames the timer outlives the band last seeing the turn at work.
const IDLE_FRAMES = 25

// The band's accent: a red livelier than the theme's.
const ACCENT = '#ff3b30'

// The diamond's beat while a turn runs, one step every other frame.
const PULSE = '◇◈◆◈'

// How long git may take to list the uncommitted files.
const STATUS_MS = 3000
// The argument that says what a tool call is about: the first of these it carries.
const SUBJECTS = [
  'file_path',
  'notebook_path',
  'command',
  'pattern',
  'query',
  'url',
  'skill',
  'description',
]
// Characters of that argument the band keeps.
const MAX_SUBJECT = 28
// A session the desktop app started with no folder runs in one of these.
const SCRATCH = /[\\/]scratch-workspaces[\\/]/

const tone = (percent: number) =>
  percent >= 60 && percent < 85 ? 'warning' : ACCENT

const baseName = (path: string) =>
  path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const rest = `${Math.floor(s / 60) % 60}:${String(s % 60).padStart(2, '0')}`

  return s >= 3600 ? `${Math.floor(s / 3600)}:${rest.padStart(5, '0')}` : rest
}

/** A tool call in a few words: `Edit register.tsx`, `Bash git status`. */
const labelOf = (e: Record<string, unknown>) => {
  const name = String(e.tool).replace(/^mcp__.*__/, '')
  const key = SUBJECTS.find(one => typeof e[one] === 'string')
  if (key === undefined) return name
  const said = String(e[key])
  const subject = key.endsWith('_path')
    ? baseName(said)
    : (said.trim().split('\n')[0] ?? '').replace(/^https?:\/\//, '')
  if (subject === '') return name

  return subject.length > MAX_SUBJECT
    ? `${name} ${subject.slice(0, MAX_SUBJECT - 1)}…`
    : `${name} ${subject}`
}

const refresh = async ($: EngineInterface) => {
  let name: string | null = null
  try {
    const head = await $.fs.read('.git/HEAD')
    name =
      /^ref: refs\/heads\/(.+)$/m.exec(head)?.[1] ??
      (head.trim().slice(0, 7) || null)
  } catch {
    // Not a repository (or a worktree's .git file): the band draws the folder.
  }
  // Without the optional locks, so a git command of the turn's never waits on this one.
  const changes =
    name === null
      ? 0
      : await $.process
          .run(['git', '--no-optional-locks', 'status', '--porcelain'], {
            timeoutMs: STATUS_MS,
          })
          .then(ran =>
            ran.exitCode === 0
              ? ran.stdout.split('\n').filter(line => line.trim() !== '').length
              : 0,
          )
          .catch(() => 0)
  const cwd = await $.session.cwd().catch(() => '')
  const folder = SCRATCH.test(cwd) ? 'sin carpeta' : baseName(cwd) || null
  await update($, place, () => ({ branch: name, changes, folder }))
}

export const register: Register = on => {
  let timer: Timer | undefined
  let idle = 0

  on('session.start', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    timer?.cancel()
    idle = 0
    timer = $.clock.every(FRAME_MS, () => {
      // A turn that ended with no turn.complete would leave this running.
      idle += 1
      if (idle > IDLE_FRAMES) {
        timer?.cancel()
      } else {
        $.ui.invalidate('ui.render')
      }
    })
    const [startedAt, { cost }] = await Promise.all([
      $.clock.now(),
      $.session.usage(),
    ])
    await update($, turn, () => ({
      startedAt,
      tool: null,
      usd: cost?.usd ?? null,
    }))

    return next(e)
  })

  // The main loop's calls only: a subagent's are its own business.
  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      const tool = labelOf(e)
      await update($, turn, one => one && { ...one, tool })
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }

    timer?.cancel()
    const [began, { cost }] = await Promise.all([
      read($, turn),
      $.session.usage(),
    ])
    const usd =
      began === null || began.usd === null || cost === undefined
        ? null
        : Math.max(0, cost.usd - began.usd)
    await update($, turn, () => null)
    await update($, last, () => ({ ms: e.durationMs, usd }))
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const [model, usage, where, running, spent, now] = await Promise.all([
      $.session.model(),
      $.session.usage(),
      read($, place),
      read($, turn),
      read($, last),
      $.clock.now(),
    ])
    const { isWorking } = e.props
    if (isWorking) {
      idle = 0
    }
    const { percent } = usage.context
    const full = Math.round((Math.min(100, percent ?? 0) / 100) * CELLS)
    const fiveHour = usage.rateLimits.find(
      limit => limit.kind === 'five_hour',
    )
    const used =
      fiveHour === undefined ? undefined : Math.round(fiveHour.percentUsed)

    // The left end holds its width; the right end gives way, the tool's label
    // first, where a docked pane leaves the band narrow.
    return (
      <Box
        flexDirection="row"
        justifyContent="space-between"
        gap={2}
        width="100%"
      >
        <Box flexDirection="row" gap={2} flexShrink={0}>
          <Box flexDirection="row" gap={1}>
            <Text color={ACCENT}>
              {isWorking
                ? `${PULSE[Math.floor(now / FRAME_MS / 2) % PULSE.length]}`
                : '◆'}
            </Text>
            <Text bold>{model.replace(/^claude-/, '')}</Text>
          </Box>

          {where.branch !== null && (
            <Box flexDirection="row" gap={1}>
              <Text dimColor>⎇</Text>
              <Text>{where.branch}</Text>
              {where.changes > 0 && <Text dimColor>{`±${where.changes}`}</Text>}
            </Box>
          )}

          {where.branch === null && where.folder !== null && (
            <Box flexDirection="row" gap={1}>
              <Text dimColor>⌂</Text>
              <Text>{where.folder}</Text>
            </Box>
          )}

          {percent !== undefined && (
            <Box flexDirection="row" gap={1}>
              <Box flexDirection="row">
                {full > 0 && (
                  <Text color={tone(percent)}>{'▰'.repeat(full)}</Text>
                )}
                {full < CELLS && (
                  <Text dimColor>{'▱'.repeat(CELLS - full)}</Text>
                )}
              </Box>
              <Text dimColor>{`${percent}%`}</Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="row" gap={2} minWidth={0}>
          {isWorking && running !== null && (
            <Box flexDirection="row" gap={1} minWidth={0}>
              {running.tool !== null && (
                <Text wrap="truncate-end">{running.tool}</Text>
              )}
              <Box flexShrink={0}>
                <Text dimColor>
                  {running.tool === null
                    ? clock(now - running.startedAt)
                    : `· ${clock(now - running.startedAt)}`}
                </Text>
              </Box>
            </Box>
          )}

          {!(isWorking && running !== null) && spent !== null && (
            <Box flexShrink={0}>
              <Text dimColor>
                {spent.usd !== null && spent.usd >= 0.01
                  ? `último ${clock(spent.ms)} · $${spent.usd.toFixed(2)}`
                  : `último ${clock(spent.ms)}`}
              </Text>
            </Box>
          )}

          {used !== undefined && (
            <Box flexDirection="row" gap={1} flexShrink={0}>
              <Text dimColor>5h</Text>
              {used < 60 ? (
                <Text dimColor>{`${used}%`}</Text>
              ) : (
                <Text color={tone(used)}>{`${used}%`}</Text>
              )}
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
