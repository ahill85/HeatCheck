import type { Category } from './types'

const RULES: Array<{ category: Exclude<Category, 'everything'>; patterns: RegExp[] }> = [
  {
    category: 'games',
    patterns: [
      /\bgame(s|r|ing)?\b/i,
      /\bsteam\b/i,
      /\bnintendo\b/i,
      /\bplaystation\b/i,
      /\bxbox\b/i,
      /\besports?\b/i,
      /\bpokemon\b/i,
      /\bminecraft\b/i,
      /\bfortnite\b/i,
      /\brpg\b/i,
      /\bindie (game|dev)\b/i,
      /\btwitch\b/i,
    ],
  },
  {
    category: 'sports',
    patterns: [
      /\bnba\b/i,
      /\bnfl\b/i,
      /\bmlb\b/i,
      /\bnhl\b/i,
      /\bsoccer\b/i,
      /\bfootball\b/i,
      /\bbasketball\b/i,
      /\btennis\b/i,
      /\bgolf\b/i,
      /\bolympic/i,
      /\bpremier league\b/i,
      /\bafl\b/i,
      /\bwimbledon\b/i,
      /\bworld cup\b/i,
      /\bfantasy (football|basketball|sports)\b/i,
    ],
  },
  {
    category: 'tech',
    patterns: [
      /\bai\b/i,
      /\bopenai\b/i,
      /\bgpt[-\s]?\d/i,
      /\bllm\b/i,
      /\bsoftware\b/i,
      /\bstartup\b/i,
      /\bapple\b/i,
      /\bgoogle\b/i,
      /\bmicrosoft\b/i,
      /\bchip(s|set)?\b/i,
      /\bcrypto\b/i,
      /\bbitcoin\b/i,
      /\bhacker news\b/i,
      /\bprogramming\b/i,
      /\bdeveloper\b/i,
      /\bcyber\b/i,
      /\bsatellite\b/i,
      /\bspacex\b/i,
    ],
  },
  {
    category: 'business',
    patterns: [
      /\bstock(s)?\b/i,
      /\bmarket(s)?\b/i,
      /\bearnings\b/i,
      /\bipo\b/i,
      /\binflation\b/i,
      /\bfed\b/i,
      /\bmerger\b/i,
      /\bacquisition\b/i,
      /\bceo\b/i,
      /\bwall street\b/i,
      /\beconomy\b/i,
      /\btariff/i,
    ],
  },
  {
    category: 'entertainment',
    patterns: [
      /\bmovie\b/i,
      /\bfilm\b/i,
      /\bhollywood\b/i,
      /\bnetflix\b/i,
      /\bhbo\b/i,
      /\bcelebrity\b/i,
      /\bmusic\b/i,
      /\balbum\b/i,
      /\bconcert\b/i,
      /\btv show\b/i,
      /\boscar/i,
      /\bemmy/i,
      /\btrailer\b/i,
      /\banime\b/i,
      /\bhollywoo?d\b/i,
    ],
  },
  {
    category: 'news',
    patterns: [
      /\belection\b/i,
      /\bpresident\b/i,
      /\bcongress\b/i,
      /\bwar\b/i,
      /\bclimate\b/i,
      /\bprotest\b/i,
      /\bpolice\b/i,
      /\bcourt\b/i,
      /\bsenate\b/i,
      /\bukraine\b/i,
      /\bgaza\b/i,
      /\bbreaking\b/i,
    ],
  },
]

export function classifyText(
  text: string,
  fallback: Exclude<Category, 'everything'> = 'news',
): Exclude<Category, 'everything'> {
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(text))) return rule.category
  }
  return fallback
}

export function normalizeTopic(title: string): string {
  return title
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and|or|of|in|on|to|for|with|is|are|as|at|by|from)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

/** Cheap fingerprint for deduping near-identical headlines */
export function topicKey(title: string): string {
  const words = normalizeTopic(title).split(' ').filter((w) => w.length > 2)
  return words.slice(0, 8).join(' ')
}
