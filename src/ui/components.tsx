/**
 * Composants d'interface partagés. Accessibilité (WCAG 2.1 AA) : cibles tactiles ≥ 44 px
 * (`min-h-11`), libellés associés aux champs, focus visible, groupes de choix en boutons radio
 * natifs (navigation aux flèches), messages d'alerte annoncés (`aria-live`).
 */
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { Alert, AlertLevel } from '../engine/types';
import { alertMessage } from './format';
import { StatusIcon } from './icons';

const focus =
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover border border-primary',
  secondary: 'bg-surface text-primary border border-primary hover:bg-bg',
  ghost: 'bg-transparent text-primary border border-transparent hover:bg-bg',
  danger: 'bg-surface text-block border border-block hover:bg-block-bg',
};

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${focus} ${className}`}
    />
  );
}

export function Card({
  children,
  className = '',
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag className={`rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}>
      {children}
    </Tag>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
  );
}

/** Saisie numérique tolérante (virgule ou point), validée à la volée. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = 'any',
  help,
  disabled,
  className = '',
  digits = 3,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
  help?: ReactNode;
  disabled?: boolean;
  className?: string;
  digits?: number;
}) {
  const id = useId();
  const [text, setText] = useState(() => String(round(value, digits)));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(String(round(value, digits)));
    }
  }, [value, digits]);
  const parsed = Number(text.replace(',', '.'));
  const invalid =
    text.trim() === '' ||
    !Number.isFinite(parsed) ||
    (min !== undefined && parsed < min) ||
    (max !== undefined && parsed > max);
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-stretch">
        <input
          id={id}
          inputMode="decimal"
          type="text"
          value={text}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value.replace(',', '.'));
            if (
              e.target.value.trim() !== '' &&
              Number.isFinite(n) &&
              (min === undefined || n >= min) &&
              (max === undefined || n <= max)
            ) {
              last.current = n;
              onChange(n);
            }
          }}
          onBlur={() => {
            if (invalid) setText(String(round(value, digits)));
          }}
          data-step={step}
          className={`min-h-11 w-full min-w-0 rounded-lg border bg-surface px-3 text-base ${unit ? 'rounded-e-none' : ''} ${invalid ? 'border-block' : 'border-border'} ${focus}`}
        />
        {unit && (
          <span className="inline-flex min-h-11 items-center rounded-e-lg border border-s-0 border-border bg-bg px-3 text-sm text-muted">
            {unit}
          </span>
        )}
      </div>
      {help && (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted">
          {help}
        </p>
      )}
    </div>
  );
}

function round(v: number, digits: number) {
  return Number(v.toFixed(digits));
}

export function TextField({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base ${focus}`}
      />
    </div>
  );
}

/** Groupe de choix exclusifs : boutons radio natifs présentés en boutons. */
export function Choice<T extends string | number>({
  legend,
  value,
  options,
  onChange,
  className = '',
  hideLegend = false,
}: {
  legend: string;
  value: T;
  options: { value: T; label: ReactNode; help?: string }[];
  onChange: (v: T) => void;
  className?: string;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className={hideLegend ? 'sr-only' : 'mb-1 text-sm font-medium'}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={String(o.value)}
              title={o.help}
              className={`relative inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-3 py-2 text-sm font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)] ${
                checked
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface hover:border-primary'
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(o.value)}
              />
              {o.label}
              {o.help && <span className="sr-only"> — {o.help}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`mt-1 h-6 w-6 shrink-0 accent-[var(--color-primary)] ${focus}`}
      />
      <label htmlFor={id} className="pt-1 text-sm">
        {label}
        {help && <span className="block text-xs text-muted">{help}</span>}
      </label>
    </div>
  );
}

/** Section repliable (repliée par défaut), native et accessible au clavier. */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group rounded-xl border border-border bg-surface" open={defaultOpen}>
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-2 font-semibold ${focus}`}
      >
        {title}
        <span
          aria-hidden
          className="transition-transform group-open:rotate-90 rtl:group-open:-rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}

const LEVEL_STYLE: Record<AlertLevel, string> = {
  ok: 'border-ok bg-ok-bg text-ok',
  warn: 'border-warn bg-warn-bg text-warn',
  block: 'border-block bg-block-bg text-block',
};

export function StatusPill({ level }: { level: AlertLevel }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${LEVEL_STYLE[level]}`}
    >
      <StatusIcon level={level} className="h-4 w-4" />
      {t(`solutions.status.${level}`)}
    </span>
  );
}

/** Liste d'alertes en langage simple, code couleur vert / orange / rouge. */
export function AlertList({ alerts, empty }: { alerts: Alert[]; empty?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <div aria-live="polite">
      {alerts.length === 0 && empty ? (
        <p
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${LEVEL_STYLE.ok}`}
        >
          <StatusIcon level="ok" />
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a, i) => (
            <li
              key={`${a.code}-${i}`}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${LEVEL_STYLE[a.level]}`}
            >
              <StatusIcon level={a.level} />
              <span>
                <span className="sr-only">{t(`solutions.status.${a.level}`)} : </span>
                {alertMessage(t, a, i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Boîte de dialogue modale native (`<dialog>`), fermée par Échap ou le bouton. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal?.();
    if (!open && d.open) d.close?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
      className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <Button variant="ghost" onClick={onClose} aria-label={t('common.close')}>
              ✕
            </Button>
          </div>
          <div className="overflow-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Onglets accessibles (rôles ARIA tablist / tab / tabpanel, flèches gauche / droite). */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((x) => x.id === value);
    const next = tabs[(i + dir + tabs.length) % tabs.length]!;
    onChange(next.id);
    refs.current[next.id]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-4 flex flex-wrap gap-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => {
              const rtl = document.documentElement.dir === 'rtl';
              if (e.key === 'ArrowRight') move(rtl ? -1 : 1);
              if (e.key === 'ArrowLeft') move(rtl ? 1 : -1);
            }}
            className={`-mb-px min-h-11 rounded-t-lg border-b-2 px-4 text-sm font-semibold ${focus} ${
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={focus}
    >
      {children}
    </div>
  );
}

export function SampleBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center rounded-md border border-warn bg-warn-bg px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-warn">
      {t('app.sample')}
    </span>
  );
}

/** Ligne libellé / valeur pour les fiches de résultat. */
export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-border/60 py-1.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}
