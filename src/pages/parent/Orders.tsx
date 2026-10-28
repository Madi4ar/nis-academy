import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftRight, CheckCircle2, CreditCard, History, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAction, useSession, useStore } from '@/services/store'
import { payOrder, reallocate } from '@/services/mockApi'
import { childrenOf, isOrderExpired, quotaBalance, subjectName } from '@/services/selectors'
import { AllocationEditor } from '@/components/AllocationEditor'
import { DataTable, DemoBadge, DemoNotice, EmptyState, PageHeader, QuotaBalanceView, StatusBadge } from '@/components/common'
import { Dialog } from '@/components/ui/overlays'
import { Badge, Button, Card } from '@/components/ui/primitives'
import { cn, formatDate, formatDateTime, formatMoney } from '@/lib/utils'
import type { Order } from '@/types'

const TX_LABEL: Record<string, string> = {
  grant: 'Начисление', reserve: 'Резерв', release: 'Возврат резерва', consume: 'Списание', reallocate_in: 'Перераспределение +', reallocate_out: 'Перераспределение −', expire: 'Истечение',
}

export function Orders() {
  const { state } = useStore()
  const { parent } = useSession()
  const { exec, pending } = useAction()
  const navigate = useNavigate()
  const kids = childrenOf(state, parent?.id)
  const [payFor, setPayFor] = useState<Order | null>(null)
  const [sim, setSim] = useState<'success' | 'fail'>('success')
  const [historyFor, setHistoryFor] = useState<Order | null>(null)
  const [childFilter, setChildFilter] = useState('')

  const orders = state.orders.filter((o) => o.parentId === parent?.id && (!childFilter || o.studentId === childFilter))

  const pay = async () => {
    if (!payFor) return
    const r = await exec((s) => payOrder(s, payFor.id, sim), { ms: 800 })
    if (r.ok) {
      if (sim === 'success') toast.success(`Заказ ${payFor.number} оплачен (демо), квоты начислены`)
      else toast.error('Демо-оплата отклонена', { description: 'Квоты не начислены' })
      setPayFor(null)
    }
  }

  return (
    <>
      <PageHeader title="Пакеты и квоты" description="Каждый заказ хранит собственные квоты по предметам. Продление создаёт новый заказ." crumbs={[{ label: 'Кабинет', to: '/parent' }, { label: 'Пакеты и квоты' }]} actions={<Link to="/packages" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">Купить пакет</Link>} />

      {/* Общий остаток по ребёнку */}
      <section className="mb-8" aria-labelledby="totals-h">
        <h2 id="totals-h" className="mb-3 text-lg font-semibold">Общий остаток по детям</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {kids.map((k) => {
            const kidOrders = state.orders.filter((o) => o.studentId === k.id && o.status === 'paid')
            const subjects = [...new Set(kidOrders.flatMap((o) => o.items.map((i) => i.subjectId)))]
            return (
              <Card key={k.id} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">{k.name}</p>
                  <Badge tone="outline">{kidOrders.length} опл. заказ(а)</Badge>
                </div>
                <QuotaBalanceView b={quotaBalance(state, { studentId: k.id })} />
                {subjects.length > 0 && (
                  <table className="mt-4 w-full text-xs">
                    <thead className="text-left text-fg-muted"><tr><th className="py-1 font-medium">Предмет</th>{kidOrders.map((o) => <th key={o.id} className="py-1 text-right font-medium">{o.number}</th>)}<th className="py-1 text-right font-medium">Итого своб.</th></tr></thead>
                    <tbody>
                      {subjects.map((s) => (
                        <tr key={s} className="border-t border-border">
                          <td className="py-1.5">{subjectName(state, s)}</td>
                          {kidOrders.map((o) => {
                            const b = quotaBalance(state, { orderId: o.id, subjectId: s })
                            return <td key={o.id} className="tabular py-1.5 text-right text-fg-muted">{b.purchased ? `${b.free}/${b.purchased}` : '—'}</td>
                          })}
                          <td className="tabular py-1.5 text-right font-semibold">{quotaBalance(state, { studentId: k.id, subjectId: s }).free}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {subjects.length > 0 && <p className="mt-2 text-[11px] text-fg-muted">Формат: свободно / куплено (с учётом перераспределений)</p>}
              </Card>
            )
          })}
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Заказы</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Фильтр по ребёнку">
          <Button size="sm" variant={childFilter === '' ? 'secondary' : 'ghost'} onClick={() => setChildFilter('')}>Все</Button>
          {kids.map((k) => <Button key={k.id} size="sm" variant={childFilter === k.id ? 'secondary' : 'ghost'} onClick={() => setChildFilter(k.id)}>{k.name.split(' ')[0]}</Button>)}
        </div>
      </div>
      {orders.length === 0 ? (
        <EmptyState title="Заказов пока нет" description="Выберите пакет в каталоге." action={<Link to="/packages" className="text-primary hover:underline">Каталог пакетов</Link>} />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const st = state.students.find((s) => s.id === o.studentId)
            const expired = isOrderExpired(o)
            const renewed = state.orders.find((x) => x.id === o.renewedFromId)
            return (
              <Card key={o.id} className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{o.number}</p>
                      <StatusBadge status={expired ? 'expired' : o.status} />
                      {renewed && <Badge tone="info"><RefreshCw aria-hidden />Продление {renewed.number}</Badge>}
                    </div>
                    <p className="text-sm text-fg-muted">{o.packageVersion.title} (v{o.packageVersion.version}) · {st?.name} · {o.grade} класс · {formatMoney(o.total)}</p>
                    <p className="text-xs text-fg-muted">Создан {formatDate(o.createdAt)}{o.paidAt && ` · оплачен ${formatDate(o.paidAt)}`}{o.expiresAt && ` · действует до ${formatDate(o.expiresAt)}`}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === 'unpaid' && <Button size="sm" onClick={() => { setSim('success'); setPayFor(o) }}><CreditCard aria-hidden />Оплатить (демо)</Button>}
                    {o.status === 'paid' && !expired && <Button size="sm" variant="outline" onClick={() => navigate(`/parent/orders/${o.id}/allocate`)}><ArrowLeftRight aria-hidden />Перераспределить</Button>}
                    {o.status === 'paid' && <Button size="sm" variant="outline" onClick={() => navigate(`/checkout/${o.packageVersion.packageId}?renew=${o.id}`)} disabled={state.packages.find((p) => p.id === o.packageVersion.packageId)?.status !== 'published'}><RefreshCw aria-hidden />Продлить</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setHistoryFor(o)}><History aria-hidden />История</Button>
                  </div>
                </div>
                {o.status === 'paid' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-fg-muted">
                        <tr><th className="px-4 py-2 font-semibold">Предмет</th><th className="px-2 py-2 text-right font-semibold">Куплено</th><th className="px-2 py-2 text-right font-semibold">Списано</th><th className="px-2 py-2 text-right font-semibold">Резерв</th><th className="px-2 py-2 text-right font-semibold">Свободно</th><th className="px-4 py-2 text-right font-semibold">Истекло</th></tr>
                      </thead>
                      <tbody>
                        {o.packageVersion.subjectIds.map((s) => {
                          const b = quotaBalance(state, { orderId: o.id, subjectId: s })
                          if (!b.purchased && !b.reserved && !b.consumed) return null
                          return (
                            <tr key={s} className="border-t border-border">
                              <td className="px-4 py-2">{subjectName(state, s)}</td>
                              <td className="tabular px-2 py-2 text-right">{b.purchased}</td>
                              <td className="tabular px-2 py-2 text-right">{b.consumed}</td>
                              <td className="tabular px-2 py-2 text-right">{b.reserved}</td>
                              <td className={cn('tabular px-2 py-2 text-right font-semibold', b.free > 0 ? 'text-success' : 'text-fg-muted')}>{b.free}</td>
                              <td className="tabular px-4 py-2 text-right text-fg-muted">{b.expired}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="p-4 text-sm text-fg-muted">Квоты не начислены — заказ не оплачен. Распределение: {o.items.map((i) => `${subjectName(state, i.subjectId)} ${i.lessons}`).join(', ')}.</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!payFor}
        onOpenChange={(o) => !o && setPayFor(null)}
        title={`Оплата заказа ${payFor?.number ?? ''}`}
        size="sm"
        footer={<><Button variant="outline" onClick={() => setPayFor(null)}>Отмена</Button><Button onClick={pay} loading={pending}><CreditCard aria-hidden />Оплатить (демо)</Button></>}
      >
        <div className="space-y-3">
          <DemoBadge>Демо-оплата</DemoBadge>
          <p className="text-sm text-fg-muted">Сумма {payFor && formatMoney(payFor.total)}. Оферта принята {payFor?.offer && formatDateTime(payFor.offer.acceptedAt)}. Выберите исход:</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Исход демо-оплаты">
            {(['success', 'fail'] as const).map((v) => (
              <button key={v} role="radio" aria-checked={sim === v} onClick={() => setSim(v)} className={cn('flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium', sim === v ? (v === 'success' ? 'border-success text-success ring-1 ring-success' : 'border-danger text-danger ring-1 ring-danger') : 'border-border')}>
                {v === 'success' ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}{v === 'success' ? 'Успешно' : 'Отклонено'}
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      <Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)} title={`История квот · ${historyFor?.number ?? ''}`} size="lg">
        {historyFor && (
          <DataTable
            dense
            rows={state.quotaTx.filter((t) => t.orderId === historyFor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
            rowKey={(t) => t.id}
            empty={<EmptyState title="Операций нет" description="Квоты появятся после оплаты." />}
            columns={[
              { key: 'd', header: 'Дата', cell: (t) => formatDateTime(t.createdAt) },
              { key: 't', header: 'Операция', cell: (t) => <Badge tone={t.type === 'consume' ? 'primary' : t.type === 'reserve' ? 'warning' : t.type === 'grant' ? 'success' : 'neutral'}>{TX_LABEL[t.type]}</Badge> },
              { key: 's', header: 'Предмет', cell: (t) => subjectName(state, t.subjectId) },
              { key: 'a', header: 'Кол-во', cell: (t) => <span className="tabular">{t.amount}</span>, className: 'text-right' },
              { key: 'n', header: 'Комментарий', cell: (t) => <span className="text-fg-muted">{t.note ?? (t.lessonId ? 'Урок' : '')}</span> },
            ]}
          />
        )}
      </Dialog>
    </>
  )
}

export function Allocate() {
  const { id } = useParams()
  const { state } = useStore()
  const { parent } = useSession()
  const { exec, pending } = useAction()
  const order = state.orders.find((o) => o.id === id && o.parentId === parent?.id)
  const balances = useMemo(() => Object.fromEntries((order?.packageVersion.subjectIds ?? []).map((s) => [s, quotaBalance(state, { orderId: order!.id, subjectId: s })])), [state, order])
  const initial = useMemo(() => Object.fromEntries(Object.entries(balances).map(([s, b]) => [s, b.free])), [balances])
  const [target, setTarget] = useState<Record<string, number>>(initial)
  const [error, setError] = useState<string>()

  if (!order) return <EmptyState title="Заказ не найден" action={<Link to="/parent/orders" className="text-primary hover:underline">К заказам</Link>} />
  if (order.status !== 'paid') return <EmptyState title="Заказ не оплачен" description="Перераспределять можно только квоты оплаченного заказа." action={<Link to="/parent/orders" className="text-primary hover:underline">К заказам</Link>} />

  const totalFree = Object.values(initial).reduce((a, b) => a + b, 0)
  const changed = Object.keys(initial).some((s) => (target[s] ?? 0) !== initial[s])
  const save = async () => {
    setError(undefined)
    const r = await exec((s) => reallocate(s, order.id, target), { success: 'Распределение обновлено и записано в журнал' })
    if (!r.ok) setError(r.error)
  }

  return (
    <>
      <PageHeader title={`Перераспределение · ${order.number}`} description={`${order.packageVersion.title} · ${state.students.find((s) => s.id === order.studentId)?.name}`} crumbs={[{ label: 'Кабинет', to: '/parent' }, { label: 'Пакеты и квоты', to: '/parent/orders' }, { label: 'Перераспределение' }]} />
      <DemoNotice className="mb-6">
        Менять можно только <b>свободные</b> уроки. Списанные и зарезервированные под уроки — заблокированы. Обмен между предметами разной ценовой категории (стандарт ↔ премиум) <b>запрещён без согласованного тарифа</b> — это демо-допущение, а не утверждённое правило.
      </DemoNotice>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-fg-muted">
              <tr><th className="px-4 py-3 font-semibold">Предмет</th><th className="px-2 py-3 font-semibold">Категория</th><th className="px-2 py-3 text-right font-semibold">Куплено</th><th className="px-2 py-3 text-right font-semibold">Списано 🔒</th><th className="px-2 py-3 text-right font-semibold">Резерв 🔒</th><th className="px-4 py-3 text-right font-semibold">Свободно</th></tr>
            </thead>
            <tbody>
              {order.packageVersion.subjectIds.map((s) => {
                const b = balances[s]
                const tier = state.subjects.find((x) => x.id === s)?.tier
                const delta = (target[s] ?? 0) - b.free
                return (
                  <tr key={s} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{subjectName(state, s)}</td>
                    <td className="px-2 py-3"><Badge tone={tier === 'premium' ? 'warning' : 'neutral'}>{tier === 'premium' ? 'премиум' : 'стандарт'}</Badge></td>
                    <td className="tabular px-2 py-3 text-right">{b.purchased}</td>
                    <td className="tabular px-2 py-3 text-right text-fg-muted">{b.consumed}</td>
                    <td className="tabular px-2 py-3 text-right text-fg-muted">{b.reserved}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      {b.free}
                      {delta !== 0 && <span className={cn('ml-1 text-xs', delta > 0 ? 'text-success' : 'text-danger')}>→ {target[s]}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <Card className="p-5">
          {totalFree === 0 ? (
            <EmptyState title="Нет свободных уроков" description="Все уроки заказа списаны или забронированы — перераспределять нечего." />
          ) : (
            <>
              <AllocationEditor
                rows={order.packageVersion.subjectIds.map((s) => ({ id: s, name: subjectName(state, s), note: `сейчас свободно ${balances[s].free}` }))}
                value={target}
                total={totalFree}
                onChange={(v) => { setTarget(v); setError(undefined) }}
                label="Новое распределение свободных уроков"
              />
              {error && <p className="mt-3 rounded-md bg-danger-soft p-2 text-sm text-danger" role="alert">{error}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={() => { setTarget(initial); setError(undefined) }} disabled={!changed}>Сбросить</Button>
                <Button className="flex-1" onClick={save} loading={pending} disabled={!changed}>Сохранить</Button>
              </div>
            </>
          )}
        </Card>
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Журнал изменений заказа</h2>
        <DataTable
          dense
          rows={state.auditLog.filter((a) => a.entity === `Order ${order.number}`)}
          rowKey={(a) => a.id}
          empty={<EmptyState title="Изменений пока нет" />}
          columns={[
            { key: 'd', header: 'Дата', cell: (a) => formatDateTime(a.createdAt) },
            { key: 'a', header: 'Действие', cell: (a) => a.action },
            { key: 'x', header: 'Детали', cell: (a) => a.details },
          ]}
        />
      </section>
    </>
  )
}
