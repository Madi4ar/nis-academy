import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ClipboardCheck, ShieldCheck, Wallet, UserX } from 'lucide-react'
import { useNow, useStore } from '@/services/store'
import { lessonDisplayStatus, lessonParticipants, quotaBalance, studentById, subjectName, teacherById, upcoming } from '@/services/selectors'
import { DataTable, PageHeader, StatCard, StatusBadge } from '@/components/common'
import { LessonDetailDialog } from '@/components/domain'
import { Badge, Card } from '@/components/ui/primitives'
import { addDays, formatDateTime, formatMoney, startOfDay } from '@/lib/utils'

export default function ModeratorDashboard() {
  const { state } = useStore()
  const now = useNow()
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)

  const pendingTeachers = state.teachers.filter((t) => t.status === 'pending_review')
  const pendingReports = state.lessons.filter((l) => l.status === 'pending_approval')
  const awaiting = state.lessons.filter((l) => lessonDisplayStatus(l, now) === 'awaiting_report')
  const weekEnd = addDays(startOfDay(new Date()), 7).getTime()
  const weekLessons = upcoming(state.lessons, now).filter((l) => new Date(l.start).getTime() < weekEnd)
  const paid = state.orders.filter((o) => o.status === 'paid')
  const revenue = paid.reduce((a, o) => a + o.total, 0)
  // Ученики со свободными квотами без запланированных уроков по предмету — кандидаты на планирование
  const needSchedule = state.students.flatMap((st) => {
    const subjects = [...new Set(paid.filter((o) => o.studentId === st.id).flatMap((o) => o.items.map((i) => i.subjectId)))]
    return subjects
      .filter((s) => quotaBalance(state, { studentId: st.id, subjectId: s }).free > 0)
      .filter((s) => !upcoming(state.lessons, now).some((l) => l.subjectId === s && lessonParticipants(state, l.id).some((p) => p.studentId === st.id)))
      .map((s) => ({ id: `${st.id}-${s}`, studentId: st.id, subjectId: s, free: quotaBalance(state, { studentId: st.id, subjectId: s }).free }))
  })

  type Task = { id: string; kind: string; title: string; meta: string; status: string; to: string; at: string }
  const tasks: Task[] = [
    ...pendingTeachers.map((t) => ({ id: t.id, kind: 'Анкета', title: t.name, meta: t.competencies.map((c) => subjectName(state, c.subjectId)).join(', '), status: 'pending_review', to: '/moderator/teachers', at: t.updatedAt })),
    ...pendingReports.map((l) => ({ id: l.id, kind: 'Отчёт', title: `${subjectName(state, l.subjectId)} · ${l.grade} кл`, meta: teacherById(state, l.teacherId)?.name ?? '', status: 'pending_approval', to: '/moderator/reports', at: l.start })),
    ...awaiting.map((l) => ({ id: l.id, kind: 'Нет отчёта', title: `${subjectName(state, l.subjectId)} · ${l.grade} кл`, meta: teacherById(state, l.teacherId)?.name ?? '', status: 'awaiting_report', to: '/moderator/calendar', at: l.start })),
  ]

  return (
    <>
      <PageHeader title="Рабочая панель модератора" description="Очереди проверки, ближайшие уроки и ключевые показатели." actions={<Link to="/moderator/calendar?create=1" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">Создать урок</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Анкеты на проверке" value={pendingTeachers.length} icon={<ShieldCheck />} tone={pendingTeachers.length ? 'warning' : 'success'} onClick={() => navigate('/moderator/teachers')} />
        <StatCard label="Отчёты к подтверждению" value={pendingReports.length} icon={<ClipboardCheck />} tone={pendingReports.length ? 'warning' : 'success'} onClick={() => navigate('/moderator/reports')} />
        <StatCard label="Уроков на 7 дней" value={weekLessons.length} icon={<CalendarClock />} tone="info" onClick={() => navigate('/moderator/calendar')} />
        <StatCard label="Ждут расписания" value={needSchedule.length} hint="ученик × предмет" icon={<UserX />} tone={needSchedule.length ? 'danger' : 'success'} onClick={() => navigate('/moderator/groups')} />
        <StatCard label="Выручка (демо)" value={formatMoney(revenue)} hint={`${paid.length} оплаченных заказов`} icon={<Wallet />} onClick={() => navigate('/moderator/analytics')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">Очередь задач <Badge tone="warning">{tasks.length}</Badge></h2>
          <DataTable
            dense
            rows={tasks}
            rowKey={(t) => `${t.kind}-${t.id}`}
            onRowClick={(t) => (t.kind === 'Нет отчёта' ? setOpen(t.id) : navigate(t.to))}
            columns={[
              { key: 'k', header: 'Тип', cell: (t) => <Badge tone="outline">{t.kind}</Badge>, sort: (t) => t.kind },
              { key: 't', header: 'Объект', cell: (t) => <span className="font-medium">{t.title}</span>, sort: (t) => t.title },
              { key: 'm', header: 'Детали', cell: (t) => <span className="text-fg-muted">{t.meta}</span> },
              { key: 'a', header: 'Дата', cell: (t) => <span className="tabular whitespace-nowrap">{formatDateTime(t.at)}</span>, sort: (t) => t.at },
              { key: 's', header: 'Статус', cell: (t) => <StatusBadge status={t.status} /> },
            ]}
            empty={<Card className="p-6 text-center text-sm text-fg-muted">Очередь пуста 🎉</Card>}
          />
          <h2 className="mb-3 mt-6 flex items-center gap-2 text-base font-semibold"><AlertTriangle className="size-4 text-danger" aria-hidden />Оплачено, но не запланировано</h2>
          <DataTable
            dense
            rows={needSchedule}
            rowKey={(r) => r.id}
            onRowClick={() => navigate('/moderator/calendar?create=1')}
            columns={[
              { key: 's', header: 'Ученик', cell: (r) => studentById(state, r.studentId)?.name },
              { key: 'g', header: 'Класс / язык', cell: (r) => { const st = studentById(state, r.studentId); return `${st?.grade} · ${st?.language === 'ru' ? 'рус' : 'каз'}` } },
              { key: 'p', header: 'Предмет', cell: (r) => subjectName(state, r.subjectId) },
              { key: 'f', header: 'Свободно', cell: (r) => <span className="tabular font-semibold text-success">{r.free}</span>, className: 'text-right' },
            ]}
            empty={<Card className="p-6 text-center text-sm text-fg-muted">У всех учеников есть запланированные уроки</Card>}
          />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">Ближайшие уроки</h2>
          <DataTable
            dense
            rows={weekLessons.slice(0, 10)}
            rowKey={(l) => l.id}
            onRowClick={(l) => setOpen(l.id)}
            columns={[
              { key: 'd', header: 'Когда', cell: (l) => <span className="tabular whitespace-nowrap">{formatDateTime(l.start)}</span> },
              { key: 's', header: 'Урок', cell: (l) => `${subjectName(state, l.subjectId)} · ${l.grade}` },
              { key: 't', header: 'Учитель', cell: (l) => teacherById(state, l.teacherId)?.name.split(' ')[0] },
              { key: 'n', header: 'Уч.', cell: (l) => <span className="tabular">{lessonParticipants(state, l.id).length}</span>, className: 'text-right' },
            ]}
          />
          <h2 className="mb-3 mt-6 text-base font-semibold">Последние действия</h2>
          <Card className="divide-y divide-border">
            {state.auditLog.slice(0, 6).map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-sm">
                <p><span className="font-medium">{state.users.find((u) => u.id === a.actorId)?.name ?? 'Гость'}</span> <span className="text-fg-muted">· {a.details}</span></p>
                <p className="text-xs text-fg-muted">{a.entity} · {formatDateTime(a.createdAt)}</p>
              </div>
            ))}
            <Link to="/admin?tab=log" className="block px-4 py-2.5 text-sm text-primary hover:underline">Весь журнал →</Link>
          </Card>
        </section>
      </div>
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
    </>
  )
}
