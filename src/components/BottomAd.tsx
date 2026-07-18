import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

const EMPTY = new Set(['unfilled', 'unfill-optimized'])

/** Same footer unit as hoops-redraft — shared ca-pub on astarmedia.net */
export function BottomAd() {
  const slotRef = useRef<HTMLDivElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    const slot = slotRef.current
    if (!slot) return
    const ins = slot.querySelector<HTMLElement>('.adsbygoogle')
    if (!ins) return

    const already =
      pushed.current ||
      ins.getAttribute('data-adsbygoogle-status') != null ||
      ins.getAttribute('data-ad-status') != null

    if (!already) {
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        pushed.current = true
      } catch {
        // AdSense blocked / not loaded yet
      }
    }

    const sync = () => {
      const status = (ins.getAttribute('data-ad-status') || '').toLowerCase()
      slot.classList.toggle('is-filled', status === 'filled')
      slot.classList.toggle('is-empty', EMPTY.has(status))
      if (EMPTY.has(status)) slot.setAttribute('aria-hidden', 'true')
      else slot.removeAttribute('aria-hidden')
    }

    sync()
    const observer = new MutationObserver(sync)
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={slotRef}
      className="ad-slot"
      data-ad="bottom"
      aria-label="Advertisement"
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9167552007992876"
        data-ad-slot="2160710155"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
