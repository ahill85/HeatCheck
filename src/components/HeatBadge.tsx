import type { HeatLevel } from '../lib/heatScale'

type Props = {
  heat: HeatLevel
  /** Optional tiny secondary text (e.g. raw momentum for nerds) */
  detail?: string
  size?: 'sm' | 'md'
}

export function HeatBadge({ heat, detail, size = 'md' }: Props) {
  return (
    <div
      className={`heat-badge heat-${heat.id} heat-${size}`}
      title={detail ? `${heat.label} · ${detail}` : heat.label}
    >
      <span className="heat-emoji" aria-hidden="true">
        {heat.emoji}
        {(heat.id === 'redhot' || heat.id === 'nuclear') && (
          <span className="heat-steam" aria-hidden="true" />
        )}
      </span>
      <span className="heat-copy">
        <span className="heat-label">{heat.label}</span>
        {detail && <span className="heat-detail">{detail}</span>}
      </span>
    </div>
  )
}
