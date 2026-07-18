import type { TrendItem } from './types'

export type SportLeague =
  | 'all'
  | 'nba'
  | 'afl'
  | 'nfl'
  | 'mlb'
  | 'nhl'
  | 'soccer'
  | 'tennis'
  | 'other'

export const SPORT_LEAGUES: { id: SportLeague; label: string }[] = [
  { id: 'all', label: 'All sports' },
  { id: 'nba', label: 'NBA' },
  { id: 'afl', label: 'AFL' },
  { id: 'nfl', label: 'NFL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'nhl', label: 'NHL' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'other', label: 'Other' },
]

const LEAGUE_PATTERNS: Record<Exclude<SportLeague, 'all' | 'other'>, RegExp[]> = {
  nba: [
    /\bnba\b/i,
    /\bbasketball\b/i,
    /\blakers\b/i,
    /\bceltics\b/i,
    /\bwarriors\b/i,
    /\bknicks\b/i,
    /\bnuggets\b/i,
    /\bmiami heat\b/i,
    /\bokc thunder\b/i,
    /\bmavericks\b/i,
    /\bphoenix suns\b/i,
    /\bmilwaukee bucks\b/i,
    /\braptors\b/i,
    /\blebron\b/i,
    /\bstephen curry\b/i,
    /\bdurant\b/i,
    /\bembiid\b/i,
    /\bjokic\b/i,
    /\bfantasy basketball\b/i,
  ],
  afl: [
    /\bafl\b/i,
    /\baustralian rules\b/i,
    /\baustralian football\b/i,
    /\bcollingwood\b/i,
    /\bcarlton blues\b/i,
    /\brichmond tigers\b/i,
    /\bessendon\b/i,
    /\bhawthorn\b/i,
    /\bgeelong\b/i,
    /\bfremantle\b/i,
    /\bwest coast eagles\b/i,
    /\badelaide crows\b/i,
    /\bbrisbane lions\b/i,
    /\bmelbourne demons\b/i,
    /\bport adelaide\b/i,
    /\bsydney swans\b/i,
    /\bgws giants\b/i,
    /\bgold coast suns\b/i,
    /\bst kilda\b/i,
    /\bnorth melbourne\b/i,
    /\bwestern bulldogs\b/i,
  ],
  nfl: [
    /\bnfl\b/i,
    /\bsuper bowl\b/i,
    /\bquarterback\b/i,
    /\bchiefs\b/i,
    /\beagles\b/i,
    /\bcowboys\b/i,
    /\bpatriots\b/i,
    /\b49ers\b/i,
    /\bpackers\b/i,
    /\bbills\b/i,
    /\bravens\b/i,
    /\bfantasy football\b/i,
  ],
  mlb: [
    /\bmlb\b/i,
    /\bbaseball\b/i,
    /\bworld series\b/i,
    /\byankees\b/i,
    /\bdodgers\b/i,
    /\bred sox\b/i,
    /\bcubs\b/i,
    /\bmets\b/i,
    /\bhome run\b/i,
  ],
  nhl: [
    /\bnhl\b/i,
    /\bhockey\b/i,
    /\bstanley cup\b/i,
    /\bmaple leafs\b/i,
    /\bbruins\b/i,
    /\boilers\b/i,
    /\brangers\b/i,
    /\bcanadiens\b/i,
  ],
  soccer: [
    /\bsoccer\b/i,
    /\bpremier league\b/i,
    /\bla liga\b/i,
    /\bserie a\b/i,
    /\bbundesliga\b/i,
    /\bchampions league\b/i,
    /\bmls\b/i,
    /\bworld cup\b/i,
    /\bmanchester united\b/i,
    /\bmanchester city\b/i,
    /\bliverpool\b/i,
    /\barsenal\b/i,
    /\bchelsea\b/i,
    /\breal madrid\b/i,
    /\bbarcelona\b/i,
    /\bpsg\b/i,
    /\bfootball club\b/i,
    /\buefa\b/i,
    /\bfifa\b/i,
  ],
  tennis: [
    /\btennis\b/i,
    /\bwimbledon\b/i,
    /\bus open\b/i,
    /\bfrench open\b/i,
    /\baustralian open\b/i,
    /\batp\b/i,
    /\bwta\b/i,
    /\bdjokovic\b/i,
    /\balcaraz\b/i,
    /\bsinner\b/i,
  ],
}

function haystack(item: TrendItem): string {
  return [
    item.topic,
    item.summary,
    ...item.links.map((l) => `${l.title} ${l.source}`),
  ]
    .join(' ')
    .toLowerCase()
}

export function matchSportLeague(item: TrendItem): Exclude<SportLeague, 'all'> {
  const text = haystack(item)
  for (const [league, patterns] of Object.entries(LEAGUE_PATTERNS) as Array<
    [Exclude<SportLeague, 'all' | 'other'>, RegExp[]]
  >) {
    if (patterns.some((re) => re.test(text))) return league
  }
  return 'other'
}

export function filterBySportLeague(
  items: TrendItem[],
  league: SportLeague,
): TrendItem[] {
  if (league === 'all') return items
  return items.filter((item) => matchSportLeague(item) === league)
}
