# band

A mod for [Claude Code](https://claude.com/claude-code): a one-line band above the prompt with what is worth keeping in sight while you work.

```
◆ opus-5-5  ⎇ main ±3  ▰▰▱▱▱▱▱▱ 24%          Edit register.tsx · 0:42   5h 38%
```

## What it shows

| Segment | Meaning |
| --- | --- |
| `◆ opus-5-5` | The session's model. The diamond pulses while a turn is running. |
| `⎇ main ±3` | Current branch and uncommitted files. Outside a repository, `⌂ folder`. |
| `▰▰▱▱▱▱▱▱ 24%` | Context window used. Yellow between 60% and 85%. |
| `Edit register.tsx · 0:42` | During a turn: the last tool called and the turn's stopwatch. |
| `last 1:12 · $0.25` | When idle: the last turn's length and cost. |
| `5h 38%` | 5-hour usage limit. Yellow from 60%, red from 85%. |

The left side keeps its width; when a side pane narrows the band, the tool's label gives way first.

## Installation

At the prompt of a terminal session:

```
/plugin install band --marketplace zrdqns/claude-code-band
```

Answer `y` to add the marketplace and choose the scope (the user scope loads it in every session, including the desktop app's).

To try it from a local copy, without installing it:

```bash
claude --plugin-dir ./claude-code-band
```

## Requirements

- `git` on the `PATH` for the change counter (`±N`). Without it, the band shows the branch with no counter.

## Development

```bash
claude plugin validate .
claude plugin test .
```

The module is in [`hooks/register.tsx`](hooks/register.tsx), its state contract in [`types/index.d.ts`](types/index.d.ts) and the tests in [`tests/`](tests).

## License

[MIT](LICENSE)
