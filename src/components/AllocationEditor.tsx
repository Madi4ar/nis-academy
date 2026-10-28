import { Minus, Plus } from 'lucide-react'
import { Badge, Button } from './ui/primitives'
import { cn } from '@/lib/utils'

export interface AllocRow {
  id: string
  name: string
  note?: string
  min?: number
}

/** Визуальный распределитель уроков между предметами со счётчиком «назначено X из N». */
export function AllocationEditor({ rows, value, total, onChange, label = 'Распределение уроков' }: {
  rows: AllocRow[]; value: Record<string, number>; total: number; onChange: (v: Record<string, number>) => void; label?: string
}) {
  const sum = rows.reduce((a, r) => a + (value[r.id] ?? 0), 0)
  const set = (id: string, n: number) => onChange({ ...value, [id]: Math.max(0, n) })
  const status = sum === total ? 'ok' : sum > total ? 'over' : 'under'
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Badge tone={status === 'ok' ? 'success' : 'danger'} aria-live="polite" className="text-sm">
          Назначено {sum} из {total}
          {status === 'over' && ' — лишние уроки'}
          {status === 'under' && ` — осталось ${total - sum}`}
        </Badge>
      </div>
      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className={cn('transition-all', status === 'over' ? 'bg-danger' : 'bg-primary')} style={{ width: `${Math.min(100, (sum / Math.max(total, 1)) * 100)}%` }} />
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const v = value[r.id] ?? 0
          return (
            <li key={r.id} className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.name}</p>
                {r.note && <p className="text-xs text-fg-muted">{r.note}</p>}
              </div>
              <Button variant="outline" size="icon" onClick={() => set(r.id, v - 1)} disabled={v <= (r.min ?? 0)} aria-label={`Уменьшить: ${r.name}`}><Minus /></Button>
              <input
                type="number"
                min={0}
                value={v}
                onChange={(e) => set(r.id, parseInt(e.target.value || '0', 10))}
                className="tabular h-9 w-14 rounded-[var(--radius-sm)] border border-border text-center text-sm font-semibold"
                aria-label={`Уроков: ${r.name}`}
              />
              <Button variant="outline" size="icon" onClick={() => set(r.id, v + 1)} aria-label={`Увеличить: ${r.name}`}><Plus /></Button>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}
