import { useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { confirmReport, returnReport } from '@/services/mockApi'
import { lessonParticipants, quotaBalance, studentById, subjectName, teacherById } from '@/services/selectors'
import { Avatar, DataTable, DemoNotice, EmptyState, FormField, PageHeader, StatusBadge } from '@/components/common'
import { Dialog, Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Badge, Button, Card, Textarea } from '@/components/ui/primitives'
import { formatDateTime, formatTime } from '@/lib/utils'
import type { LessonStatus } from '@/types'

export default function ModeratorReports() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [tab, setTab] = useState<LessonStatus>('pending_approval')
  const [openId, setOpenId] = useState<string | null>(null)
  const [returning, setReturning] = useState(false)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()

  const rows = state.lessons.filter((l) => l.status === tab).sort((a, b) => b.start.localeCompare(a.start))
  const lesson = state.lessons.find((l) => l.id === openId)
  const parts = lesson ? lessonParticipants(state, lesson.id) : []
  const policy = state.settings.absencePolicy

  const confirm = async () => {
    if (!lesson) return
    const r = await exec((s) => confirmReport(s, lesson.id), {
      success: (v) => (v.alreadyClosed ? 'Урок уже закрыт — повторное подтверждение ничего не списало' : `Отчёт подтверждён: списано ${v.consumed}, возвращено ${v.released}`),
    })
    if (r.ok && !r.value.alreadyClosed) setTab('closed')
  }
  const doReturn = async () => {
    if (!lesson) return
    setError(undefined)
    const r = await exec((s) => returnReport(s, lesson.id, comment), { success: 'Отчёт возвращён преподавателю' })
    if (r.ok) { setReturning(false); setComment(''); setOpenId(null) }
    else setError(r.error)
  }
  const count = (s: LessonStatus) => state.lessons.filter((l) => l.status === s).length

  return (
    <>
      <PageHeader title="Проверка отчётов" description="До подтверждения квоты учеников только в резерве. После — списание или возврат по демо-правилу пропусков." crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Отчёты' }]} />
      <DemoNotice className="mb-4">
        Текущее демо-правило пропусков: <b>{policy === 'release' ? 'пропуск → вернуть резерв' : 'пропуск → списать'}</b>. Переключается в админ-демо → «Демо-настройки». Ни один вариант не является утверждённой политикой.
      </DemoNotice>
      <Tabs value={tab} onValueChange={(v) => setTab(v as LessonStatus)} className="mb-3">
        <TabsList>
          <TabsTrigger value="pending_approval">На проверке ({count('pending_approval')})</TabsTrigger>
          <TabsTrigger value="needs_revision">Возвращены ({count('needs_revision')})</TabsTrigger>
          <TabsTrigger value="closed">Подтверждены ({count('closed')})</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        rows={rows}
        rowKey={(l) => l.id}
        onRowClick={(l) => { setOpenId(l.id); setReturning(false); setError(undefined) }}
        empty={<EmptyState icon={<CheckCircle2 />} title="Очередь пуста" description="Новые отчёты появятся после отправки преподавателями." />}
        columns={[
          { key: 'd', header: 'Урок', sort: (l) => l.start, cell: (l) => <span className="tabular whitespace-nowrap">{formatDateTime(l.start)}</span> },
          { key: 's', header: 'Предмет', cell: (l) => <span className="font-medium">{subjectName(state, l.subjectId)} · {l.grade} кл</span> },
          { key: 'tp', header: 'Тема', cell: (l) => l.topic || '—' },
          { key: 't', header: 'Преподаватель', cell: (l) => teacherById(state, l.teacherId)?.name },
          { key: 'a', header: 'Посещаемость', cell: (l) => { const ps = lessonParticipants(state, l.id); return <span className="tabular">{ps.filter((p) => p.attendance === 'present').length}/{ps.length}</span> } },
          { key: 'st', header: 'Статус', cell: (l) => <StatusBadge status={l.status} /> },
        ]}
      />

      <Dialog
        open={!!lesson}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={lesson ? `Отчёт: ${subjectName(state, lesson.subjectId)} · ${lesson.grade} кл` : ''}
        description={lesson && `${formatDateTime(lesson.start)} · ${teacherById(state, lesson.teacherId)?.name}`}
        size="lg"
        footer={lesson && (returning ? (
          <><Button variant="outline" onClick={() => setReturning(false)}>Назад</Button><Button variant="danger" onClick={doReturn} loading={pending}>Вернуть с замечанием</Button></>
        ) : lesson.status === 'pending_approval' ? (
          <><Button variant="outline" onClick={() => setReturning(true)}><RotateCcw aria-hidden />Вернуть</Button><Button variant="success" onClick={confirm} loading={pending}><CheckCircle2 aria-hidden />Подтвердить</Button></>
        ) : lesson.status === 'closed' ? (
          <Button variant="outline" onClick={confirm} loading={pending} title="Проверка идемпотентности">Подтвердить повторно (проверка)</Button>
        ) : <Button variant="outline" onClick={() => setOpenId(null)}>Закрыть</Button>)}
      >
        {lesson && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-3"><p className="text-xs text-fg-muted">Урок состоялся</p><p className="font-semibold">{lesson.held ? 'Да' : 'Нет'}</p></Card>
              <Card className="p-3"><p className="text-xs text-fg-muted">Фактическое начало</p><p className="tabular font-semibold">{lesson.actualStart ? formatTime(lesson.actualStart) : '—'}</p></Card>
              <Card className="p-3"><p className="text-xs text-fg-muted">Тема</p><p className="font-semibold">{lesson.topic || '—'}</p></Card>
            </div>
            {lesson.teacherComment && <p><span className="text-fg-muted">Комментарий учителя:</span> {lesson.teacherComment}</p>}
            {lesson.moderatorComment && lesson.status !== 'closed' && <p className="rounded-md bg-warning-soft p-2 text-amber-900"><b>Замечание модератора:</b> {lesson.moderatorComment}</p>}
            <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
              <table className="w-full min-w-[560px]">
                <thead className="bg-muted/50 text-left text-xs uppercase text-fg-muted"><tr><th className="px-3 py-2">Ученик</th><th className="px-3 py-2">Посещение</th><th className="px-3 py-2">Заметка</th><th className="px-3 py-2">Квота</th></tr></thead>
                <tbody>
                  {parts.map((p) => {
                    const st = studentById(state, p.studentId)
                    const order = state.orders.find((o) => o.id === p.orderId)
                    const b = quotaBalance(state, { orderId: p.orderId, subjectId: lesson.subjectId })
                    const willConsume = lesson.held && (p.attendance === 'present' || policy === 'consume')
                    return (
                      <tr key={p.id} className="border-t border-border align-top">
                        <td className="px-3 py-2"><span className="flex items-center gap-2"><Avatar name={st?.name ?? '?'} size={26} hue={(st?.grade ?? 1) * 30} />{st?.name}</span></td>
                        <td className="px-3 py-2">{p.attendance ? <StatusBadge status={p.attendance} /> : '—'}</td>
                        <td className="max-w-64 px-3 py-2 text-fg-muted">{p.note || '—'}</td>
                        <td className="px-3 py-2">
                          <p className="text-xs text-fg-muted">{order?.number}: резерв {b.reserved}, списано {b.consumed}</p>
                          {p.outcome ? <StatusBadge status={p.outcome} /> : lesson.status === 'pending_approval' && <Badge tone={willConsume ? 'primary' : 'info'}>после подтв.: {willConsume ? 'списать' : 'вернуть'}</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {returning && (
              <FormField label="Замечание для преподавателя" htmlFor="rr-comment" error={error} required>
                <Textarea id="rr-comment" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus placeholder="Что нужно дополнить в отчёте?" />
              </FormField>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}
