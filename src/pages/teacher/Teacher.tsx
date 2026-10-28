import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Plus, Send, Trash2, Users } from 'lucide-react'
import { useAction, useNow, useSession, useStore } from '@/services/store'
import { saveTeacherProfile } from '@/services/mockApi'
import { lessonDisplayStatus, lessonsForTeacher, studentById, subjectName, teacherRating, upcoming } from '@/services/selectors'
import { CalendarView, LessonCard, LessonDetailDialog } from '@/components/domain'
import { Avatar, ConfirmDialog, DemoNotice, EmptyState, FormField, PageHeader, StatCard, StatusBadge } from '@/components/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Badge, Button, Card, Checkbox, Input, Select, Textarea } from '@/components/ui/primitives'
import { LANGUAGE_LABEL } from '@/lib/utils'
import type { Language, TeacherProfile } from '@/types'

export function TeacherDashboard() {
  const { state } = useStore()
  const { teacher } = useSession()
  const now = useNow()
  const navigate = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  if (!teacher) return <EmptyState title="Анкета не найдена" description="Попросите модератора назначить роль учителя." />
  const lessons = lessonsForTeacher(state, teacher.id)
  const toReport = lessons.filter((l) => ['awaiting_report', 'needs_revision'].includes(lessonDisplayStatus(l, now))).sort((a, b) => a.start.localeCompare(b.start))
  const next = upcoming(lessons, now)
  const onReview = lessons.filter((l) => l.status === 'pending_approval')
  const closed = lessons.filter((l) => l.status === 'closed').sort((a, b) => b.start.localeCompare(a.start))
  const r = teacherRating(state, teacher.id)
  const groups = state.groups.filter((g) => g.teacherId === teacher.id)

  return (
    <>
      <PageHeader title="Мои занятия" description={`${teacher.name} · ${teacher.competencies.map((c) => subjectName(state, c.subjectId)).join(', ') || 'предметы не указаны'}`} actions={<Link to="/teacher/profile" className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-border bg-surface px-4 text-sm font-medium hover:bg-muted">Анкета</Link>} />
      {teacher.status !== 'published' && (
        <div role="status" className="mb-6 flex flex-col gap-2 rounded-[var(--radius-md)] border border-amber-200 bg-warning-soft/60 p-4 text-sm sm:flex-row sm:items-center">
          <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="flex-1">Статус анкеты: <StatusBadge status={teacher.status} />. {teacher.status === 'needs_revision' ? `Замечание модератора: ${teacher.moderatorComment}` : teacher.status === 'pending_review' ? 'Модератор проверяет анкету — пока профиль не виден в каталоге.' : 'Профиль не виден в каталоге.'}</p>
          <Link to="/teacher/profile" className="font-medium text-warning hover:underline">Открыть анкету →</Link>
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Нужно заполнить отчёт" value={toReport.length} icon={<ClipboardList />} tone={toReport.length ? 'warning' : 'success'} />
        <StatCard label="Предстоящих уроков" value={next.length} icon={<CalendarDays />} tone="info" />
        <StatCard label="Проведено и закрыто" value={closed.length} icon={<CheckCircle2 />} tone="success" />
        <StatCard label="Рейтинг" value={r.count ? r.avg.toFixed(1) : '—'} hint={`${r.count} отзывов`} icon={<Users />} />
      </div>

      <Tabs defaultValue={toReport.length ? 'report' : 'next'}>
        <TabsList>
          <TabsTrigger value="report">Отчёты {toReport.length > 0 && <Badge tone="warning" className="ml-1">{toReport.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="next">Предстоящие</TabsTrigger>
          <TabsTrigger value="calendar">Календарь</TabsTrigger>
          <TabsTrigger value="history">На проверке и закрытые</TabsTrigger>
          <TabsTrigger value="groups">Группы</TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="space-y-2">
          {toReport.length ? toReport.map((l) => (
            <div key={l.id} className="space-y-1">
              <LessonCard lesson={l} onOpen={() => navigate(`/teacher/lessons/${l.id}/report`)} />
              {l.status === 'needs_revision' && <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">Возвращён: {l.moderatorComment}</p>}
            </div>
          )) : <EmptyState icon={<CheckCircle2 />} title="Все отчёты отправлены" description="Новые появятся после окончания уроков." />}
        </TabsContent>
        <TabsContent value="next" className="space-y-2">
          {next.length ? next.map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => setOpen(l.id)} showZoom />) : <EmptyState title="Нет запланированных уроков" />}
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarView lessons={lessons} onLessonClick={(l) => setOpen(l.id)} />
        </TabsContent>
        <TabsContent value="history" className="space-y-2">
          {[...onReview, ...closed].length ? [...onReview, ...closed].map((l) => <LessonCard key={l.id} lesson={l} onOpen={() => setOpen(l.id)} />) : <EmptyState title="Пока пусто" />}
        </TabsContent>
        <TabsContent value="groups">
          {groups.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((g) => (
                <Card key={g.id} className="p-4">
                  <div className="mb-2 flex items-center justify-between"><p className="font-semibold">{g.name}</p><Badge tone="outline">{g.members.length}/{g.limit}</Badge></div>
                  <p className="mb-3 text-xs text-fg-muted">{subjectName(state, g.subjectId)} · {g.grade} класс · {LANGUAGE_LABEL[g.language]}</p>
                  <ul className="space-y-1.5">
                    {g.members.map((m) => {
                      const st = studentById(state, m.studentId)
                      return <li key={m.studentId} className="flex items-center gap-2 text-sm"><Avatar name={st?.name ?? '?'} size={24} hue={(st?.grade ?? 1) * 30} />{st?.name}</li>
                    })}
                  </ul>
                </Card>
              ))}
            </div>
          ) : <EmptyState title="Групп пока нет" description="Модератор назначит вас преподавателем группы." />}
        </TabsContent>
      </Tabs>
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
    </>
  )
}

const CATEGORIES = ['Педагог', 'Педагог-модератор', 'Педагог-эксперт', 'Педагог-исследователь', 'Педагог-мастер']

export function TeacherProfilePage() {
  const { state } = useStore()
  const { teacher } = useSession()
  const { exec, pending } = useAction()
  const [draft, setDraft] = useState<TeacherProfile | null>(() => (teacher ? structuredClone(teacher) : null))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  if (!teacher || !draft) return <EmptyState title="Анкета не найдена" description="Попросите модератора назначить роль учителя." />

  const save = async (submit: boolean) => {
    setErrors({})
    const r = await exec((s) => saveTeacherProfile(s, draft, submit), { success: submit ? 'Анкета отправлена на проверку модератору' : 'Черновик сохранён' })
    if (!r.ok) setErrors(r.field ? { [r.field]: r.error } : {})
    else setDraft(structuredClone({ ...draft, status: submit ? 'pending_review' : draft.status }))
    setConfirm(false)
  }
  const setComp = (i: number, patch: Partial<TeacherProfile['competencies'][0]>) =>
    setDraft({ ...draft, competencies: draft.competencies.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  const toggleLang = (l: Language) => setDraft({ ...draft, languages: draft.languages.includes(l) ? draft.languages.filter((x) => x !== l) : [...draft.languages, l] })
  const locked = teacher.status === 'pending_review'

  return (
    <>
      <PageHeader title="Анкета преподавателя" description="После отправки модератор проверит анкету. Опубликованный профиль виден в каталоге." crumbs={[{ label: 'Мои занятия', to: '/teacher' }, { label: 'Анкета' }]} actions={<StatusBadge status={teacher.status} className="text-sm" />} />
      {teacher.status === 'needs_revision' && <div role="alert" className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-danger-soft/60 p-4 text-sm"><b>Замечание модератора:</b> {teacher.moderatorComment}</div>}
      {locked && <DemoNotice className="mb-4">Анкета на проверке — редактирование недоступно до решения модератора. Войдите модератором, чтобы одобрить или вернуть её.</DemoNotice>}
      {teacher.status === 'published' && <DemoNotice className="mb-4">Профиль опубликован. Повторная отправка изменений снимет его с каталога до новой проверки.</DemoNotice>}
      <form onSubmit={(e) => { e.preventDefault(); setConfirm(true) }} noValidate>
        <fieldset disabled={locked} className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit p-6 text-center">
            <Avatar name={draft.name || '?'} hue={draft.photoHue} size={112} className="mx-auto" />
            <p className="mt-2 text-xs text-fg-muted">Фото-заглушка (загрузка файлов в прототипе не нужна)</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setDraft({ ...draft, photoHue: Math.floor(Math.random() * 360) })}>Сменить цвет</Button>
          </Card>
          <Card className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="ФИО" htmlFor="tp-name" error={errors.name} required className="sm:col-span-2">
                <Input id="tp-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-invalid={!!errors.name} />
              </FormField>
              <FormField label="Стаж, лет" htmlFor="tp-exp">
                <Input id="tp-exp" type="number" min={0} value={draft.experienceYears} onChange={(e) => setDraft({ ...draft, experienceYears: Math.max(0, +e.target.value) })} />
              </FormField>
              <FormField label="Категория" htmlFor="tp-cat" error={errors.category} required>
                <Select id="tp-cat" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} aria-invalid={!!errors.category}>
                  <option value="">— выберите —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label="Школа / место работы" htmlFor="tp-school" error={errors.school} required className="sm:col-span-2">
                <Input id="tp-school" value={draft.school} onChange={(e) => setDraft({ ...draft, school: e.target.value })} aria-invalid={!!errors.school} />
              </FormField>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Предметы и классы <span className="text-danger">*</span></p>
              <div className="space-y-2">
                {draft.competencies.map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-border p-2">
                    <Select value={c.subjectId} onChange={(e) => setComp(i, { subjectId: e.target.value })} aria-label="Предмет" className="w-48">
                      {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <span className="text-sm text-fg-muted">классы</span>
                    <Input type="number" min={1} max={11} value={c.grades[0]} onChange={(e) => setComp(i, { grades: [+e.target.value, c.grades[1]] })} className="w-16" aria-label="С класса" />
                    <span aria-hidden>–</span>
                    <Input type="number" min={1} max={11} value={c.grades[1]} onChange={(e) => setComp(i, { grades: [c.grades[0], +e.target.value] })} className="w-16" aria-label="По класс" />
                    <Button variant="ghost" size="icon" onClick={() => setDraft({ ...draft, competencies: draft.competencies.filter((_, j) => j !== i) })} aria-label="Удалить предмет" className="ml-auto"><Trash2 /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, competencies: [...draft.competencies, { subjectId: state.subjects.find((s) => !draft.competencies.some((c) => c.subjectId === s.id))?.id ?? state.subjects[0].id, grades: [5, 9] }] })}><Plus aria-hidden />Добавить предмет</Button>
              </div>
              {errors.competencies && <p className="mt-1 text-xs text-danger" role="alert">{errors.competencies}</p>}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Языки преподавания <span className="text-danger">*</span></p>
              <div className="flex gap-4">
                {(['ru', 'kz'] as Language[]).map((l) => <Checkbox key={l} checked={draft.languages.includes(l)} onChange={() => toggleLang(l)} label={LANGUAGE_LABEL[l]} />)}
              </div>
              {errors.languages && <p className="mt-1 text-xs text-danger" role="alert">{errors.languages}</p>}
            </div>
            <FormField label="Биография" htmlFor="tp-bio" error={errors.bio} required hint={`${draft.bio.trim().length}/40 символов минимум`}>
              <Textarea id="tp-bio" rows={5} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} aria-invalid={!!errors.bio} />
            </FormField>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => save(false)} loading={pending}>Сохранить черновик</Button>
              <Button type="submit"><Send aria-hidden />Отправить на проверку</Button>
            </div>
          </Card>
        </fieldset>
      </form>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Отправить анкету на проверку?" description="Статус изменится на «На проверке». До решения модератора редактирование будет недоступно." confirmLabel="Отправить" loading={pending} onConfirm={() => save(true)} />
    </>
  )
}
