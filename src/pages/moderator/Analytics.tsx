import { useMemo, useState } from 'react'
import { BarChart3, CalendarCheck, Percent, Star, Wallet } from 'lucide-react'
import { useStore } from '@/services/store'
import { quotaBalance, studentById, subjectName, teacherById, teacherRating } from '@/services/selectors'
import { DataTable, DemoNotice, FilterBar, PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Dialog } from '@/components/ui/overlays'
import { Badge, Select } from '@/components/ui/primitives'
import { formatDateTime, formatMoney } from '@/lib/utils'
import type { Order } from '@/types'

type Drill = { kind: 'subject'; id: string } | { kind: 'package'; id: string } | { kind: 'teacher'; id: string } | { kind: 'order'; id: string } | { kind: 'lessons' }

function Bar({ value, max, tone = 'bg-primary' }: { value: number; max: number; tone?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-24 overflow-hidden rounded-full bg-muted" aria-hidden><span className={`block h-full ${tone}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></span>
      <span className="tabular">{value}</span>
    </span>
  )
}

export default function Analytics() {
  const { state } = useStore()
  const [period, setPeriod] = useState('all')
  const [subject, setSubject] = useState('')
  const [pkg, setPkg] = useState('')
  const [drill, setDrill] = useState<Drill | null>(null)

  const from = period === 'all' ? 0 : Date.now() - +period * 86400000
  const data = useMemo(() => {
    const orders = state.orders.filter((o) => new Date(o.createdAt).getTime() >= from && (!pkg || o.packageVersion.packageId === pkg) && (!subject || o.items.some((i) => i.subjectId === subject)))
    const paid = orders.filter((o) => o.status === 'paid')
    const lessons = state.lessons.filter((l) => new Date(l.start).getTime() >= from && (!subject || l.subjectId === subject) && (!pkg || l.packageId === pkg))
    const closed = lessons.filter((l) => l.status === 'closed')
    const closedParts = state.participants.filter((p) => closed.some((l) => l.id === p.lessonId))
    const present = closedParts.filter((p) => p.attendance === 'present').length
    const qb = paid.reduce(
      (acc, o) => {
        const b = quotaBalance(state, { orderId: o.id, subjectId: subject || undefined })
        return { purchased: acc.purchased + b.purchased, consumed: acc.consumed + b.consumed, reserved: acc.reserved + b.reserved, free: acc.free + b.free }
      },
      { purchased: 0, consumed: 0, reserved: 0, free: 0 },
    )
    const reviews = state.reviews.filter((r) => lessons.some((l) => l.id === r.lessonId))
    return { orders, paid, lessons, closed, present, closedParts, qb, reviews }
  }, [state, from, subject, pkg])

  const revenue = data.paid.reduce((a, o) => a + o.total, 0)
  const bySubject = state.subjects
    .filter((s) => !subject || s.id === subject)
    .map((s) => {
      const b = data.paid.reduce((acc, o) => { const x = quotaBalance(state, { orderId: o.id, subjectId: s.id }); return { p: acc.p + x.purchased, c: acc.c + x.consumed, r: acc.r + x.reserved, f: acc.f + x.free } }, { p: 0, c: 0, r: 0, f: 0 })
      const ls = data.lessons.filter((l) => l.subjectId === s.id)
      return { id: s.id, name: s.name, ...b, lessons: ls.length, held: ls.filter((l) => l.status === 'closed').length }
    })
    .filter((r) => r.p || r.lessons)
  const byPackage = state.packages
    .filter((p) => !pkg || p.id === pkg)
    .map((p) => {
      const os = data.orders.filter((o) => o.packageVersion.packageId === p.id)
      const ps = os.filter((o) => o.status === 'paid')
      return { id: p.id, name: p.title, orders: os.length, paid: ps.length, revenue: ps.reduce((a, o) => a + o.total, 0), renewals: os.filter((o) => o.renewedFromId).length }
    })
    .filter((r) => r.orders)
  const byTeacher = state.teachers
    .map((t) => {
      const ls = data.lessons.filter((l) => l.teacherId === t.id)
      const parts = state.participants.filter((p) => ls.some((l) => l.id === p.lessonId && l.status === 'closed'))
      return { id: t.id, name: t.name, lessons: ls.length, held: ls.filter((l) => l.status === 'closed').length, attendance: parts.length ? Math.round((parts.filter((p) => p.attendance === 'present').length / parts.length) * 100) : 0, rating: teacherRating(state, t.id) }
    })
    .filter((r) => r.lessons)

  const maxP = Math.max(...bySubject.map((r) => r.p), 1)
  const maxRev = Math.max(...byPackage.map((r) => r.revenue), 1)

  const orderCols = [
    { key: 'n', header: 'Заказ', cell: (o: Order) => <span className="font-medium">{o.number}</span>, sort: (o: Order) => o.number },
    { key: 's', header: 'Ученик', cell: (o: Order) => studentById(state, o.studentId)?.name },
    { key: 'p', header: 'Пакет', cell: (o: Order) => o.packageVersion.title },
    { key: 'st', header: 'Статус', cell: (o: Order) => <StatusBadge status={o.status} /> },
    { key: 'f', header: 'Свободно', cell: (o: Order) => <span className="tabular">{quotaBalance(state, { orderId: o.id }).free}</span>, className: 'text-right' },
  ]

  return (
    <>
      <PageHeader title="Аналитика" description="Демонстрационные метрики на локальных данных. Кликните по строке, чтобы провалиться до заказа, ученика и урока." crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Аналитика' }]} />
      <FilterBar onReset={() => { setPeriod('all'); setSubject(''); setPkg('') }}>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Период" className="sm:w-44">
          <option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option><option value="all">Всё время</option>
        </Select>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет" className="sm:w-44"><option value="">Все предметы</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select value={pkg} onChange={(e) => setPkg(e.target.value)} aria-label="Пакет" className="sm:w-56"><option value="">Все пакеты</option>{state.packages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select>
      </FilterBar>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Выручка (демо)" value={formatMoney(revenue)} hint={`${data.paid.length} из ${data.orders.length} заказов оплачено`} icon={<Wallet />} onClick={() => setDrill({ kind: 'package', id: '' })} />
        <StatCard label="Конверсия в оплату" value={`${data.orders.length ? Math.round((data.paid.length / data.orders.length) * 100) : 0}%`} icon={<Percent />} tone="info" />
        <StatCard label="Проведено уроков" value={data.closed.length} hint={`всего в периоде ${data.lessons.length}`} icon={<CalendarCheck />} tone="success" onClick={() => setDrill({ kind: 'lessons' })} />
        <StatCard label="Посещаемость" value={`${data.closedParts.length ? Math.round((data.present / data.closedParts.length) * 100) : 0}%`} hint={`${data.present} из ${data.closedParts.length} участий`} icon={<BarChart3 />} tone="warning" />
        <StatCard label="Использование квот" value={`${data.qb.purchased ? Math.round(((data.qb.consumed + data.qb.reserved) / data.qb.purchased) * 100) : 0}%`} hint={`списано ${data.qb.consumed} · резерв ${data.qb.reserved} · своб. ${data.qb.free}`} icon={<Star />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold">Квоты по предметам</h2>
          <DataTable dense rows={bySubject} rowKey={(r) => r.id} onRowClick={(r) => setDrill({ kind: 'subject', id: r.id })} columns={[
            { key: 'n', header: 'Предмет', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
            { key: 'p', header: 'Куплено', cell: (r) => <Bar value={r.p} max={maxP} />, sort: (r) => r.p },
            { key: 'c', header: 'Списано', cell: (r) => <span className="tabular">{r.c}</span>, sort: (r) => r.c, className: 'text-right' },
            { key: 'r', header: 'Резерв', cell: (r) => <span className="tabular">{r.r}</span>, sort: (r) => r.r, className: 'text-right' },
            { key: 'f', header: 'Своб.', cell: (r) => <span className="tabular text-success">{r.f}</span>, sort: (r) => r.f, className: 'text-right' },
            { key: 'h', header: 'Уроков', cell: (r) => <span className="tabular">{r.held}/{r.lessons}</span>, className: 'text-right' },
          ]} />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">Продажи по пакетам</h2>
          <DataTable dense rows={byPackage} rowKey={(r) => r.id} onRowClick={(r) => setDrill({ kind: 'package', id: r.id })} columns={[
            { key: 'n', header: 'Пакет', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
            { key: 'o', header: 'Заказы', cell: (r) => <span className="tabular">{r.paid}/{r.orders}</span>, sort: (r) => r.orders },
            { key: 'rn', header: 'Продлений', cell: (r) => <span className="tabular">{r.renewals}</span>, className: 'text-right' },
            { key: 'rv', header: 'Выручка', cell: (r) => <Bar value={r.revenue} max={maxRev} tone="bg-secondary" />, sort: (r) => r.revenue },
          ]} />
        </section>
        <section className="xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold">Преподаватели</h2>
          <DataTable dense rows={byTeacher} rowKey={(r) => r.id} onRowClick={(r) => setDrill({ kind: 'teacher', id: r.id })} columns={[
            { key: 'n', header: 'Преподаватель', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (r) => r.name },
            { key: 'l', header: 'Уроков', cell: (r) => <span className="tabular">{r.lessons}</span>, sort: (r) => r.lessons, className: 'text-right' },
            { key: 'h', header: 'Проведено', cell: (r) => <span className="tabular">{r.held}</span>, sort: (r) => r.held, className: 'text-right' },
            { key: 'a', header: 'Посещаемость', cell: (r) => <span className="tabular">{r.held ? `${r.attendance}%` : '—'}</span>, sort: (r) => r.attendance, className: 'text-right' },
            { key: 'r', header: 'Рейтинг', cell: (r) => (r.rating.count ? <span className="tabular">{r.rating.avg.toFixed(1)} ({r.rating.count})</span> : '—'), sort: (r) => r.rating.avg, className: 'text-right' },
          ]} />
        </section>
      </div>
      <DemoNotice className="mt-6">Метрики рассчитываются на лету из локального журнала квот, заказов и уроков. Значения демонстрационные.</DemoNotice>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)} size="xl" title={drillTitle(drill, state)} description="Детализация · кликните по заказу, чтобы увидеть трассировку квот до уроков">
        {drill?.kind === 'order' ? (
          <OrderTrace orderId={drill.id} />
        ) : drill?.kind === 'lessons' || drill?.kind === 'teacher' ? (
          <DataTable dense rows={data.lessons.filter((l) => drill.kind === 'lessons' || l.teacherId === drill.id).sort((a, b) => b.start.localeCompare(a.start))} rowKey={(l) => l.id} columns={[
            { key: 'd', header: 'Дата', cell: (l) => <span className="tabular">{formatDateTime(l.start)}</span>, sort: (l) => l.start },
            { key: 's', header: 'Предмет', cell: (l) => `${subjectName(state, l.subjectId)} · ${l.grade} кл` },
            { key: 't', header: 'Учитель', cell: (l) => teacherById(state, l.teacherId)?.name },
            { key: 'p', header: 'Участники', cell: (l) => state.participants.filter((p) => p.lessonId === l.id).map((p) => studentById(state, p.studentId)?.name.split(' ')[0] + (p.attendance ? (p.attendance === 'present' ? ' ✓' : ' ✗') : '')).join(', ') },
            { key: 'st', header: 'Статус', cell: (l) => <StatusBadge status={l.status} /> },
          ]} />
        ) : drill ? (
          <DataTable dense rows={data.orders.filter((o) => (drill.kind === 'subject' ? o.items.some((i) => i.subjectId === drill.id) : !drill.id || o.packageVersion.packageId === drill.id))} rowKey={(o) => o.id} onRowClick={(o) => setDrill({ kind: 'order', id: o.id })} columns={orderCols} />
        ) : null}
      </Dialog>
    </>
  )
}

function drillTitle(d: Drill | null, state: ReturnType<typeof useStore>['state']) {
  if (!d) return ''
  if (d.kind === 'subject') return `Заказы с предметом «${subjectName(state, d.id)}»`
  if (d.kind === 'package') return d.id ? `Заказы пакета «${state.packages.find((p) => p.id === d.id)?.title}»` : 'Все заказы периода'
  if (d.kind === 'teacher') return `Уроки: ${teacherById(state, d.id)?.name}`
  if (d.kind === 'lessons') return 'Уроки периода'
  return `Заказ ${state.orders.find((o) => o.id === d.id)?.number}`
}

/** Трассировка: заказ → предметная квота → участие ребёнка → групповой урок. */
function OrderTrace({ orderId }: { orderId: string }) {
  const { state } = useStore()
  const o = state.orders.find((x) => x.id === orderId)
  if (!o) return null
  const parts = state.participants.filter((p) => p.orderId === o.id)
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={o.status} />
        <Badge tone="outline">{o.packageVersion.title} v{o.packageVersion.version}</Badge>
        <Badge tone="outline">{studentById(state, o.studentId)?.name}</Badge>
        <Badge tone="outline">{formatMoney(o.total)}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {o.packageVersion.subjectIds.map((s) => {
          const b = quotaBalance(state, { orderId: o.id, subjectId: s })
          return (
            <div key={s} className="rounded-[var(--radius-md)] border border-border p-3">
              <p className="font-medium">{subjectName(state, s)}</p>
              <p className="tabular text-xs text-fg-muted">куплено {b.purchased} · списано {b.consumed} · резерв {b.reserved} · своб. {b.free}</p>
            </div>
          )
        })}
      </div>
      <DataTable dense rows={parts} rowKey={(p) => p.id} columns={[
        { key: 'l', header: 'Урок', cell: (p) => { const l = state.lessons.find((x) => x.id === p.lessonId)!; return `${formatDateTime(l.start)} · ${subjectName(state, l.subjectId)}` } },
        { key: 't', header: 'Учитель', cell: (p) => teacherById(state, state.lessons.find((x) => x.id === p.lessonId)?.teacherId)?.name },
        { key: 'ls', header: 'Статус урока', cell: (p) => <StatusBadge status={state.lessons.find((x) => x.id === p.lessonId)!.status} /> },
        { key: 'a', header: 'Посещение', cell: (p) => (p.attendance ? <StatusBadge status={p.attendance} /> : '—') },
        { key: 'q', header: 'Квота', cell: (p) => (p.outcome ? <StatusBadge status={p.outcome} /> : <Badge tone="warning">Резерв</Badge>) },
      ]} />
    </div>
  )
}
