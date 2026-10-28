import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CheckCircle2, Eye, RotateCcw, UserPlus } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { assignTeacherRole, moderateTeacher } from '@/services/mockApi'
import { subjectName, teacherRating } from '@/services/selectors'
import { Avatar, DataTable, FilterBar, FormField, PageHeader, SearchInput, StatusBadge } from '@/components/common'
import { Dialog, Tabs, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Badge, Button, Textarea } from '@/components/ui/primitives'
import { formatDateTime, LANGUAGE_LABEL } from '@/lib/utils'
import type { TeacherStatus } from '@/types'

export default function ModeratorTeachers() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [status, setStatus] = useState<'all' | TeacherStatus>('pending_review')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [action, setAction] = useState<'return' | 'unpublish' | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()
  const [assignOpen, setAssignOpen] = useState(false)

  const counts = (s: TeacherStatus) => state.teachers.filter((t) => t.status === s).length
  const rows = state.teachers.filter((t) => (status === 'all' || t.status === status) && (!q || t.name.toLowerCase().includes(q.toLowerCase())))
  const t = state.teachers.find((x) => x.id === openId)
  const candidates = state.users.filter((u) => !u.roles.includes('teacher'))

  const act = async (a: 'approve' | 'return' | 'unpublish' | 'republish') => {
    if (!t) return
    setError(undefined)
    const msgs = { approve: 'Анкета одобрена — профиль виден в каталоге', return: 'Анкета возвращена на доработку', unpublish: 'Профиль снят с публикации', republish: 'Профиль снова опубликован' }
    const r = await exec((s) => moderateTeacher(s, t.id, a, comment), { success: msgs[a] })
    if (r.ok) { setAction(null); setComment('') }
    else setError(r.error)
  }

  return (
    <>
      <PageHeader
        title="Модерация преподавателей"
        description="Одобренные анкеты публикуются в каталоге; непроверенные и снятые — скрыты."
        crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Преподаватели' }]}
        actions={<Button variant="outline" onClick={() => setAssignOpen(true)}><UserPlus aria-hidden />Назначить роль учителя</Button>}
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)} className="mb-3">
        <TabsList>
          <TabsTrigger value="pending_review">На проверке ({counts('pending_review')})</TabsTrigger>
          <TabsTrigger value="needs_revision">На доработке ({counts('needs_revision')})</TabsTrigger>
          <TabsTrigger value="published">Опубликованы ({counts('published')})</TabsTrigger>
          <TabsTrigger value="unpublished">Сняты ({counts('unpublished')})</TabsTrigger>
          <TabsTrigger value="draft">Черновики ({counts('draft')})</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>
      </Tabs>
      <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Поиск по ФИО" className="sm:w-72" /></FilterBar>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => { setOpenId(r.id); setAction(null); setError(undefined); setComment('') }}
        columns={[
          { key: 'n', header: 'Преподаватель', sort: (r) => r.name, cell: (r) => <span className="flex items-center gap-2"><Avatar name={r.name} hue={r.photoHue} size={30} /><span className="font-medium">{r.name}</span></span> },
          { key: 's', header: 'Предметы', cell: (r) => r.competencies.map((c) => `${subjectName(state, c.subjectId)} ${c.grades[0]}–${c.grades[1]}`).join(', ') || '—' },
          { key: 'l', header: 'Языки', cell: (r) => r.languages.map((l) => LANGUAGE_LABEL[l].slice(0, 3)).join(', ') },
          { key: 'e', header: 'Стаж', sort: (r) => r.experienceYears, cell: (r) => <span className="tabular">{r.experienceYears}</span>, className: 'text-right' },
          { key: 'r', header: 'Рейтинг', sort: (r) => teacherRating(state, r.id).avg, cell: (r) => { const x = teacherRating(state, r.id); return x.count ? <span className="tabular">{x.avg.toFixed(1)}</span> : '—' } },
          { key: 'u', header: 'Обновлено', sort: (r) => r.updatedAt, cell: (r) => <span className="tabular whitespace-nowrap text-fg-muted">{formatDateTime(r.updatedAt)}</span> },
          { key: 'st', header: 'Статус', cell: (r) => <StatusBadge status={r.status} /> },
        ]}
      />

      <Dialog
        open={!!t}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={t?.name ?? ''}
        description="Анкета преподавателя"
        size="lg"
        footer={t && (action ? (
          <>
            <Button variant="outline" onClick={() => setAction(null)}>Назад</Button>
            <Button variant={action === 'unpublish' ? 'danger' : 'default'} onClick={() => act(action)} loading={pending}>{action === 'return' ? 'Вернуть на доработку' : 'Снять с публикации'}</Button>
          </>
        ) : (
          <>
            {t.status === 'published' && <Link to={`/teachers/${t.id}`} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-border px-4 text-sm font-medium hover:bg-muted"><Eye className="size-4" aria-hidden />В каталоге</Link>}
            {t.status === 'pending_review' && <Button variant="outline" onClick={() => setAction('return')}><RotateCcw aria-hidden />Вернуть</Button>}
            {t.status === 'pending_review' && <Button variant="success" onClick={() => act('approve')} loading={pending}><CheckCircle2 aria-hidden />Одобрить и опубликовать</Button>}
            {t.status === 'published' && <Button variant="danger" onClick={() => setAction('unpublish')}><Ban aria-hidden />Снять с публикации</Button>}
            {t.status === 'unpublished' && <Button onClick={() => act('republish')} loading={pending}>Опубликовать снова</Button>}
          </>
        ))}
      >
        {t && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-4">
              <Avatar name={t.name} hue={t.photoHue} size={64} />
              <div className="space-y-1">
                <StatusBadge status={t.status} />
                <p className="text-fg-muted">{t.category || 'категория не указана'} · стаж {t.experienceYears} лет</p>
                <p className="text-fg-muted">{t.school || 'школа не указана'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.competencies.map((c) => <Badge key={c.subjectId} tone="primary">{subjectName(state, c.subjectId)} · {c.grades[0]}–{c.grades[1]} кл</Badge>)}
              {t.languages.map((l) => <Badge key={l} tone="outline">{LANGUAGE_LABEL[l]}</Badge>)}
            </div>
            <div><p className="mb-1 font-medium">Биография</p><p className="text-fg-muted">{t.bio || '—'}</p></div>
            {t.moderatorComment && <p className="rounded-md bg-warning-soft p-2 text-amber-900"><b>Последнее замечание:</b> {t.moderatorComment}</p>}
            {action && (
              <FormField label={action === 'return' ? 'Замечание для преподавателя' : 'Причина (необязательно)'} htmlFor="mod-comment" error={error} required={action === 'return'}>
                <Textarea id="mod-comment" value={comment} onChange={(e) => setComment(e.target.value)} autoFocus placeholder={action === 'return' ? 'Что нужно исправить?' : ''} />
              </FormField>
            )}
            {!action && error && <p className="text-danger" role="alert">{error}</p>}
          </div>
        )}
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen} title="Назначить роль учителя" description="P-02, шаг 1: пользователю создаётся черновик анкеты, он заполняет её и отправляет на проверку." size="md">
        {candidates.length ? (
          <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {candidates.map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3">
                <Avatar name={u.name} size={32} hue={200} />
                <div className="min-w-0 flex-1"><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-fg-muted">{u.email} · роли: {u.roles.join(', ') || 'нет'}</p></div>
                <Button size="sm" loading={pending} onClick={async () => { const r = await exec((s) => assignTeacherRole(s, u.id), { success: `${u.name}: роль «Учитель» назначена. Войдите под ним через демо-вход, чтобы заполнить анкету.` }); if (r.ok) setAssignOpen(false) }}>Назначить</Button>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-fg-muted">У всех пользователей уже есть роль учителя.</p>}
      </Dialog>
    </>
  )
}
