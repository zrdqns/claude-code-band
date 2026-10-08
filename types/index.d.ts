/** Where the session works: its branch and uncommitted files, else its folder. */
export type Place = {
  branch: string | null
  changes: number
  folder: string | null
}

/** The main loop's turn in flight: its start, its last tool, the cost then. */
export type Turn = {
  startedAt: number
  tool: string | null
  usd: number | null
} | null

/** What the last finished turn took. */
export type Last = { ms: number; usd: number | null } | null

declare module 'claude-code' {
  interface PluginState {
    franja: { place: Place; turn: Turn; last: Last }
  }
}
