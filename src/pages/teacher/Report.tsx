import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, Send, X } from 'lucide-react'
import { useAction, useSession, useStore } from '@/services/store'
import { submitReport, type ReportDraft } from '@/services/mockApi'
import { lessonDisplayStatus, lessonEnd, lessonParticipants, studentById, subjectName } from '@/services/selectors'
import { Avatar, ConfirmDialog, EmptyState, FormField, PageHeader, StatusBadge } from '@/components/common'
import { Button, Card, Checkbox, Input, Textarea } from '@/components/ui/primitives'
import { cn, formatDate, formatTime, LANGUAGE_LABEL, toLocalInputTime } from '@/lib/utils'
import type { Attendance } from '@/types'

/** Строка посещаемости: отметка и индивидуальная заметка по ученику. */
function StudentAttendanceRow({ name, grade, attendance, note, onChange, disabled, error }: {
  name: string; grade: number; attendance?: Attendance; note: string; onChange: (p: { attendance?: Attendance; note?: string }) => void; disabled?: boolean; error?: boolean
}) {
  return (
    <li className={cn('grid gap-3 p-4 md:grid-cols-[220px_auto_1fr] md:items-start', error && 'bg-danger-soft/30')}>
      <div className="flex items-center gap-2">
        <Avatar name={name} size={32} hue={grade * 30} />
        <div><p className="text-sm font-medium">{name}</p><p className="text-xs text-fg-muted">{grade} класс</p></div>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label={`Посещаемость: ${name}`}>
        <button type="button" role="radio" aria-checked={attendance === 'present'} disabled={disabled} onClick={() => onChange({ attendance: 'present' })} className={cn('flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50', attendance === 'present' ? 'border-success bg-success-soft text-success' : 'border-border hover:bg-muted')}>
          <Check className="size-4" aria-hidden />Был
        </button>
        <button type="button" role="radio" aria-checked={attendance === 'absent'} disabled={disabled} onClick={() => onChange({ attendance: 'absent' })} className={cn('flex cursor-pointer items-center gap-1 rounded-[var(--radius-sm)] border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50', attendance === 'absent' ? 'border-danger bg-danger-soft text-danger' : 'border-border hover:bg-muted')}>
          <X className="size-4" aria-hidden />Пропуск
        </button>
      </div>
      <Textarea rows={2} value={note} disabled={disabled} onChange={(e) => onChange({ note: e.target.value })} placeholder="Индивидуальная обратная связь: что получилось, что повторить" aria-label={`Заметка: ${name}`} className="min-h-16" />
    </li>
  )
}

export default function TeacherReport() {
  const { id } = useParams()
  const { state } = useStore()
  const { teacher } = useSession()
  const { exec, pending } = useAction()
  const navigate = useNavigate()
  const lesson = state.lessons.find((l) => l.id === id)
  const parts = lesson ? lessonParticipants(state, lesson.id) : []
  const [draft, setDraft] = useState<ReportDraft>(() => ({
    topic: lesson?.topic ?? '',
    actualTime: lesson ? toLocalInputTime(new Date(lesson.actualStart ?? lesson.start)) : '',
    held: lesson?.held ?? true,
    comment: lesson?.teacherComment ?? '',
    rows: parts.map((p) => ({ participantId: p.id, attendance: p.attendance, note: p.note ?? '' })),
  }))
  const [error, setError] = useState<{ field?: string; msg: string }>()
  const [confirm, setConfirm] = useState(false)

  if (!lesson || lesson.teacherId !== teacher?.id) return <EmptyState title="Урок не найден" description="Отчёт доступен только преподавателю урока." action={<Link to="/teacher" className="text-primary hover:underline">К занятиям</Link>} />
  const status = lessonDisplayStatus(lesson)
  const editable = ['awaiting_report', 'needs_revision'].includes(status)
  const notYet = lessonEnd(lesson) > Date.now() && lesson.status === 'scheduled'

  const setRow = (pid: string, patch: { attendance?: Attendance; note?: string }) => setDraft({ ...draft, rows: draft.rows.map((r) => (r.participantId === pid ? { ...r, ...patch } : r)) })
  const submit = async () => {
    setError(undefined)
    const r = await exec((s) => submitReport(s, lesson.id, draft), { success: 'Отчёт отправлен модератору' })
    setConfirm(false)
    if (r.ok) navigate('/teacher')
    else setError({ field: r.field, msg: r.error })
  }
  const missingRow = error?.field === 'rows' ? draft.rows.find((r) => !r.attendance || r.note.trim().length < 10)?.participantId : undefined

  return (
    <>
      <PageHeader
        title={`Отчёт: ${subjectName(state, lesson.subjectId)}`}
        description={`${formatDate(lesson.start, { weekday: 'long', day: 'numeric', month: 'long' })}, ${formatTime(lesson.start)} · ${lesson.grade} класс · ${LANGUAGE_LABEL[lesson.language]}`}
        crumbs={[{ label: 'Мои занятия', to: '/teacher' }, { label: 'Отчёт' }]}
        actions={<StatusBadge status={status} className="text-sm" />}
      />
      {lesson.status === 'needs_revision' && <div role="alert" className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-danger-soft/60 p-4 text-sm"><b>Модератор вернул отчёт:</b> {lesson.moderatorComment}</div>}
      {notYet && <div className="mb-4 rounded-[var(--radius-md)] bg-info-soft p-4 text-sm text-info">Урок ещё не закончился — отчёт можно будет отправить после {formatTime(new Date(lessonEnd(lesson)).toISOString())}.</div>}
      {!editable && !notYet && <div className="mb-4 rounded-[var(--radius-md)] bg-muted p-4 text-sm">Отчёт {lesson.status === 'closed' ? 'подтверждён модератором — урок закрыт' : 'отправлен и ожидает проверки'}. Редактирование недоступно.</div>}

      <form onSubmit={(e) => { e.preventDefault(); setConfirm(true) }} noValidate className="space-y-6">
        <Card className="space-y-4 p-6">
          <Checkbox checked={draft.held} disabled={!editable} onChange={(e) => setDraft({ ...draft, held: e.target.checked })} label={<b>Урок состоялся</b>} />
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <FormField label="Тема урока" htmlFor="rp-topic" error={error?.field === 'topic' ? error.msg : undefined} required={draft.held}>
              <Input id="rp-topic" value={draft.topic} disabled={!editable || !draft.held} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} aria-invalid={error?.field === 'topic'} />
            </FormField>
            <FormField label="Фактическое начало" htmlFor="rp-time" error={error?.field === 'actualTime' ? error.msg : undefined} required={draft.held}>
              <Input id="rp-time" type="time" value={draft.actualTime} disabled={!editable || !draft.held} onChange={(e) => setDraft({ ...draft, actualTime: e.target.value })} />
            </FormField>
          </div>
          <FormField label={draft.held ? 'Комментарий для модератора (необязательно)' : 'Почему урок не состоялся?'} htmlFor="rp-comment" error={error?.field === 'comment' ? error.msg : undefined} required={!draft.held}>
            <Textarea id="rp-comment" value={draft.comment} disabled={!editable} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} />
          </FormField>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
            <div>
              <h2 className="font-semibold">Посещаемость и обратная связь</h2>
              <p className="text-xs text-fg-muted">Заметка для каждого ребёнка (минимум 10 символов) — родитель увидит её после подтверждения.</p>
            </div>
            {editable && draft.held && (
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, rows: draft.rows.map((r) => ({ ...r, attendance: 'present' })) })}>Отметить всех</Button>
            )}
          </div>
          {parts.length ? (
            <ul className="divide-y divide-border">
              {parts.map((p) => {
                const row = draft.rows.find((r) => r.participantId === p.id)!
                const st = studentById(state, p.studentId)
                return <StudentAttendanceRow key={p.id} name={st?.name ?? '?'} grade={st?.grade ?? 0} attendance={row.attendance} note={row.note} disabled={!editable || !draft.held} onChange={(patch) => setRow(p.id, patch)} error={missingRow === p.id} />
              })}
            </ul>
          ) : <div className="p-4"><EmptyState title="Нет участников" /></div>}
        </Card>

        {error && !['topic', 'actualTime', 'comment'].includes(error.field ?? '') && <p className="rounded-md bg-danger-soft p-3 text-sm text-danger" role="alert">{error.msg}</p>}
        {editable && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/teacher')}>Отмена</Button>
            <Button type="submit"><Send aria-hidden />Отправить отчёт</Button>
          </div>
        )}
      </form>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Отправить отчёт?" description="Отчёт уйдёт модератору. До подтверждения квоты учеников остаются в резерве — списания не будет." confirmLabel="Отправить" loading={pending} onConfirm={submit} />
    </>
  )
}
