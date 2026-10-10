type Props = { className?: string }

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const FlagIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M5 21V4m0 0l11 3-11 3" />
  </svg>
)

export const PlayIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M6 4l14 8-14 8V4z" />
  </svg>
)

export const UsersIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M16 20v-1a4 4 0 00-4-4H6a4 4 0 00-4 4v1M9 7a4 4 0 100 8 4 4 0 000-8zM22 20v-1a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" />
  </svg>
)

export const MapIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2zM9 3v16M15 5v16" />
  </svg>
)

export const HistoryIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-7.6 4.2M3 4v4h4M12 7v5l4 2" />
  </svg>
)

export const CogIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3m0 14v3M4.2 4.2l2.1 2.1m11.4 11.4l2.1 2.1M2 12h3m14 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
  </svg>
)

export const CoinIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9.5A3.5 3.5 0 1012 15a3.5 3.5 0 003-1.5M8.5 11h5M8.5 13h5" />
  </svg>
)

export const GridIcon = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
  </svg>
)

export const TrophyIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
  </svg>
)

export const PlusIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const MinusIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
)

export const TrashIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </svg>
)

export const SearchIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4.3-4.3" />
  </svg>
)

export const ChevronLeft = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const ChevronRight = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9 18l6-6-6-6" />
  </svg>
)
