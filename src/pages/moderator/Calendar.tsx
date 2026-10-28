import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Plus, Wand2 } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { createLesson, pickOrderForQuota, validateLesson, type LessonDraft } from '@/services/mockApi'
import { lessonDisplayStatus, packageById, publishedTeachers, quotaBalance, subjectName, teacherTeaches } from '@/services/selectors'
import { CalendarView, LessonDetailDialog } from '@/components/domain'
import { DemoBadge, DemoNotice, FormField, PageHeader } from '@/components/common'
import { Dialog } from '@/components/ui/overlays'
import { Badge, Button, Input, Select } from '@/components/ui/primitives'
import { addDays, cn, LANGUAGE_LABEL, toLocalInputDate } from '@/lib/utils'
import type { Language } from '@/types'

export default function ModeratorCalendar() {
  const { state } = useStore()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState<string | null>(null)
  const [teacher, setTeacher] = useState('')
  const [subject, setSubject] = useState('')
  const [status, setStatus] = useState('')
  const creating = params.get('create') === '1'
  const setCreating = (v: boolean) => setParams(v ? { create: '1' } : {}, { replace: true })

  const lessons = state.lessons.filter((l) => (!teacher || l.teacherId === teacher) && (!subject || l.subjectId === subject) && (!status || lessonDisplayStatus(l) === status))

  return (
    <>
      <PageHeader title="Календарь" description="Все групповые уроки. Создание урока резервирует по одной квоте на каждого участника." crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Календарь' }]} actions={<Button onClick={() => setCreating(true)}><Plus aria-hidden />Создать урок</Button>} />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select value={teacher} onChange={(e) => setTeacher(e.target.value)} aria-label="Преподаватель" className="sm:w-52"><option value="">Все преподаватели</option>{publishedTeachers(state).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет" className="sm:w-44"><option value="">Все предметы</option>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Статус" className="sm:w-48">
          <option value="">Все статусы</option>
          <option value="scheduled">Запланирован</option>
          <option value="awaiting_report">Ждёт отчёта</option>
          <option value="pending_approval">Отчёт на проверке</option>
          <option value="needs_revision">На доработке</option>
          <option value="closed">Закрыт</option>
          <option value="cancelled">Отменён</option>
        </Select>
      </div>
      <CalendarView lessons={lessons} onLessonClick={(l) => setOpen(l.id)} />
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
      {creating && <CreateLessonDialog onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpen(id) }} />}
    </>
  )
}

function CreateLessonDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [attempted, setAttempted] = useState(false)
  const [d, setD] = useState<LessonDraft>({
    date: toLocalInputDate(addDays(new Date(), 1)), time: '16:00', durationMin: 60, subjectId: 'math', grade: 6, language: 'ru',
    packageId: 'p1', teacherId: '', groupId: '', studentIds: [], zoomUrl: '',
  })
  const set = (patch: Partial<LessonDraft>) => setD((x) => ({ ...x, ...patch }))
  const errors = useMemo(() => validateLesson(state, d), [state, d])
  const show = (k: keyof typeof errors) => (attempted ? (errors[k] as string | undefined) : undefined)
  const pkg = packageById(state, d.packageId)
  const group = state.groups.find((g) => g.id === d.groupId)
  const limit = Math.min(pkg?.groupLimit ?? 99, group?.limit ?? 99)
  const studentsSorted = [...state.students].sort((a, b) => Number(b.grade === d.grade && b.language === d.language) - Number(a.grade === d.grade && a.language === d.language))
  const blocking = Object.keys(errors).length > 0

  const applyGroup = (id: string) => {
    const g = state.groups.find((x) => x.id === id)
    if (!g) return set({ groupId: '' })
    const p = packageById(state, g.packageId)
    set({ groupId: g.id, subjectId: g.subjectId, grade: g.grade, language: g.language, teacherId: g.teacherId, packageId: g.packageId, durationMin: p?.lessonDuration ?? 60, studentIds: g.members.map((m) => m.studentId) })
  }
  const publish = async () => {
    setAttempted(true)
    if (blocking) return
    const r = await exec((s) => createLesson(s, d), { success: `Урок опубликован, зарезервировано квот: ${d.studentIds.length}` })
    if (r.ok) onCreated(r.value)
  }
  const toggleStudent = (id: string) => set({ studentIds: d.studentIds.includes(id) ? d.studentIds.filter((x) => x !== id) : [...d.studentIds, id] })

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Новое групповое занятие"
      description="P-03: валидаторы блокируют публикацию и показывают причину рядом с полем."
      size="xl"
      footer={
        <>
          {attempted && blocking && <p className="mr-auto flex items-center gap-1.5 text-sm text-danger" role="alert"><AlertCircle className="size-4" aria-hidden />Публикация заблокирована: {Object.keys(errors).filter((k) => k !== 'studentIssues').length} ошибк(и)</p>}
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={publish} loading={pending}>Опубликовать урок</Button>
        </>
      }
    >
      <DemoNotice className="mb-4">
        Для проверки валидаторов: <b>завтра в 16:00</b> у Ирины Петровой, Тимура и Максима уже есть урок (конфликт); у <b>Даны</b> нет свободной квоты по математике; у <b>Армана</b> заказ не оплачен; лимит группы «Математика 6 (рус) — А» — 2 ученика.
      </DemoNotice>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <FormField label="Группа (необязательно — подставит параметры и состав)" htmlFor="cl-group">
            <Select id="cl-group" value={d.groupId} onChange={(e) => applyGroup(e.target.value)}>
              <option value="">Без группы — выбрать вручную</option>
              {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members.length}/{g.limit})</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Дата" htmlFor="cl-date" error={show('date') ?? show('start')} required><Input id="cl-date" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} aria-invalid={!!show('start')} /></FormField>
            <FormField label="Время" htmlFor="cl-time" error={show('time')} required><Input id="cl-time" type="time" step={900} value={d.time} onChange={(e) => set({ time: e.target.value })} /></FormField>
          </div>
          <FormField label="Пакет / тип занятия" htmlFor="cl-pkg" error={show('packageId')} required hint={pkg && `${pkg.lessonDuration} мин · лимит ${pkg.groupLimit} · ${pkg.grades[0]}–${pkg.grades[1]} кл`}>
            <Select id="cl-pkg" value={d.packageId} onChange={(e) => { const p = packageById(state, e.target.value); set({ packageId: e.target.value, durationMin: p?.lessonDuration ?? 60, subjectId: p?.subjectIds.includes(d.subjectId) ? d.subjectId : p?.subjectIds[0] ?? '' }) }}>
              {state.packages.filter((p) => p.status === 'published').map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </Select>
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Предмет" htmlFor="cl-subj" error={show('subjectId')} className="col-span-3 sm:col-span-1">
              <Select id="cl-subj" value={d.subjectId} onChange={(e) => set({ subjectId: e.target.value, groupId: '' })}>{(pkg?.subjectIds ?? []).map((s) => <option key={s} value={s}>{subjectName(state, s)}</option>)}</Select>
            </FormField>
            <FormField label="Класс" htmlFor="cl-grade" error={show('grade')}>
              <Select id="cl-grade" value={d.grade} onChange={(e) => set({ grade: +e.target.value })}>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</Select>
            </FormField>
            <FormField label="Язык" htmlFor="cl-lang" error={show('language')}>
              <Select id="cl-lang" value={d.language} onChange={(e) => set({ language: e.target.value as Language })}><option value="ru">Рус</option><option value="kz">Каз</option></Select>
            </FormField>
          </div>
          <FormField label="Проверенный преподаватель" htmlFor="cl-teacher" error={show('teacherId')} required>
            <Select id="cl-teacher" value={d.teacherId} onChange={(e) => set({ teacherId: e.target.value })} aria-invalid={!!show('teacherId')}>
              <option value="">— выберите —</option>
              {publishedTeachers(state).map((t) => <option key={t.id} value={t.id}>{teacherTeaches(t, d.subjectId, d.grade, d.language) ? '✓ ' : '✗ '}{t.name}</option>)}
            </Select>
          </FormField>
          <FormField label={<span className="flex items-center gap-2">Zoom-ссылка <DemoBadge>Тестовая Zoom-ссылка</DemoBadge></span>} htmlFor="cl-zoom" error={show('zoomUrl')} required>
            <div className="flex gap-2">
              <Input id="cl-zoom" value={d.zoomUrl} onChange={(e) => set({ zoomUrl: e.target.value })} placeholder="https://zoom.us/j/…" aria-invalid={!!show('zoomUrl')} />
              <Button variant="outline" onClick={() => set({ zoomUrl: `https://zoom.us/j/${Math.floor(1e9 + Math.random() * 9e9)}?demo=1` })} aria-label="Сгенерировать тестовую ссылку"><Wand2 aria-hidden /></Button>
            </div>
          </FormField>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Ученики <span className="text-danger">*</span></p>
            <Badge tone={d.studentIds.length > limit ? 'danger' : 'outline'}>{d.studentIds.length} / {limit === 99 ? '—' : limit}</Badge>
          </div>
          {show('students') && <p className="mb-2 flex items-center gap-1 text-xs text-danger" role="alert"><AlertCircle className="size-3.5" aria-hidden />{show('students')}</p>}
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-[var(--radius-md)] border border-border">
            {studentsSorted.map((st) => {
              const checked = d.studentIds.includes(st.id)
              const free = quotaBalance(state, { studentId: st.id, subjectId: d.subjectId }).free
              const order = pickOrderForQuota(state, st.id, d.subjectId, d.packageId)
              const issue = errors.studentIssues?.[st.id]
              return (
                <li key={st.id} className={cn('flex items-start gap-3 p-3', checked && issue && 'bg-danger-soft/40', checked && !issue && 'bg-primary-soft/30')}>
                  <input type="checkbox" id={`cl-st-${st.id}`} checked={checked} onChange={() => toggleStudent(st.id)} className="mt-1 size-4 accent-[var(--brand-primary)]" />
                  <label htmlFor={`cl-st-${st.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block text-sm font-medium">{st.name}</span>
                    <span className="flex flex-wrap gap-1 pt-1">
                      <Badge tone={st.grade === d.grade ? 'outline' : 'warning'}>{st.grade} кл</Badge>
                      <Badge tone={st.language === d.language ? 'outline' : 'warning'}>{LANGUAGE_LABEL[st.language]}</Badge>
                      <Badge tone={free ? 'success' : 'danger'}>своб. {subjectName(state, d.subjectId).toLowerCase()}: {free}</Badge>
                      {order && <Badge tone="neutral">из {order.number}</Badge>}
                    </span>
                    {checked && issue && <span className="mt-1 flex items-center gap-1 text-xs text-danger"><AlertCircle className="size-3" aria-hidden />{issue}</span>}
                    {checked && !issue && <span className="mt-1 flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3" aria-hidden />Будет зарезервирована 1 квота</span>}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </Dialog>
  )
}
