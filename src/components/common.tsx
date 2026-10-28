// Общие компоненты, переиспользуемые всеми кабинетами.
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, Archive, Ban, CheckCircle2, ChevronRight, CircleDashed, Clock, FileEdit, FlaskConical, Inbox, Loader, RotateCcw, Search, Send, XCircle,
} from 'lucide-react'
import { Badge, Button, Card, Label, Input } from './ui/primitives'
import { Dialog } from './ui/overlays'
import { cn, initials } from '@/lib/utils'
import type { QuotaBalance } from '@/types'

type Tone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger'

const STATUS: Record<string, { label: string; tone: Tone; icon: typeof CheckCircle2 }> = {
  draft: { label: 'Черновик', tone: 'neutral', icon: FileEdit },
  pending_review: { label: 'На проверке', tone: 'warning', icon: Clock },
  needs_revision: { label: 'На доработке', tone: 'danger', icon: RotateCcw },
  published: { label: 'Опубликован', tone: 'success', icon: CheckCircle2 },
  unpublished: { label: 'Снят с публикации', tone: 'neutral', icon: Ban },
  archived: { label: 'В архиве', tone: 'neutral', icon: Archive },
  scheduled: { label: 'Запланирован', tone: 'info', icon: Clock },
  in_progress: { label: 'Идёт сейчас', tone: 'primary', icon: Loader },
  awaiting_report: { label: 'Ждёт отчёта', tone: 'warning', icon: FileEdit },
  pending_approval: { label: 'Отчёт на проверке', tone: 'warning', icon: Send },
  closed: { label: 'Закрыт', tone: 'success', icon: CheckCircle2 },
  cancelled: { label: 'Отменён', tone: 'neutral', icon: XCircle },
  paid: { label: 'Оплачен', tone: 'success', icon: CheckCircle2 },
  unpaid: { label: 'Не оплачен', tone: 'danger', icon: AlertCircle },
  succeeded: { label: 'Успешно', tone: 'success', icon: CheckCircle2 },
  failed: { label: 'Отклонено', tone: 'danger', icon: XCircle },
  expired: { label: 'Истёк', tone: 'neutral', icon: CircleDashed },
  present: { label: 'Присутствовал', tone: 'success', icon: CheckCircle2 },
  absent: { label: 'Пропуск', tone: 'danger', icon: XCircle },
  consumed: { label: 'Списано', tone: 'primary', icon: CheckCircle2 },
  released: { label: 'Резерв возвращён', tone: 'info', icon: RotateCcw },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'neutral' as Tone, icon: CircleDashed }
  const Icon = s.icon
  return (
    <Badge tone={s.tone} className={className}>
      <Icon aria-hidden />
      {s.label}
    </Badge>
  )
}

export function DemoBadge({ children = 'Демо' }: { children?: ReactNode }) {
  return (
    <Badge tone="warning" className="uppercase tracking-wide">
      <FlaskConical aria-hidden />
      {children}
    </Badge>
  )
}

export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="note" className={cn('flex gap-3 rounded-[var(--radius-md)] border border-amber-200 bg-warning-soft/60 p-3 text-sm text-amber-900', className)}>
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export interface Crumb {
  label: string
  to?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигационная цепочка" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-fg-muted">
      {items.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" aria-hidden />}
          {c.to ? (
            <Link to={c.to} className="hover:text-primary hover:underline">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-fg">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function PageHeader({ title, description, actions, crumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <div className="mb-6">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'primary', onClick }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone; onClick?: () => void }) {
  const toneBg: Record<Tone, string> = {
    neutral: 'bg-muted text-fg-muted', primary: 'bg-primary-soft text-primary', info: 'bg-info-soft text-info',
    success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger',
  }
  const Comp = onClick ? 'button' : 'div'
  return (
    <Card className={cn('p-4 text-left', onClick && 'cursor-pointer transition hover:border-primary/40 hover:shadow-md')}>
      <Comp onClick={onClick} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
          <p className="tabular mt-1 text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
        </div>
        {icon && <span className={cn('rounded-[var(--radius-sm)] p-2 [&_svg]:size-5', toneBg[tone])}>{icon}</span>}
      </Comp>
    </Card>
  )
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3 text-fg-muted [&_svg]:size-6">{icon ?? <Inbox />}</div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function FormField({ label, htmlFor, error, hint, children, required, className }: { label: ReactNode; htmlFor?: string; error?: string; hint?: ReactNode; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-danger" role="alert" id={htmlFor ? `${htmlFor}-error` : undefined}>
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-fg-muted">{hint}</p>
      )}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Поиск…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

export function FilterBar({ children, onReset, className }: { children: ReactNode; onReset?: () => void; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-col gap-2 rounded-[var(--radius-md)] border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="sm:ml-auto">
          <RotateCcw /> Сбросить фильтры
        </Button>
      )}
    </div>
  )
}

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  sort?: (row: T) => string | number
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, empty, dense }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; empty?: ReactNode; dense?: boolean }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const col = columns.find((c) => c.key === sort?.key)
  const sorted = col?.sort ? [...rows].sort((a, b) => {
    const x = col.sort!(a)
    const y = col.sort!(b)
    return (x > y ? 1 : x < y ? -1 : 0) * sort!.dir
  }) : rows
  if (!rows.length) return <>{empty ?? <EmptyState title="Нет записей" description="Измените фильтры или добавьте данные." />}</>
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-fg-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-3 font-semibold', dense ? 'py-2' : 'py-3', c.className)}>
                {c.sort ? (
                  <button
                    className="inline-flex cursor-pointer items-center gap-1 uppercase hover:text-fg"
                    onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                    aria-label={`Сортировать по ${typeof c.header === 'string' ? c.header : c.key}`}
                  >
                    {c.header}
                    <span aria-hidden>{sort?.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</span>
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(r) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('border-t border-border', onRowClick && 'cursor-pointer hover:bg-primary-soft/40 focus-visible:bg-primary-soft/40')}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 align-middle', dense ? 'py-2' : 'py-3', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Подтвердить', danger, onConfirm, loading, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; loading?: boolean; children?: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button variant={danger ? 'danger' : 'default'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      {children ?? <p className="text-sm text-fg-muted">Действие изменит демо-данные. Его можно отменить только сбросом демо.</p>}
    </Dialog>
  )
}

export function Avatar({ name, hue = 240, size = 40, className }: { name: string; hue?: number; size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Аватар-заглушка: ${name}`}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))` }}
    >
      {initials(name)}
    </span>
  )
}

const QUOTA_PARTS: { key: keyof QuotaBalance; label: string; color: string }[] = [
  { key: 'consumed', label: 'Списано', color: 'bg-primary' },
  { key: 'reserved', label: 'В резерве', color: 'bg-amber-400' },
  { key: 'free', label: 'Свободно', color: 'bg-emerald-500' },
  { key: 'expired', label: 'Истекло', color: 'bg-slate-300' },
]

export function QuotaBalanceView({ b, compact, title }: { b: QuotaBalance; compact?: boolean; title?: ReactNode }) {
  const total = Math.max(b.purchased, 1)
  return (
    <div>
      {title && <div className="mb-1 flex items-center justify-between text-sm"><span className="font-medium">{title}</span><span className="tabular text-fg-muted">куплено {b.purchased}</span></div>}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Куплено ${b.purchased}, списано ${b.consumed}, в резерве ${b.reserved}, свободно ${b.free}, истекло ${b.expired}`}>
        {QUOTA_PARTS.map((p) => b[p.key] > 0 && <span key={p.key} className={p.color} style={{ width: `${(b[p.key] / total) * 100}%` }} />)}
      </div>
      {!compact && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
          {QUOTA_PARTS.map((p) => (
            <div key={p.key} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', p.color)} aria-hidden />
              <dt className="text-fg-muted">{p.label}</dt>
              <dd className="tabular ml-auto font-semibold">{b[p.key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

export function StarRating({ value, onChange, size = 16 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(value)
        const star = (
          <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden className={filled ? 'fill-amber-400' : 'fill-slate-200'}>
            <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
          </svg>
        )
        return onChange ? (
          <button key={i} type="button" role="radio" aria-checked={i === value} aria-label={`${i} из 5`} onClick={() => onChange(i)} className="cursor-pointer rounded p-0.5 hover:scale-110">
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        )
      })}
    </div>
  )
}
