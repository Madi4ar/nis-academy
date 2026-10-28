import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, MessageSquareText, Plus, Users, Wallet } from 'lucide-react'
import { useSession, useStore } from '@/services/store'
import { childrenOf, lessonsForStudent, quotaBalance, subjectName, upcoming } from '@/services/selectors'
import { Avatar, EmptyState, PageHeader, QuotaBalanceView, StatCard } from '@/components/common'
import { LessonCard, LessonDetailDialog } from '@/components/domain'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui/primitives'
import { formatDateTime, LANGUAGE_LABEL } from '@/lib/utils'

export default function ParentDashboard() {
  const { state } = useStore()
  const { user, parent } = useSession()
  const [openLesson, setOpenLesson] = useState<string | null>(null)
  const kids = childrenOf(state, parent?.id)
  const kidIds = new Set(kids.map((k) => k.id))
  const lessons = [...new Map(kids.flatMap((k) => lessonsForStudent(state, k.id)).map((l) => [l.id, l])).values()]
  const next = upcoming(lessons)
  const unpaid = state.orders.filter((o) => o.parentId === parent?.id && o.status === 'unpaid')
  const free = kids.reduce((a, k) => a + quotaBalance(state, { studentId: k.id }).free, 0)
  const reserved = kids.reduce((a, k) => a + quotaBalance(state, { studentId: k.id }).reserved, 0)
  const feedbackCount = state.feedback.filter((f) => kidIds.has(f.studentId)).length
  const paidOrders = state.orders.filter((o) => o.parentId === parent?.id && o.status === 'paid')

  return (
    <>
      <PageHeader
        title={`Здравствуйте, ${user?.name.split(' ')[0]}!`}
        description="Сводка по детям, остаткам уроков и ближайшим занятиям."
        actions={
          <>
            <Link to="/packages" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"><Plus className="size-4" aria-hidden />Купить пакет</Link>
            {paidOrders[0] && <Link to={`/checkout/${paidOrders[0].packageVersion.packageId}?renew=${paidOrders[0].id}`} className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-border bg-surface px-4 text-sm font-medium hover:bg-muted">Продлить</Link>}
          </>
        }
      />

      {unpaid.length > 0 && (
        <div role="alert" className="mb-6 flex flex-col gap-3 rounded-[var(--radius-md)] border border-red-200 bg-danger-soft/60 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
          <p className="flex-1 text-sm"><b>Есть неоплаченные заказы ({unpaid.length}).</b> Квоты по ним не начислены — {unpaid.map((o) => o.number).join(', ')}.</p>
          <Link to="/parent/orders" className="text-sm font-medium text-danger hover:underline">Оплатить →</Link>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Детей" value={kids.length} icon={<Users />} />
        <StatCard label="Свободно уроков" value={free} hint={`в резерве ещё ${reserved}`} icon={<Wallet />} tone="success" />
        <StatCard label="Ближайших уроков" value={next.length} hint={next[0] ? formatDateTime(next[0].start) : 'нет'} icon={<CalendarDays />} tone="info" />
        <StatCard label="Отчётов учителей" value={feedbackCount} icon={<MessageSquareText />} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="kids-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="kids-h" className="text-lg font-semibold">Дети</h2>
            <Link to="/parent/children" className="text-sm text-primary hover:underline">Управлять</Link>
          </div>
          {kids.length === 0 ? (
            <EmptyState title="Добавьте ребёнка" description="Без профиля ребёнка нельзя купить пакет." action={<Link to="/parent/children" className="text-primary hover:underline">Добавить</Link>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {kids.map((k) => {
                const b = quotaBalance(state, { studentId: k.id })
                const subjects = [...new Set(state.orders.filter((o) => o.studentId === k.id && o.status === 'paid').flatMap((o) => o.packageVersion.subjectIds))]
                const nextL = upcoming(lessonsForStudent(state, k.id))[0]
                return (
                  <Card key={k.id}>
                    <CardHeader className="flex-row items-center gap-3">
                      <Avatar name={k.name} hue={k.grade * 30} size={44} />
                      <div>
                        <CardTitle>{k.name}</CardTitle>
                        <p className="text-xs text-fg-muted">{k.grade} класс · {LANGUAGE_LABEL[k.language]}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {b.purchased > 0 ? <QuotaBalanceView b={b} /> : <p className="text-sm text-fg-muted">Оплаченных пакетов нет</p>}
                      {subjects.length > 0 && (
                        <div className="space-y-1">
                          {subjects.map((s) => {
                            const sb = quotaBalance(state, { studentId: k.id, subjectId: s })
                            return sb.purchased > 0 && (
                              <div key={s} className="flex justify-between text-xs"><span className="text-fg-muted">{subjectName(state, s)}</span><span className="tabular">свободно <b>{sb.free}</b> · резерв {sb.reserved}</span></div>
                            )
                          })}
                        </div>
                      )}
                      <div className="rounded-[var(--radius-sm)] bg-muted/60 p-2.5 text-sm">
                        {nextL ? <>Следующий урок: <b>{subjectName(state, nextL.subjectId)}</b>, {formatDateTime(nextL.start)}</> : <span className="text-fg-muted">Ближайших уроков нет — модератор подберёт группу.</span>}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
        <section aria-labelledby="next-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="next-h" className="text-lg font-semibold">Ближайшие занятия</h2>
            <Link to="/parent/calendar" className="text-sm text-primary hover:underline">Календарь</Link>
          </div>
          <div className="space-y-2">
            {next.slice(0, 4).map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => setOpenLesson(l.id)} />)}
            {next.length === 0 && <EmptyState title="Занятий пока нет" description="Уроки появятся после планирования модератором." />}
          </div>
          <Card className="mt-4 p-4">
            <p className="mb-2 text-sm font-semibold">Быстрые действия</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/packages"><Badge tone="primary" className="cursor-pointer px-3 py-1.5 text-sm">Купить</Badge></Link>
              {paidOrders[0] && <Link to={`/checkout/${paidOrders[0].packageVersion.packageId}?renew=${paidOrders[0].id}`}><Badge tone="primary" className="cursor-pointer px-3 py-1.5 text-sm">Продлить</Badge></Link>}
              {paidOrders[0] && <Link to={`/parent/orders/${paidOrders[0].id}/allocate`}><Badge tone="primary" className="cursor-pointer px-3 py-1.5 text-sm">Перераспределить</Badge></Link>}
              <Link to="/parent/feedback"><Badge tone="primary" className="cursor-pointer px-3 py-1.5 text-sm">Обратная связь учителей</Badge></Link>
            </div>
          </Card>
        </section>
      </div>
      <LessonDetailDialog lessonId={openLesson} onClose={() => setOpenLesson(null)} />
    </>
  )
}
