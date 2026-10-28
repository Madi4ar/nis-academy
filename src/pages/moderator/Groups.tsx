import { useState } from 'react'
import { Pencil, Plus, UserMinus } from 'lucide-react'
import { useAction, useStore } from '@/services/store'
import { addGroupMember, removeGroupMember, saveGroup } from '@/services/mockApi'
import { publishedTeachers, quotaBalance, studentById, subjectName, teacherById, userById } from '@/services/selectors'
import { ConfirmDialog, DataTable, FilterBar, FormField, PageHeader, SearchInput } from '@/components/common'
import { Dialog, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/overlays'
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives'
import { cn, LANGUAGE_LABEL } from '@/lib/utils'
import type { Group, Language } from '@/types'

type GroupDraft = Omit<Group, 'id' | 'members'> & { id?: string }

export default function ModeratorGroups() {
  const { state } = useStore()
  const { exec, pending } = useAction()
  const [draft, setDraft] = useState<GroupDraft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState<Record<string, string>>({})
  const [removing, setRemoving] = useState<{ g: Group; studentId: string } | null>(null)
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('')

  const save = async () => {
    if (!draft) return
    const r = await exec((s) => saveGroup(s, draft), { success: draft.id ? 'Группа сохранена' : 'Группа создана' })
    if (r.ok) setDraft(null)
    else setErrors(r.field ? { [r.field]: r.error } : { form: r.error })
  }

  const groups = state.groups.filter((g) => (!subject || g.subjectId === subject) && (!q || g.name.toLowerCase().includes(q.toLowerCase())))
  const studentRows = state.students.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Ученики и группы"
        description="Ограничения группы: один предмет, класс и язык, лимит не выше лимита пакета, у ученика должна быть оплаченная свободная квота."
        crumbs={[{ label: 'Панель', to: '/moderator' }, { label: 'Ученики и группы' }]}
        actions={<Button onClick={() => { setErrors({}); setDraft({ name: '', subjectId: 'math', grade: 6, language: 'ru', teacherId: '', packageId: 'p1', limit: 6 }) }}><Plus aria-hidden />Новая группа</Button>}
      />
      <FilterBar onReset={() => { setQ(''); setSubject('') }}>
        <SearchInput value={q} onChange={setQ} placeholder="Поиск" className="sm:w-60" />
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Предмет" className="sm:w-48">
          <option value="">Все предметы</option>
          {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </FilterBar>
      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">Группы ({groups.length})</TabsTrigger>
          <TabsTrigger value="students">Ученики ({studentRows.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="groups">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => {
              const t = teacherById(state, g.teacherId)
              const eligible = state.students.filter((s) => !g.members.some((m) => m.studentId === s.id))
              const full = g.members.length >= g.limit
              return (
                <Card key={g.id} className="flex flex-col p-4">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-semibold">{g.name}</p>
                    <Button size="icon" variant="ghost" onClick={() => { setErrors({}); setDraft({ id: g.id, name: g.name, subjectId: g.subjectId, grade: g.grade, language: g.language, teacherId: g.teacherId, packageId: g.packageId, limit: g.limit }) }} aria-label={`Редактировать ${g.name}`}><Pencil /></Button>
                  </div>
                  <p className="text-xs text-fg-muted">{subjectName(state, g.subjectId)} · {g.grade} класс · {LANGUAGE_LABEL[g.language]} · {t?.name}</p>
                  <div className="my-3 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className={cn('block h-full', full ? 'bg-amber-400' : 'bg-primary')} style={{ width: `${(g.members.length / g.limit) * 100}%` }} /></div>
                    <Badge tone={full ? 'warning' : 'outline'}>{g.members.length}/{g.limit}</Badge>
                  </div>
                  <ul className="mb-3 space-y-1">
                    {g.members.map((m) => {
                      const st = studentById(state, m.studentId)
                      const free = quotaBalance(state, { studentId: m.studentId, subjectId: g.subjectId }).free
                      return (
                        <li key={m.studentId} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">{st?.name}</span>
                          <span className={cn('tabular text-xs', free ? 'text-success' : 'text-danger')}>своб. {free}</span>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => setRemoving({ g, studentId: m.studentId })} aria-label={`Исключить ${st?.name}`}><UserMinus /></Button>
                        </li>
                      )
                    })}
                    {g.members.length === 0 && <li className="text-sm text-fg-muted">Пока нет учеников</li>}
                  </ul>
                  <div className="mt-auto flex gap-2">
                    <Select value={adding[g.id] ?? ''} onChange={(e) => setAdding({ ...adding, [g.id]: e.target.value })} aria-label={`Добавить ученика в ${g.name}`} className="h-9 flex-1" disabled={full}>
                      <option value="">{full ? 'Группа заполнена' : 'Добавить ученика…'}</option>
                      {eligible.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.grade} кл, {s.language})</option>)}
                    </Select>
                    <Button size="sm" disabled={!adding[g.id]} loading={pending} onClick={async () => { const r = await exec((s) => addGroupMember(s, g.id, adding[g.id]), { success: 'Ученик добавлен в группу', errorTitle: 'Нельзя добавить ученика' }); if (r.ok) setAdding({ ...adding, [g.id]: '' }) }}>Добавить</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>
        <TabsContent value="students">
          <DataTable
            dense
            rows={studentRows}
            rowKey={(s) => s.id}
            columns={[
              { key: 'n', header: 'Ученик', sort: (s) => s.name, cell: (s) => <span className="font-medium">{s.name}</span> },
              { key: 'p', header: 'Родитель', cell: (s) => userById(state, state.parents.find((p) => p.id === s.parentId)?.userId)?.name },
              { key: 'g', header: 'Класс', sort: (s) => s.grade, cell: (s) => <span className="tabular">{s.grade}</span>, className: 'text-right' },
              { key: 'l', header: 'Язык', cell: (s) => LANGUAGE_LABEL[s.language] },
              {
                key: 'q', header: 'Свободные квоты', cell: (s) => {
                  const subj = [...new Set(state.orders.filter((o) => o.studentId === s.id && o.status === 'paid').flatMap((o) => o.items.map((i) => i.subjectId)))]
                  return subj.length ? <div className="flex flex-wrap gap-1">{subj.map((x) => { const f = quotaBalance(state, { studentId: s.id, subjectId: x }).free; return <Badge key={x} tone={f ? 'success' : 'neutral'}>{subjectName(state, x)}: {f}</Badge> })}</div> : <Badge tone="danger">нет оплаченных</Badge>
                },
              },
              { key: 'gr', header: 'Группы', cell: (s) => state.groups.filter((g) => g.members.some((m) => m.studentId === s.id)).map((g) => g.name).join(', ') || '—' },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)} title={draft?.id ? 'Редактировать группу' : 'Новая группа'} size="lg" footer={<><Button variant="outline" onClick={() => setDraft(null)}>Отмена</Button><Button onClick={save} loading={pending}>Сохранить</Button></>}>
        {draft && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Название" htmlFor="gr-name" error={errors.name} required className="sm:col-span-2"><Input id="gr-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></FormField>
            <FormField label="Пакет" htmlFor="gr-pkg" error={errors.packageId}>
              <Select id="gr-pkg" value={draft.packageId} onChange={(e) => setDraft({ ...draft, packageId: e.target.value })}>{state.packages.filter((p) => p.status !== 'archived').map((p) => <option key={p.id} value={p.id}>{p.title} (лимит {p.groupLimit})</option>)}</Select>
            </FormField>
            <FormField label="Предмет" htmlFor="gr-subj"><Select id="gr-subj" value={draft.subjectId} onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>{state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormField>
            <FormField label="Класс" htmlFor="gr-grade"><Select id="gr-grade" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: +e.target.value })}>{Array.from({ length: 11 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</Select></FormField>
            <FormField label="Язык" htmlFor="gr-lang"><Select id="gr-lang" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}><option value="ru">Русский</option><option value="kz">Казахский</option></Select></FormField>
            <FormField label="Преподаватель" htmlFor="gr-t" error={errors.teacherId} required>
              <Select id="gr-t" value={draft.teacherId} onChange={(e) => setDraft({ ...draft, teacherId: e.target.value })}><option value="">— выберите —</option>{publishedTeachers(state).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
            </FormField>
            <FormField label="Лимит учеников" htmlFor="gr-limit" error={errors.limit}><Input id="gr-limit" type="number" min={1} value={draft.limit} onChange={(e) => setDraft({ ...draft, limit: +e.target.value })} /></FormField>
            {errors.form && <p className="text-sm text-danger sm:col-span-2" role="alert">{errors.form}</p>}
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Исключить ученика из группы?"
        description="Уже запланированные уроки и резервы не изменятся — их можно отменить в календаре."
        confirmLabel="Исключить"
        danger
        loading={pending}
        onConfirm={async () => { if (removing) await exec((s) => removeGroupMember(s, removing.g.id, removing.studentId), { success: 'Ученик исключён' }); setRemoving(null) }}
      />
    </>
  )
}
