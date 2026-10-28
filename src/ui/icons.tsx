/** Icônes SVG en ligne (décoratives : aria-hidden). */
import type { ScenarioId } from '../settings/schema';

type P = { className?: string };
const base = (className?: string) => ({
  className: className ?? 'h-10 w-10',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const ScenarioIcon = ({ id, className }: P & { id: ScenarioId }) => {
  switch (id) {
    case 'cctv':
      return (
        <svg {...base(className)}>
          <path d="M3 7l12-3 2 6-12 3z" />
          <path d="M17 8l3 1-1 4-3-1" />
          <path d="M8 13l1 4H4v3" />
        </svg>
      );
    case 'office':
      return (
        <svg {...base(className)}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
    case 'server':
      return (
        <svg {...base(className)}>
          <rect x="4" y="3" width="16" height="6" rx="1" />
          <rect x="4" y="10" width="16" height="6" rx="1" />
          <rect x="4" y="17" width="16" height="4" rx="1" />
          <path d="M7 6h.01M7 13h.01M7 19h.01" />
        </svg>
      );
    case 'datacenter':
      return (
        <svg {...base(className)}>
          <rect x="2" y="4" width="6" height="16" rx="1" />
          <rect x="9" y="4" width="6" height="16" rx="1" />
          <rect x="16" y="4" width="6" height="16" rx="1" />
          <path d="M4 8h2M11 8h2M18 8h2M4 12h2M11 12h2M18 12h2" />
        </svg>
      );
    case 'airport':
      return (
        <svg {...base(className)}>
          <path d="M2 16l20-6-2-2-6 2-6-6-2 1 4 6-5 2-2-2-1 1z" />
          <path d="M3 21h18" />
        </svg>
      );
    case 'building':
      return (
        <svg {...base(className)}>
          <rect x="5" y="3" width="14" height="18" rx="1" />
          <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M11 21v-3h2v3" />
        </svg>
      );
    case 'medical':
      return (
        <svg {...base(className)}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 7v10M7 12h10" />
        </svg>
      );
    case 'industrial':
      return (
        <svg {...base(className)}>
          <path d="M2 21V11l6 3V11l6 3V6h3l1 15z" />
          <path d="M2 21h20M6 18h2M11 18h2" />
        </svg>
      );
    case 'enterprise':
      return (
        <svg {...base(className)}>
          <rect x="9" y="2" width="6" height="5" rx="1" />
          <rect x="2" y="17" width="6" height="5" rx="1" />
          <rect x="9" y="17" width="6" height="5" rx="1" />
          <rect x="16" y="17" width="6" height="5" rx="1" />
          <path d="M12 7v10M5 17v-4h14v4" />
        </svg>
      );
    case 'elevator':
      return (
        <svg {...base(className)}>
          <rect x="4" y="2" width="16" height="20" rx="1" />
          <path d="M12 2v20M7 9l1.5-2L10 9M14 7l1.5 2L17 7" />
        </svg>
      );
    default:
      return (
        <svg {...base(className)}>
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      );
  }
};

export const StatusIcon = ({ level, className }: P & { level: 'ok' | 'warn' | 'block' }) => (
  <svg {...base(className ?? 'h-5 w-5 shrink-0')}>
    {level === 'ok' ? (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12l3 3 5-6" />
      </>
    ) : level === 'warn' ? (
      <>
        <path d="M12 3l10 18H2z" />
        <path d="M12 10v4M12 17h.01" />
      </>
    ) : (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </>
    )}
  </svg>
);

export const ChevronIcon = ({ className }: P) => (
  <svg {...base(className ?? 'h-4 w-4')}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/** Illustration simple d'un UPS selon son format. */
export const UpsIllustration = ({ formFactor, className }: P & { formFactor: string }) => {
  const c = className ?? 'h-20 w-20';
  if (formFactor === 'rack' || formFactor === 'tower_rack')
    return (
      <svg viewBox="0 0 64 64" className={c} aria-hidden focusable={false}>
        <rect x="6" y="22" width="52" height="10" rx="2" fill="var(--color-primary)" />
        <rect x="6" y="34" width="52" height="10" rx="2" fill="var(--color-muted)" opacity=".5" />
        <rect x="10" y="25" width="10" height="4" rx="1" fill="#fff" />
        <circle cx="52" cy="27" r="2" fill="#7ee08a" />
      </svg>
    );
  if (formFactor === 'tower')
    return (
      <svg viewBox="0 0 64 64" className={c} aria-hidden focusable={false}>
        <rect x="22" y="8" width="20" height="48" rx="3" fill="var(--color-primary)" />
        <rect x="26" y="14" width="12" height="8" rx="1" fill="#fff" />
        <circle cx="32" cy="48" r="2" fill="#7ee08a" />
      </svg>
    );
  return (
    <svg viewBox="0 0 64 64" className={c} aria-hidden focusable={false}>
      <rect x="8" y="6" width="22" height="52" rx="2" fill="var(--color-primary)" />
      <rect x="32" y="6" width="24" height="52" rx="2" fill="var(--color-muted)" opacity=".55" />
      <rect x="12" y="12" width="14" height="8" rx="1" fill="#fff" />
      <path d="M36 14h16M36 22h16M36 30h16M36 38h16M36 46h16" stroke="#fff" strokeWidth="2" />
    </svg>
  );
};
