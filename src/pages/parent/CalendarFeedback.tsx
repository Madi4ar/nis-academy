import { useState } from 'react'
import { useSession, useStore } from '@/services/store'
import { childrenOf, lessonsForStudent } from '@/services/selectors'
import { CalendarView, LessonDetailDialog } from '@/components/domain'
import { FeedbackPanel } from '@/components/FeedbackPanel'
import { EmptyState, PageHeader } from '@/components/common'
import { Select } from '@/components/ui/primitives'

export function ParentCalendar() {
  const { state } = useStore()
  const { parent } = useSession()
  const kids = childrenOf(state, parent?.id)
  const [child, setChild] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const ids = child ? [child] : kids.map((k) => k.id)
  const lessons = [...new Map(ids.flatMap((id) => lessonsForStudent(state, id)).map((l) => [l.id, l])).values()]
  return (
    <>
      <PageHeader title="Расписание" description="Уроки всех детей. Нажмите на урок, чтобы увидеть детали и Zoom-ссылку." crumbs={[{ label: 'Кабинет', to: '/parent' }, { label: 'Расписание' }]} />
      {kids.length === 0 ? (
        <EmptyState title="Нет детей" description="Добавьте ребёнка и купите пакет." />
      ) : (
        <CalendarView
          lessons={lessons}
          onLessonClick={(l) => setOpen(l.id)}
          toolbar={
            <Select value={child} onChange={(e) => setChild(e.target.value)} aria-label="Ребёнок" className="h-9 w-44">
              <option value="">Все дети</option>
              {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </Select>
          }
        />
      )}
      <LessonDetailDialog lessonId={open} onClose={() => setOpen(null)} />
    </>
  )
}

export function ParentFeedback() {
  const { state } = useStore()
  const { parent } = useSession()
  const kids = childrenOf(state, parent?.id)
  const [child, setChild] = useState('')
  return (
    <>
      <PageHeader
        title="Обратная связь учителей"
        description="Заметки учителей о вашем ребёнке публикуются после подтверждения отчёта модератором и видны только родителю. Оценки учителям ставит сам ученик после урока."
        crumbs={[{ label: 'Кабинет', to: '/parent' }, { label: 'Обратная связь' }]}
        actions={
          <Select value={child} onChange={(e) => setChild(e.target.value)} aria-label="Ребёнок" className="w-44">
            <option value="">Все дети</option>
            {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </Select>
        }
      />
      <FeedbackPanel studentIds={child ? [child] : kids.map((k) => k.id)} showStudent />
    </>
  )
}
