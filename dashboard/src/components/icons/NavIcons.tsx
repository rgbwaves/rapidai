// SVG icon components for sidebar navigation and UI chrome.
// All icons use currentColor so they inherit text color from parent.
// viewBox is 24x24 throughout for consistent sizing.

interface IconProps {
  className?: string
  size?: number
}

function Icon({ className = '', size = 20, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconZap({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Icon>
  )
}

export function IconActivity({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Icon>
  )
}

export function IconLayers({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Icon>
  )
}

export function IconBarChart({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Icon>
  )
}

export function IconShield({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  )
}

export function IconCpu({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </Icon>
  )
}

export function IconTrendingUp({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </Icon>
  )
}

export function IconSettings({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  )
}

export function IconChevronLeft({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  )
}

export function IconChevronRight({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  )
}

export function IconExternalLink({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </Icon>
  )
}

export function IconUser({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  )
}

export function IconRefreshCw({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Icon>
  )
}

export function IconAlertTriangle({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  )
}

export function IconCheckCircle({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icon>
  )
}

export function IconLoader({ className, size }: IconProps) {
  return (
    <Icon className={className} size={size}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </Icon>
  )
}

// RAPID AI brand mark — simplified turbine/rotor shape
export function IconBrandMark({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Center hub */}
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      {/* Three blades at 120deg */}
      <path
        d="M12 9.5 C12 6.5 14.5 4 14.5 4 C14.5 4 16.5 6.5 13.8 9.2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M12 9.5 C12 6.5 14.5 4 14.5 4 C14.5 4 16.5 6.5 13.8 9.2Z"
        fill="currentColor"
        opacity="0.9"
        transform="rotate(120 12 12)"
      />
      <path
        d="M12 9.5 C12 6.5 14.5 4 14.5 4 C14.5 4 16.5 6.5 13.8 9.2Z"
        fill="currentColor"
        opacity="0.9"
        transform="rotate(240 12 12)"
      />
      {/* Outer ring — partial, cockpit aesthetic */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 2"
        opacity="0.4"
      />
    </svg>
  )
}
