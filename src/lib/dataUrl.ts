/** Resolve a file under public/data — local build path or remote auto-refresh URL. */
export function dataFile(name: string): string {
  const remote = (import.meta.env.VITE_DATA_URL as string | undefined)?.replace(/\/$/, '')
  if (remote) return `${remote}/${name}`
  return `${import.meta.env.BASE_URL}data/${name}`
}

/** Prefer remote (self-updating), fall back to files shipped with the site. */
export async function fetchDataJson<T>(name: string): Promise<T | null> {
  const remote = (import.meta.env.VITE_DATA_URL as string | undefined)?.replace(/\/$/, '')
  const urls = [
    ...(remote ? [`${remote}/${name}`] : []),
    `${import.meta.env.BASE_URL}data/${name}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      return (await res.json()) as T
    } catch {
      // try next
    }
  }
  return null
}
