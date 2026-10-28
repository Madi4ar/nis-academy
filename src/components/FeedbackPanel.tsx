import { useState } from 'react'
import { Lock, MessageSquareText, Star } from 'lucide-react'
import { useAction, useNow, useStore } from '@/services/store'
import { addReview } from '@/services/mockApi'
import { lessonEnd, studentById, subjectName, teacherById } from '@/services/selectors'
import { Avatar, EmptyState, FormField, StarRating, StatusBadge } from './common'
import { Dialog } from './ui/overlays'
import { Button, Card, Textarea } from './ui/primitives'
import { formatDate, formatTime } from '@/lib/utils'
import type { AppState } from '@/types'

/** Обратная связь учителя по каждому ребёнку — видна только родителю (после подтверждения отчёта). */
export function FeedbackPanel({ studentIds, showStudent }: { studentIds: string[]; showStudent?: boolean }) {
  const { state } = useStore()

  const entries = state.participants
    .filter((p) => studentIds.includes(p.studentId))
    .map((p) => ({ p, l: state.lessons.find((l) => l.id === p.lessonId)! }))
    .filter(({ l }) => l && (l.status === 'closed' || l.status === 'pending_approval' || l.status === 'needs_revision'))
    .sort((a, b) => b.l.start.localeCompare(a.l.start))

  if (!entries.length) return <EmptyState icon={<MessageSquareText />} title="Обратной связи пока нет" description="Она появится после того, как модератор подтвердит отчёт учителя." />

  return (
    <div className="space-y-3">
      {entries.map(({ p, l }) => {
        const t = teacherById(state, l.teacherId)
        const fb = state.feedback.find((f) => f.participantId === p.id)
        const review = state.reviews.find((r) => r.participantId === p.id)
        const closed = l.status === 'closed'
        return (
          <Card key={p.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {t && <Avatar name={t.name} hue={t.photoHue} size={40} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{subjectName(state, l.subjectId)}{l.topic && <span className="font-normal text-fg-muted"> · «{l.topic}»</span>}</p>
                <p className="text-xs text-fg-muted">{formatDate(l.start, { day: 'numeric', month: 'long' })} · {t?.name}{showStudent && ` · ${studentById(state, p.studentId)?.name}`}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {closed ? (
                    <>
                      {p.attendance && <StatusBadge status={p.attendance} />}
                      {p.outcome && <StatusBadge status={p.outcome} />}
                    </>
                  ) : (
                    <StatusBadge status={l.status} />
                  )}
                </div>
                {closed && fb ? (
                  <blockquote className="mt-3 rounded-[var(--radius-sm)] border-l-4 border-primary bg-primary-soft/40 p-3 text-sm">{fb.text}</blockquote>
                ) : !closed ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-fg-muted"><Lock className="size-3.5" aria-hidden />Обратная связь будет опубликована после подтверждения отчёта модератором.</p>
                ) : null}
                {review && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-fg-muted">Оценка ребёнка учителю:</span><StarRating value={review.rating} size={14} /><span>{review.text}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/** Прошедшие уроки ученика, которые можно оценить (после окончания, не отменены, не пропуск). */
export function reviewableParticipants(state: AppState, studentId: string, now = Date.now()) {
  return state.participants
    .filter((p) => p.studentId === studentId && p.active && p.attendance !== 'absent')
    .map((p) => ({ p, l: state.lessons.find((l) => l.id === p.lessonId)! }))
    .filter(({ l }) => l && l.status !== 'cancelled' && lessonEnd(l) <= now)
    .sort((a, b) => b.l.start.localeCompare(a.l.start))
}

/** Диалог отзыва: звёзды + комментарий учителю. */
export function ReviewDialog({ participantId, onClose }: { participantId: string | null; onClose: () => void }) {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const p = state.participants.find((x) => x.id === participantId)
  const l = p && state.lessons.find((x) => x.id === p.lessonId)
  const t = l && teacherById(state, l.teacherId)

  const close = () => { setRating(0); setText(''); setErrors({}); onClose() }
  const submit = async () => {
    if (!participantId) return
    if (!rating) return setErrors({ rating: 'Поставь от 1 до 5 звёзд' })
    const r = await exec((s) => addReview(s, participantId, rating, text), { success: 'Спасибо! Отзыв отправлен учителю' })
    if (r.ok) close()
    else setErrors(r.field ? { [r.field]: r.error } : { form: r.error })
  }

  return (
    <Dialog
      open={!!participantId}
      onOpenChange={(o) => !o && close()}
      title="Как прошёл урок?"
      description={l ? `${subjectName(state, l.subjectId)} · ${formatDate(l.start, { day: 'numeric', month: 'long' })}, ${formatTime(l.start)}` : undefined}
      size="sm"
      footer={<><Button variant="outline" onClick={close}>Позже</Button><Button onClick={submit} loading={pending}>Отправить</Button></>}
    >
      <div className="space-y-4">
        {t && (
          <div className="flex items-center gap-3">
            <Avatar name={t.name} hue={t.photoHue} size={40} />
            <div className="text-sm"><p className="font-medium">{t.name}</p><p className="text-fg-muted">Преподаватель</p></div>
          </div>
        )}
        <FormField label="Оценка учителю" error={errors.rating}>
          <StarRating value={rating} onChange={(v) => { setRating(v); setErrors({}) }} size={32} />
        </FormField>
        <FormField label="Отзыв" htmlFor="rv-text" error={errors.text ?? errors.form} required>
          <Textarea id="rv-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Что понравилось? Что было сложно?" aria-invalid={!!errors.text} />
        </FormField>
      </div>
    </Dialog>
  )
}

/** Блок ученика: оценить прошедшие уроки и посмотреть свои отзывы. Отзывы учителя ученику не показываются. */
export function StudentReviews({ studentId }: { studentId: string }) {
  const { state } = useStore()
  const now = useNow()
  const [reviewFor, setReviewFor] = useState<string | null>(null)
  const items = reviewableParticipants(state, studentId, now)
  const reviewed = (id: string) => state.reviews.find((r) => r.participantId === id)
  const pendingItems = items.filter(({ p }) => !reviewed(p.id))
  const done = items.filter(({ p }) => reviewed(p.id))

  if (!items.length) return <EmptyState icon={<Star />} title="Пока нечего оценивать" description="После окончания урока здесь можно поставить звёзды учителю и написать отзыв." />

  return (
    <div className="space-y-3">
      {pendingItems.map(({ p, l }) => {
        const t = teacherById(state, l.teacherId)
        return (
          <Card key={p.id} className="flex flex-col gap-3 border-amber-200 bg-amber-50/60 p-4 sm:flex-row sm:items-center">
            {t && <Avatar name={t.name} hue={t.photoHue} size={40} />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{subjectName(state, l.subjectId)}{l.topic && <span className="font-normal text-fg-muted"> · «{l.topic}»</span>}</p>
              <p className="text-xs text-fg-muted">{formatDate(l.start, { day: 'numeric', month: 'long' })} · {t?.name}</p>
            </div>
            <Button size="sm" onClick={() => setReviewFor(p.id)}><Star className="size-4" aria-hidden />Оценить урок</Button>
          </Card>
        )
      })}
      {done.map(({ p, l }) => {
        const t = teacherById(state, l.teacherId)
        const r = reviewed(p.id)!
        return (
          <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            {t && <Avatar name={t.name} hue={t.photoHue} size={40} />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{subjectName(state, l.subjectId)}{l.topic && <span className="font-normal text-fg-muted"> · «{l.topic}»</span>}</p>
              <p className="text-xs text-fg-muted">{formatDate(l.start, { day: 'numeric', month: 'long' })} · {t?.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-fg-muted">Твоя оценка:</span><StarRating value={r.rating} size={14} /><span>{r.text}</span>
              </div>
            </div>
          </Card>
        )
      })}
      <ReviewDialog participantId={reviewFor} onClose={() => setReviewFor(null)} />
    </div>
  )
}
