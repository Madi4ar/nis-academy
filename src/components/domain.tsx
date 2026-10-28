// Предметные компоненты: карточки пакетов/учителей/уроков, календарь, детали урока, Zoom-кнопка.
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, GraduationCap, Languages, Star, Users, Video } from 'lucide-react'
import type { Lesson, Package, TeacherProfile } from '@/types'
import { Badge, Button, Card, Input, Textarea } from './ui/primitives'
import { Dialog, Tabs, TabsList, TabsTrigger } from './ui/overlays'
import { Avatar, ConfirmDialog, DemoBadge, EmptyState, FormField, StatusBadge, StarRating } from './common'
import { useAction, useSession, useStore } from '@/services/store'
import {
  lessonDisplayStatus, lessonEnd, lessonParticipants, packageById, studentById, subjectName, teacherById, teacherRating, teacherStats,
} from '@/services/selectors'
import { cancelLesson, rescheduleLesson } from '@/services/mockApi'
import {
  addDays, cn, formatDate, formatMoney, formatTime, gradeRange, LANGUAGE_LABEL, lessonsWord, sameDay, startOfDay, startOfWeek, toLocalInputDate, toLocalInputTime,
} from '@/lib/utils'

export function PackageCard({ pkg }: { pkg: Package }) {
  const { state } = useStore()
  return (
    <Card className="group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-1.5 bg-gradient-to-r from-primary to-secondary" aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-snug">{pkg.title}</h3>
          {pkg.popular && <Badge tone="primary"><Star aria-hidden />Популярный</Badge>}
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-fg-muted">{pkg.description}</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {pkg.subjectIds.map((s) => <Badge key={s} tone="outline">{subjectName(state, s)}</Badge>)}
        </div>
        <ul className="mb-5 grid grid-cols-2 gap-2 text-sm text-fg-muted">
          <li className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />{lessonsWord(pkg.lessonsCount)}</li>
          <li className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{pkg.lessonDuration} мин</li>
          <li className="flex items-center gap-1.5"><GraduationCap className="size-4" aria-hidden />{gradeRange(pkg.grades)}</li>
          <li className="flex items-center gap-1.5"><Users className="size-4" aria-hidden />до {pkg.groupLimit} в группе</li>
          <li className="col-span-2 flex items-center gap-1.5"><Languages className="size-4" aria-hidden />{pkg.languages.map((l) => LANGUAGE_LABEL[l]).join(', ')}</li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="tabular text-2xl font-bold">{formatMoney(pkg.price)}</p>
            <p className="tabular text-xs text-fg-muted">{formatMoney(Math.round(pkg.price / pkg.lessonsCount))} за урок</p>
          </div>
          <Link to={`/packages/${pkg.id}`} className="inline-flex h-10 items-center rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">
            Подробнее
          </Link>
        </div>
      </div>
    </Card>
  )
}

export function TeacherCard({ t }: { t: TeacherProfile }) {
  const { state } = useStore()
  const r = teacherRating(state, t.id)
  return (
    <Card className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={t.name} hue={t.photoHue} size={52} />
        <div className="min-w-0">
          <Link to={`/teachers/${t.id}`} className="font-semibold hover:text-primary">{t.name}</Link>
          <p className="truncate text-xs text-fg-muted">{t.category} · стаж {t.experienceYears} лет</p>
          <div className="mt-0.5 flex items-center gap-1 text-xs">
            {r.count ? <><StarRating value={r.avg} size={12} /><span className="tabular text-fg-muted">{r.avg.toFixed(1)} ({r.count})</span></> : <span className="text-fg-muted">Новый преподаватель</span>}
          </div>
        </div>
      </div>
      <p className="mb-3 line-clamp-2 text-sm text-fg-muted">{t.bio}</p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {t.competencies.map((c) => <Badge key={c.subjectId} tone="primary">{subjectName(state, c.subjectId)} · {c.grades[0]}–{c.grades[1]}</Badge>)}
        {t.languages.map((l) => <Badge key={l} tone="outline">{LANGUAGE_LABEL[l]}</Badge>)}
      </div>
      <Link to={`/teachers/${t.id}`} className="mt-4 text-sm font-medium text-primary hover:underline">Открыть профиль →</Link>
    </Card>
  )
}

export function ZoomButton({ lesson, size = 'md', className }: { lesson: Lesson; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)} disabled={lesson.status === 'cancelled'}>
        <Video aria-hidden /> Открыть тестовую Zoom-ссылку
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Тестовая Zoom-ссылка"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Закрыть</Button>
            <a href={lesson.zoomUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover" onClick={() => setOpen(false)}>
              <ExternalLink className="size-4" aria-hidden /> Перейти
            </a>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <DemoBadge>Тестовая Zoom-ссылка</DemoBadge>
          <p>В прототипе нет интеграции с Zoom API. Ссылку вставил модератор при создании урока:</p>
          <code className="block break-all rounded-md bg-muted p-2 text-xs">{lesson.zoomUrl}</code>
        </div>
      </Dialog>
    </>
  )
}

export function LessonCard({ lesson, onOpen, showZoom }: { lesson: Lesson; onOpen?: () => void; showZoom?: boolean }) {
  const { state } = useStore()
  const t = teacherById(state, lesson.teacherId)
  const parts = lessonParticipants(state, lesson.id, lesson.status === 'cancelled')
  const status = lessonDisplayStatus(lesson)
  return (
    <Card className={cn('p-4', onOpen && 'cursor-pointer transition hover:border-primary/40 hover:shadow-md')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button className="flex flex-1 items-start gap-3 text-left" onClick={onOpen} disabled={!onOpen} aria-label={`Детали урока: ${subjectName(state, lesson.subjectId)}`}>
          <div className="flex w-14 shrink-0 flex-col items-center rounded-[var(--radius-sm)] bg-primary-soft py-1.5 text-primary">
            <span className="text-[11px] font-medium uppercase">{formatDate(lesson.start, { weekday: 'short' })}</span>
            <span className="tabular text-lg font-bold leading-none">{new Date(lesson.start).getDate()}</span>
            <span className="text-[11px]">{formatDate(lesson.start, { month: 'short' })}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{subjectName(state, lesson.subjectId)}</p>
              <StatusBadge status={status} />
            </div>
            <p className="tabular text-sm text-fg-muted">
              {formatTime(lesson.start)}–{formatTime(new Date(lessonEnd(lesson)).toISOString())} · {lesson.grade} класс · {LANGUAGE_LABEL[lesson.language]}
            </p>
            <p className="truncate text-sm text-fg-muted">
              {t?.name} · {parts.length} {parts.length === 1 ? 'ученик' : 'учеников'}
              {lesson.topic && ` · «${lesson.topic}»`}
            </p>
          </div>
        </button>
        {showZoom && lesson.status === 'scheduled' && lessonEnd(lesson) > Date.now() && <ZoomButton lesson={lesson} size="sm" />}
      </div>
    </Card>
  )
}

/** Детали урока: список участников, статусы, действия по роли. */
export function LessonDetailDialog({ lessonId, onClose }: { lessonId: string | null; onClose: () => void }) {
  const { state } = useStore()
  const { role } = useSession()
  const navigate = useNavigate()
  const { exec, pending } = useAction()
  const lesson = state.lessons.find((l) => l.id === lessonId)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  if (!lesson) return null
  const t = teacherById(state, lesson.teacherId)
  const pkg = packageById(state, lesson.packageId)
  const parts = lessonParticipants(state, lesson.id, true)
  const status = lessonDisplayStatus(lesson)
  const isMod = role === 'moderator'
  const close = () => { setMode('view'); setError(undefined); onClose() }

  const doReschedule = async () => {
    const r = await exec((s) => rescheduleLesson(s, lesson.id, date, time), { success: 'Урок перенесён, участники уведомлены (демо)' })
    if (r.ok) setMode('view')
    else setError(r.error)
  }
  const doCancel = async () => {
    const r = await exec((s) => cancelLesson(s, lesson.id, reason), { success: 'Урок отменён, резервы квот освобождены' })
    if (r.ok) setMode('view')
    else setError(r.error)
  }

  return (
    <>
      <Dialog
        open={!!lessonId && mode !== 'cancel'}
        onOpenChange={(o) => !o && close()}
        title={`${subjectName(state, lesson.subjectId)} · ${lesson.grade} класс`}
        description={`${formatDate(lesson.start, { weekday: 'long', day: 'numeric', month: 'long' })}, ${formatTime(lesson.start)} · ${lesson.durationMin} мин`}
        size="lg"
        footer={
          mode === 'reschedule' ? (
            <>
              <Button variant="outline" onClick={() => setMode('view')}>Назад</Button>
              <Button onClick={doReschedule} loading={pending}>Сохранить перенос</Button>
            </>
          ) : (
            <>
              {isMod && lesson.status === 'scheduled' && lessonEnd(lesson) > Date.now() && (
                <>
                  <Button variant="outline" onClick={() => { setDate(toLocalInputDate(new Date(lesson.start))); setTime(toLocalInputTime(new Date(lesson.start))); setError(undefined); setMode('reschedule') }}>Перенести</Button>
                  <Button variant="danger" onClick={() => { setReason(''); setError(undefined); setMode('cancel') }}>Отменить урок</Button>
                </>
              )}
              {isMod && lesson.status === 'pending_approval' && <Button onClick={() => { close(); navigate('/moderator/reports') }}>К проверке отчёта</Button>}
              {role === 'teacher' && ['awaiting_report', 'needs_revision'].includes(status) && (
                <Button onClick={() => { close(); navigate(`/teacher/lessons/${lesson.id}/report`) }}>Заполнить отчёт</Button>
              )}
              {['student', 'parent', 'teacher'].includes(role) && lesson.status === 'scheduled' && lessonEnd(lesson) > Date.now() && <ZoomButton lesson={lesson} />}
              <Button variant="outline" onClick={close}>Закрыть</Button>
            </>
          )
        }
      >
        {mode === 'reschedule' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Новая дата" htmlFor="rs-date" error={error}>
              <Input id="rs-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Новое время" htmlFor="rs-time">
              <Input id="rs-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </FormField>
            <p className="text-xs text-fg-muted sm:col-span-2">Проверяются пересечения у преподавателя и учеников. Правила переноса — демо-вариант, требуют согласования.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {pkg && <Badge tone="outline">{pkg.title}</Badge>}
              <Badge tone="outline">{LANGUAGE_LABEL[lesson.language]}</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-muted/60 p-3">
              {t && <Avatar name={t.name} hue={t.photoHue} size={36} />}
              <div className="text-sm">
                <p className="font-medium">{t?.name}</p>
                <p className="text-fg-muted">Преподаватель</p>
              </div>
            </div>
            {lesson.topic && <p className="text-sm"><span className="text-fg-muted">Тема:</span> {lesson.topic}</p>}
            {lesson.moderatorComment && <p className="rounded-md bg-warning-soft p-2 text-sm text-amber-900"><b>Комментарий модератора:</b> {lesson.moderatorComment}</p>}
            <div>
              <p className="mb-2 text-sm font-semibold">Участники ({parts.filter((p) => p.active).length})</p>
              <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
                {parts.map((p) => {
                  const st = studentById(state, p.studentId)
                  const order = state.orders.find((o) => o.id === p.orderId)
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="font-medium">{st?.name}</span>
                      <span className="text-xs text-fg-muted">квота из {order?.number}</span>
                      <span className="ml-auto flex gap-1">
                        {p.attendance && <StatusBadge status={p.attendance} />}
                        {p.outcome ? <StatusBadge status={p.outcome} /> : p.active && <Badge tone="warning">Резерв</Badge>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={mode === 'cancel'}
        onOpenChange={(o) => !o && setMode('view')}
        title="Отменить урок?"
        description="Резервы квот всех участников будут освобождены, участники получат демо-уведомление."
        confirmLabel="Отменить урок"
        danger
        loading={pending}
        onConfirm={doCancel}
      >
        <FormField label="Причина отмены" htmlFor="cancel-reason" error={error} required>
          <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Например: болезнь преподавателя" />
        </FormField>
      </ConfirmDialog>
    </>
  )
}

type CalView = 'day' | 'week' | 'month' | 'list'

export function CalendarView({ lessons, onLessonClick, views = ['day', 'week', 'month', 'list'], defaultView = 'week', toolbar }: {
  lessons: Lesson[]; onLessonClick: (l: Lesson) => void; views?: CalView[]; defaultView?: CalView; toolbar?: React.ReactNode
}) {
  const [view, setView] = useState<CalView>(defaultView)
  const [cursor, setCursor] = useState(() => startOfDay(new Date()))
  const { state } = useStore()
  const sorted = useMemo(() => [...lessons].sort((a, b) => a.start.localeCompare(b.start)), [lessons])
  const step = (dir: number) => {
    if (view === 'day') setCursor((c) => addDays(c, dir))
    else if (view === 'week' || view === 'list') setCursor((c) => addDays(c, 7 * dir))
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  }
  const weekStart = startOfWeek(cursor)
  const title =
    view === 'day' ? formatDate(cursor.toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })
      : view === 'month' ? cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        : `${formatDate(weekStart.toISOString(), { day: 'numeric', month: 'short' })} — ${formatDate(addDays(weekStart, 6).toISOString(), { day: 'numeric', month: 'short' })}`
  const label: Record<CalView, string> = { day: 'День', week: 'Неделя', month: 'Месяц', list: 'Список' }

  const chip = (l: Lesson) => {
    const st = lessonDisplayStatus(l)
    const tone = st === 'cancelled' ? 'border-slate-300 bg-slate-50 text-slate-500 line-through' : st === 'closed' ? 'border-emerald-200 bg-success-soft text-emerald-900' : ['awaiting_report', 'pending_approval', 'needs_revision'].includes(st) ? 'border-amber-200 bg-warning-soft text-amber-900' : 'border-indigo-200 bg-primary-soft text-indigo-900'
    return (
      <button key={l.id} onClick={() => onLessonClick(l)} className={cn('w-full cursor-pointer rounded-md border px-2 py-1 text-left text-xs transition hover:shadow', tone)}>
        <span className="tabular font-semibold">{formatTime(l.start)}</span> {subjectName(state, l.subjectId)}
        <span className="block truncate opacity-80">{l.grade} кл · {teacherById(state, l.teacherId)?.name.split(' ')[0]}</span>
      </button>
    )
  }

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Назад"><ChevronLeft /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Сегодня</Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Вперёд"><ChevronRight /></Button>
          <h2 className="ml-1 text-base font-semibold capitalize">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <Tabs value={view} onValueChange={(v) => setView(v as CalView)}>
            <TabsList aria-label="Вид календаря">
              {views.map((v) => <TabsTrigger key={v} value={v}>{label[v]}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === 'week' && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((d) => {
            const items = sorted.filter((l) => sameDay(new Date(l.start), d))
            const isToday = sameDay(d, new Date())
            return (
              <div key={d.toISOString()} className={cn('min-h-28 rounded-[var(--radius-sm)] border border-border p-2', isToday && 'border-primary/50 bg-primary-soft/30')}>
                <p className={cn('mb-2 text-xs font-medium capitalize text-fg-muted', isToday && 'text-primary')}>
                  {d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                </p>
                <div className="space-y-1.5">{items.length ? items.map(chip) : <p className="text-xs text-fg-muted/60 md:hidden">Нет уроков</p>}</div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'day' && (
        <div className="space-y-2">
          {sorted.filter((l) => sameDay(new Date(l.start), cursor)).length ? (
            sorted.filter((l) => sameDay(new Date(l.start), cursor)).map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => onLessonClick(l)} />)
          ) : (
            <EmptyState title="В этот день уроков нет" description="Переключитесь на другой день или неделю." />
          )}
        </div>
      )}

      {view === 'month' && (() => {
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
        const gridStart = startOfWeek(first)
        return (
          <div>
            <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-fg-muted">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).map((d) => {
                const items = sorted.filter((l) => sameDay(new Date(l.start), d))
                const inMonth = d.getMonth() === cursor.getMonth()
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => { setCursor(d); setView('day') }}
                    className={cn('min-h-16 cursor-pointer rounded-md border border-border p-1 text-left text-xs hover:border-primary/50', !inMonth && 'opacity-40', sameDay(d, new Date()) && 'border-primary bg-primary-soft/40')}
                    aria-label={`${d.toLocaleDateString('ru-RU')}: ${items.length} уроков`}
                  >
                    <span className="tabular font-medium">{d.getDate()}</span>
                    {items.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-0.5">
                        {items.slice(0, 4).map((l) => <span key={l.id} className={cn('size-1.5 rounded-full', l.status === 'cancelled' ? 'bg-slate-300' : l.status === 'closed' ? 'bg-emerald-500' : 'bg-primary')} />)}
                        <span className="tabular hidden w-full text-[10px] text-fg-muted sm:block">{items.length} ур.</span>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      {view === 'list' && (
        <div className="space-y-2">
          {sorted.filter((l) => new Date(l.start) >= addDays(weekStart, -7)).length ? (
            sorted.filter((l) => new Date(l.start) >= addDays(weekStart, -7)).map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => onLessonClick(l)} />)
          ) : (
            <EmptyState title="Уроков нет" />
          )}
        </div>
      )}
    </Card>
  )
}

export function TeacherStatsInline({ teacherId }: { teacherId: string }) {
  const { state } = useStore()
  const st = teacherStats(state, teacherId)
  const r = teacherRating(state, teacherId)
  return (
    <dl className="grid grid-cols-3 gap-3 text-center">
      <div className="rounded-[var(--radius-sm)] bg-muted p-3"><dt className="text-xs text-fg-muted">Проведено</dt><dd className="tabular text-xl font-bold">{st.lessonsHeld}</dd></div>
      <div className="rounded-[var(--radius-sm)] bg-muted p-3"><dt className="text-xs text-fg-muted">Учеников</dt><dd className="tabular text-xl font-bold">{st.students}</dd></div>
      <div className="rounded-[var(--radius-sm)] bg-muted p-3"><dt className="text-xs text-fg-muted">Рейтинг</dt><dd className="tabular text-xl font-bold">{r.count ? r.avg.toFixed(1) : '—'}</dd></div>
    </dl>
  )
}
