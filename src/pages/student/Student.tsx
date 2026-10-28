import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, PartyPopper } from 'lucide-react'
import { useNow, useSession, useStore } from '@/services/store'
import { lessonEnd, lessonsForStudent, quotaBalance, subjectName, teacherById, upcoming } from '@/services/selectors'
import { CalendarView, LessonCard, LessonDetailDialog, ZoomButton } from '@/components/domain'
import { StudentReviews } from '@/components/FeedbackPanel'
import { Avatar, EmptyState, PageHeader } from '@/components/common'
import { Card } from '@/components/ui/primitives'
import { formatDate, formatTime } from '@/lib/utils'

function countdown(ms: number) {
  if (ms <= 0) return 'идёт сейчас'
  const h = Math.floor(ms / 3600000)
  const d = Math.floor(h / 24)
  if (d === 1) return 'завтра'
  if (d > 1) return `через ${d} дн.`
  const m = Math.floor((ms % 3600000) / 60000)
  return h ? `через ${h} ч ${m} мин` : `через ${m} мин`
}

export function StudentDashboard() {
  const { state } = useStore()
  const { student, user } = useSession()
  const now = useNow()
  const [open, setOpen] = useState<string | null>(null)
  if (!student) return <EmptyState title="Профиль ученика не найден" description="Этот пользователь не привязан к профилю ученика." />
  const lessons = lessonsForStudent(state, student.id)
  const next = upcoming(lessons, now)
  const first = next[0]
  const t = first && teacherById(state, first.teacherId)
  const subjects = [...new Set(state.orders.filter((o) => o.studentId === student.id && o.status === 'paid').flatMap((o) => o.items.map((i) => i.subjectId)))]

  return (
    <>
      <PageHeader title={`Привет, ${user?.name.split(' ')[0]}! 👋`} description="Здесь твои уроки и оценки учителям." />
      {first ? (
        <Card className="relative mb-6 overflow-hidden border-0 bg-gradient-to-br from-primary to-indigo-700 p-6 text-white sm:p-8">
          <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10" aria-hidden />
          <p className="text-sm font-medium text-indigo-100">Следующий урок · {countdown(new Date(first.start).getTime() - now)}</p>
          <h2 className="mt-1 text-3xl font-bold">{subjectName(state, first.subjectId)}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-indigo-100">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />{formatDate(first.start, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <span className="tabular inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{formatTime(first.start)}–{formatTime(new Date(lessonEnd(first)).toISOString())}</span>
          </p>
          {t && (
            <div className="mt-4 flex items-center gap-3">
              <Avatar name={t.name} hue={t.photoHue} size={40} className="ring-2 ring-white/40" />
              <span className="font-medium">{t.name}</span>
            </div>
          )}
          <ZoomButton lesson={first} size="lg" className="mt-6 bg-white text-primary hover:bg-indigo-50" />
        </Card>
      ) : (
        <div className="mb-6"><EmptyState icon={<PartyPopper />} title="Уроков пока нет" description="Как только модератор добавит тебя в группу, урок появится здесь." /></div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Скоро</h2>
            <Link to="/student/calendar" className="text-sm text-primary hover:underline">Все уроки</Link>
          </div>
          <div className="space-y-2">
            {next.slice(1, 5).map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => setOpen(l.id)} showZoom />)}
            {next.length <= 1 && <p className="text-sm text-fg-muted">Других запланированных уроков нет.</p>}
          </div>
          <h2 className="mb-1 mt-8 text-lg font-semibold">Оцени урок</h2>
          <p className="mb-3 text-sm text-fg-muted">После урока поставь учителю звёзды и напиши пару слов.</p>
          <StudentReviews studentId={student.id} />
        </section>
        <aside>
          <Card className="p-5">
            <p className="mb-3 font-semibold">Сколько уроков осталось</p>
            {subjects.length ? (
              <ul className="space-y-3">
                {subjects.map((s) => {
                  const b = quotaBalance(state, { studentId: student.id, subjectId: s })
                  return (
                    <li key={s}>
                      <div className="flex justify-between text-sm"><span>{subjectName(state, s)}</span><span className="tabular font-semibold">{b.free + b.reserved}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-emerald-500" style={{ width: `${((b.free + b.reserved) / Math.max(b.purchased, 1)) * 100}%` }} /></div>
                      <p className="mt-0.5 text-xs text-fg-muted">{b.reserved} уже в расписании, прошло {b.consumed}</p>
                    </li>
                  )
                })}
              </ul>
            ) : <p className="text-sm text-fg-muted">Пакетов пока нет — попроси родителя выбрать пакет.</p>}
          </Card>
        </aside>
      </div>
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
    </>
  )
}

export function StudentCalendar() {
  const { state } = useStore()
  const { student } = useSession()
  const [open, setOpen] = useState<string | null>(null)
  if (!student) return <EmptyState title="Профиль ученика не найден" />
  return (
    <>
      <PageHeader title="Мои уроки" description="Нажми на урок, чтобы открыть тестовую Zoom-ссылку." crumbs={[{ label: 'Главная', to: '/student' }, { label: 'Мои уроки' }]} />
      <CalendarView lessons={lessonsForStudent(state, student.id)} onLessonClick={(l) => setOpen(l.id)} views={['day', 'week', 'list']} defaultView="list" />
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
    </>
  )
}
