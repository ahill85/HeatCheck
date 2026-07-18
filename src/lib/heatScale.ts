export type HeatLevelId =
  | 'ice'
  | 'chilly'
  | 'lukewarm'
  | 'warming'
  | 'toasty'
  | 'hot'
  | 'redhot'
  | 'nuclear'

export type HeatLevel = {
  id: HeatLevelId
  emoji: string
  label: string
  /** Short punchy line under the badge */
  vibe: string
}

const LEVELS: HeatLevel[] = [
  {
    id: 'ice',
    emoji: '🧊',
    label: 'Ice cold',
    vibe: 'Nobody is talking about this.',
  },
  {
    id: 'chilly',
    emoji: '🥶',
    label: 'Chilly',
    vibe: 'Barely a whisper.',
  },
  {
    id: 'lukewarm',
    emoji: '😐',
    label: 'Lukewarm',
    vibe: 'Meh energy. Not a spike.',
  },
  {
    id: 'warming',
    emoji: '🌤️',
    label: 'Warming up',
    vibe: 'Starting to catch a little heat.',
  },
  {
    id: 'toasty',
    emoji: '🔥',
    label: 'Toasty',
    vibe: 'People are noticing.',
  },
  {
    id: 'hot',
    emoji: '🌶️',
    label: 'Hot',
    vibe: 'This is cooking.',
  },
  {
    id: 'redhot',
    emoji: '🥵',
    label: 'Red hot',
    vibe: 'Steaming. Worth jumping on.',
  },
  {
    id: 'nuclear',
    emoji: '🌋',
    label: 'Nuclear',
    vibe: 'The internet is melting.',
  },
]

/** Map a 0–100 search score onto the fun heat scale. */
export function heatFromScore(score: number): HeatLevel {
  if (score >= 88) return LEVELS[7]
  if (score >= 75) return LEVELS[6]
  if (score >= 60) return LEVELS[5]
  if (score >= 45) return LEVELS[4]
  if (score >= 30) return LEVELS[3]
  if (score >= 18) return LEVELS[2]
  if (score >= 8) return LEVELS[1]
  return LEVELS[0]
}

/**
 * Map board momentum onto the scale.
 * Uses share of the current list peak so #1 always looks spicy,
 * with absolute floors so tiny spikes don't fake "nuclear".
 */
export function heatFromMomentum(momentum: number, peak: number): HeatLevel {
  const p = Math.max(peak, 1)
  const ratio = momentum / p
  const m = momentum

  if (m >= 400 && ratio >= 0.85) return LEVELS[7]
  if (m >= 220 && ratio >= 0.55) return LEVELS[6]
  if (m >= 120 && ratio >= 0.35) return LEVELS[5]
  if (m >= 60 && ratio >= 0.2) return LEVELS[4]
  if (m >= 30 && ratio >= 0.1) return LEVELS[3]
  if (m >= 15) return LEVELS[2]
  if (m >= 5) return LEVELS[1]
  return LEVELS[0]
}

export function heatRankLabel(index: number, heat: HeatLevel): string {
  if (index === 0 && (heat.id === 'nuclear' || heat.id === 'redhot')) {
    return 'Hottest right now'
  }
  return heat.label
}
