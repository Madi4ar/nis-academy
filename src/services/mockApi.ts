// Слой бизнес-операций на моковых данных. Каждая операция получает черновик состояния и мутирует его;
// при ошибке выбрасывает OpError — стор откатывает изменения. Позже заменяется вызовами API.
import type {
  AppState, Attendance, Group, Language, Lesson, Order, OrderItem, Package, Role, StudentProfile, TeacherProfile,
} from '@/types'
import { snapshot } from '@/mocks/seed'
import { subjectsWord, uid } from '@/lib/utils'
import {
  isOrderExpired, lessonAudience, lessonEnd, lessonParticipants, packageById, parentUserOfStudent, quotaBalance,
  studentById, subjectName, teacherById, teacherTeaches,
} from './selectors'

export class OpError extends Error {
  field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.field = field
  }
}

const nowIso = () => new Date().toISOString()

function audit(s: AppState, action: string, entity: string, details: string) {
  s.auditLog.unshift({ id: uid('a'), actorId: s.session.userId ?? 'guest', action, entity, details, createdAt: nowIso() })
}

function notify(s: AppState, userIds: (string | undefined)[], title: string, text: string, link?: string) {
  for (const userId of new Set(userIds.filter(Boolean) as string[])) {
    s.notifications.unshift({ id: uid('n'), userId, title, text, link, createdAt: nowIso(), read: false })
  }
}

const moderatorIds = (s: AppState) => s.users.filter((u) => u.roles.includes('moderator')).map((u) => u.id)

// ───────────── Сессия и регистрация ─────────────

export function login(s: AppState, userId: string | null, role: Role) {
  s.session = { userId, role }
}

export function registerParent(s: AppState, data: { name: string; email: string; phone: string }) {
  if (data.name.trim().length < 3) throw new OpError('Укажите имя и фамилию', 'name')
  if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new OpError('Некорректный e-mail', 'email')
  if (data.phone.replace(/\D/g, '').length < 10) throw new OpError('Телефон: минимум 10 цифр', 'phone')
  const userId = uid('u')
  s.users.push({ id: userId, name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), roles: ['parent'], createdAt: nowIso() })
  s.parents.push({ id: uid('par'), userId })
  s.session = { userId, role: 'parent' }
  audit(s, 'user.register', `User ${data.name}`, 'Демо-регистрация родителя')
  return userId
}

export function registerStudent(s: AppState, data: { name: string; email: string; grade: number; language: Language; parentId: string; birthYear: number }) {
  if (data.name.trim().length < 3) throw new OpError('Укажите имя и фамилию', 'name')
  if (!/^\S+@\S+\.\S+$/.test(data.email)) throw new OpError('Некорректный e-mail', 'email')
  if (!data.parentId) throw new OpError('Выберите родителя (ученик привязывается к семье)', 'parentId')
  const userId = uid('u')
  s.users.push({ id: userId, name: data.name.trim(), email: data.email.trim(), roles: ['student'], createdAt: nowIso() })
  s.students.push({ id: uid('s'), userId, parentId: data.parentId, name: data.name.trim(), grade: data.grade, language: data.language, birthYear: data.birthYear })
  s.session = { userId, role: 'student' }
  audit(s, 'user.register', `User ${data.name}`, 'Демо-регистрация ученика')
  notify(s, [s.parents.find((p) => p.id === data.parentId)?.userId], 'Ученик присоединился', `${data.name} зарегистрировался и привязан к вашей семье.`, '/parent/children')
  return userId
}

export function saveChild(s: AppState, child: Omit<StudentProfile, 'id'> & { id?: string }) {
  if (child.name.trim().length < 2) throw new OpError('Укажите имя ребёнка', 'name')
  if (child.grade < 1 || child.grade > 11) throw new OpError('Класс от 1 до 11', 'grade')
  const year = new Date().getFullYear()
  if (child.birthYear < year - 19 || child.birthYear > year - 5) throw new OpError('Проверьте год рождения', 'birthYear')
  if (child.id) {
    const ex = s.students.find((x) => x.id === child.id)
    if (!ex) throw new OpError('Ребёнок не найден')
    Object.assign(ex, { ...child, name: child.name.trim() })
    audit(s, 'child.update', `Student ${ex.name}`, 'Данные ребёнка изменены')
    return ex.id
  }
  const id = uid('s')
  s.students.push({ ...child, id, name: child.name.trim() })
  audit(s, 'child.create', `Student ${child.name}`, 'Добавлен ребёнок')
  return id
}

// ───────────── P-01 / P-06: заказ и демо-оплата ─────────────

export interface OrderDraft {
  parentId: string
  studentId: string
  packageId: string
  items: OrderItem[]
  grade: number
  language: Language
  desiredTeacherId?: string
  renewedFromId?: string
  offerAccepted: boolean
}

export function validateAllocation(pkg: Package, items: OrderItem[]) {
  const sum = items.reduce((a, i) => a + i.lessons, 0)
  if (items.some((i) => !pkg.subjectIds.includes(i.subjectId))) return 'Предмет не входит в пакет'
  if (pkg.pickSubjects) {
    const chosen = new Set(items.map((i) => i.subjectId)).size
    if (chosen !== pkg.pickSubjects) return `Выберите ровно ${subjectsWord(pkg.pickSubjects)}: выбрано ${chosen}`
    if (items.some((i) => i.lessons < 1)) return 'У каждого выбранного предмета должен быть хотя бы 1 урок'
  }
  if (items.some((i) => i.lessons < 0 || !Number.isInteger(i.lessons))) return 'Количество уроков должно быть целым неотрицательным'
  if (sum !== pkg.lessonsCount) return `Нужно распределить ровно ${pkg.lessonsCount}: назначено ${sum}`
  return null
}

export function createOrder(s: AppState, d: OrderDraft) {
  const pkg = packageById(s, d.packageId)
  if (!pkg || pkg.status !== 'published') throw new OpError('Пакет недоступен для покупки')
  const err = validateAllocation(pkg, d.items)
  if (err) throw new OpError(err, 'items')
  if (!d.studentId) throw new OpError('Выберите ребёнка', 'studentId')
  if (!d.offerAccepted) throw new OpError('Необходимо принять оферту', 'offer')
  if (d.grade < pkg.grades[0] || d.grade > pkg.grades[1]) throw new OpError('Класс вне диапазона пакета', 'grade')
  const id = uid('o')
  const number = `ЗК-${1000 + s.orders.length + 1}`
  const order: Order = {
    id, number, parentId: d.parentId, studentId: d.studentId,
    // В пакете «на выбор» в заказ попадают только выбранные предметы — перераспределение тоже только между ними.
    packageVersion: { ...snapshot(pkg), subjectIds: pkg.pickSubjects ? d.items.map((i) => i.subjectId) : [...pkg.subjectIds] },
    items: d.items.filter((i) => i.lessons > 0), grade: d.grade, language: d.language, desiredTeacherId: d.desiredTeacherId,
    status: 'unpaid', total: pkg.price, createdAt: nowIso(), renewedFromId: d.renewedFromId,
    offer: { acceptedAt: nowIso(), offerVersion: '2026-10-20' },
  }
  s.orders.unshift(order)
  audit(s, d.renewedFromId ? 'order.renew' : 'order.create', `Order ${number}`, d.renewedFromId ? `Продление заказа ${s.orders.find((o) => o.id === d.renewedFromId)?.number}` : `Пакет «${pkg.title}»`)
  return id
}

/** Демо-оплата. Повторный успешный вызов для оплаченного заказа — идемпотентен (не удваивает квоты). */
export function payOrder(s: AppState, orderId: string, outcome: 'success' | 'fail'): { duplicate: boolean } {
  const o = s.orders.find((x) => x.id === orderId)
  if (!o) throw new OpError('Заказ не найден')
  if (o.status === 'paid') {
    const pay = s.payments.find((p) => p.orderId === orderId && p.status === 'succeeded')
    if (pay) pay.webhookCount += 1
    audit(s, 'payment.duplicate', `Order ${o.number}`, 'Повторный демо-webhook проигнорирован — квоты не изменены')
    return { duplicate: true }
  }
  const parentUser = s.parents.find((p) => p.id === o.parentId)?.userId
  if (outcome === 'fail') {
    s.payments.push({ id: uid('pay'), orderId, status: 'failed', amount: o.total, createdAt: nowIso(), webhookCount: 1 })
    audit(s, 'payment.failed', `Order ${o.number}`, 'Демо-оплата отклонена, квоты не начислены')
    notify(s, [parentUser], 'Демо-оплата отклонена', `Заказ ${o.number} не оплачен. Квоты не начислены, можно повторить.`, '/parent/orders')
    return { duplicate: false }
  }
  s.payments.push({ id: uid('pay'), orderId, status: 'succeeded', amount: o.total, createdAt: nowIso(), webhookCount: 1 })
  o.status = 'paid'
  o.paidAt = nowIso()
  const pkg = packageById(s, o.packageVersion.packageId)
  o.expiresAt = new Date(Date.now() + (pkg?.validityDays ?? 60) * 86400000).toISOString()
  for (const it of o.items) {
    if (s.quotaTx.some((t) => t.orderId === o.id && t.type === 'grant' && t.subjectId === it.subjectId)) continue
    s.quotaTx.push({ id: uid('qt'), orderId: o.id, studentId: o.studentId, subjectId: it.subjectId, type: 'grant', amount: it.lessons, createdAt: nowIso(), note: 'Оплата заказа' })
  }
  const student = studentById(s, o.studentId)
  audit(s, 'order.paid', `Order ${o.number}`, `Демо-оплата успешна, начислено ${o.packageVersion.lessonsCount} уроков (${student?.name})`)
  notify(s, [parentUser], 'Оплата прошла (демо)', `Заказ ${o.number}: начислено ${o.packageVersion.lessonsCount} уроков для ${student?.name}.`, '/parent/orders')
  notify(s, moderatorIds(s), 'Новый оплаченный заказ', `${o.number} — ${o.packageVersion.title}. Ученик ждёт расписания.`, '/moderator/groups')
  return { duplicate: false }
}

// ───────────── P-05: перераспределение ─────────────

export function reallocate(s: AppState, orderId: string, target: Record<string, number>) {
  const o = s.orders.find((x) => x.id === orderId)
  if (!o || o.status !== 'paid') throw new OpError('Перераспределять можно только оплаченный заказ')
  if (isOrderExpired(o)) throw new OpError('Срок действия заказа истёк')
  const subjectIds = o.packageVersion.subjectIds
  const current: Record<string, number> = {}
  for (const sid of subjectIds) current[sid] = quotaBalance(s, { orderId, subjectId: sid }).free
  for (const sid of Object.keys(target)) {
    if (!subjectIds.includes(sid)) throw new OpError(`«${subjectName(s, sid)}» не разрешён пакетом`)
    if (target[sid] < 0 || !Number.isInteger(target[sid])) throw new OpError('Значения должны быть целыми и неотрицательными')
  }
  const curSum = Object.values(current).reduce((a, b) => a + b, 0)
  const newSum = subjectIds.reduce((a, sid) => a + (target[sid] ?? 0), 0)
  if (curSum !== newSum) throw new OpError(`Сумма свободных уроков должна остаться ${curSum}, сейчас ${newSum}`)
  const deltas = subjectIds.map((sid) => ({ sid, d: (target[sid] ?? 0) - current[sid] })).filter((x) => x.d !== 0)
  if (!deltas.length) throw new OpError('Распределение не изменилось')
  const tiers = new Set(deltas.map((x) => s.subjects.find((sub) => sub.id === x.sid)?.tier))
  if (tiers.size > 1) {
    throw new OpError('Обмен между предметами разной стоимости запрещён без согласованного тарифа (демо-допущение)')
  }
  const at = nowIso()
  for (const { sid, d } of deltas) {
    s.quotaTx.push({ id: uid('qt'), orderId, studentId: o.studentId, subjectId: sid, type: d > 0 ? 'reallocate_in' : 'reallocate_out', amount: Math.abs(d), createdAt: at, note: 'Перераспределение родителем' })
  }
  const desc = deltas.map((x) => `${subjectName(s, x.sid)} ${x.d > 0 ? '+' : ''}${x.d}`).join(', ')
  audit(s, 'order.reallocate', `Order ${o.number}`, desc)
}

// ───────────── P-02: анкета и модерация учителя ─────────────

export function assignTeacherRole(s: AppState, userId: string) {
  const u = s.users.find((x) => x.id === userId)
  if (!u) throw new OpError('Пользователь не найден')
  if (u.roles.includes('teacher')) throw new OpError('У пользователя уже есть роль учителя')
  u.roles.push('teacher')
  if (!s.teachers.some((t) => t.userId === userId)) {
    s.teachers.push({
      id: uid('t'), userId, name: u.name, photoHue: Math.floor(Math.random() * 360), competencies: [], languages: ['ru'],
      experienceYears: 0, category: '', school: '', bio: '', status: 'draft', updatedAt: nowIso(),
    })
  }
  audit(s, 'role.assign', `User ${u.name}`, 'Назначена роль «Учитель»')
  notify(s, [userId], 'Вам назначена роль учителя', 'Заполните анкету и отправьте её на проверку.', '/teacher/profile')
}

export function saveTeacherProfile(s: AppState, patch: Partial<TeacherProfile> & { id: string }, submit: boolean) {
  const t = s.teachers.find((x) => x.id === patch.id)
  if (!t) throw new OpError('Анкета не найдена')
  const next = { ...t, ...patch }
  if (submit) {
    if (next.name.trim().length < 5) throw new OpError('Укажите ФИО полностью', 'name')
    if (!next.competencies.length) throw new OpError('Добавьте хотя бы один предмет', 'competencies')
    if (next.competencies.some((c) => c.grades[0] > c.grades[1])) throw new OpError('Диапазон классов указан неверно', 'competencies')
    if (!next.languages.length) throw new OpError('Выберите язык преподавания', 'languages')
    if (!next.category.trim()) throw new OpError('Укажите категорию', 'category')
    if (!next.school.trim()) throw new OpError('Укажите школу / место работы', 'school')
    if (next.bio.trim().length < 40) throw new OpError('Биография — минимум 40 символов', 'bio')
  }
  Object.assign(t, next, { updatedAt: nowIso() })
  if (submit) {
    t.status = 'pending_review'
    audit(s, 'teacher.submit', `TeacherProfile ${t.name}`, 'Анкета отправлена на проверку')
    notify(s, moderatorIds(s), 'Новая анкета на проверке', `${t.name} отправил(а) анкету преподавателя.`, '/moderator/teachers')
  } else {
    audit(s, 'teacher.save', `TeacherProfile ${t.name}`, 'Черновик анкеты сохранён')
  }
}

export function moderateTeacher(s: AppState, teacherId: string, action: 'approve' | 'return' | 'unpublish' | 'republish', comment?: string) {
  const t = s.teachers.find((x) => x.id === teacherId)
  if (!t) throw new OpError('Анкета не найдена')
  if (action === 'return') {
    if (!comment || comment.trim().length < 5) throw new OpError('Опишите замечание (минимум 5 символов)', 'comment')
    if (t.status !== 'pending_review') throw new OpError('Вернуть можно только анкету на проверке')
    t.status = 'needs_revision'
    t.moderatorComment = comment.trim()
    notify(s, [t.userId], 'Анкета возвращена на доработку', comment.trim(), '/teacher/profile')
  } else if (action === 'approve') {
    if (t.status !== 'pending_review') throw new OpError('Одобрить можно только анкету на проверке')
    t.status = 'published'
    t.moderatorComment = undefined
    notify(s, [t.userId], 'Анкета одобрена', 'Ваш профиль опубликован в каталоге преподавателей.', `/teachers/${t.id}`)
  } else if (action === 'unpublish') {
    if (t.status !== 'published') throw new OpError('Профиль не опубликован')
    t.status = 'unpublished'
    t.moderatorComment = comment?.trim() || undefined
    notify(s, [t.userId], 'Профиль снят с публикации', comment?.trim() || 'Обратитесь к модератору за подробностями.', '/teacher/profile')
  } else {
    if (t.status !== 'unpublished') throw new OpError('Профиль не снят с публикации')
    t.status = 'published'
    notify(s, [t.userId], 'Профиль снова опубликован', 'Ваш профиль виден в каталоге.', `/teachers/${t.id}`)
  }
  t.updatedAt = nowIso()
  const label = { approve: 'Одобрено и опубликовано', return: `Возвращено: ${comment}`, unpublish: 'Снято с публикации', republish: 'Опубликовано повторно' }[action]
  audit(s, `teacher.${action}`, `TeacherProfile ${t.name}`, label)
}

// ───────────── P-03: планирование урока ─────────────

export interface LessonDraft {
  date: string
  time: string
  durationMin: number
  subjectId: string
  grade: number
  language: Language
  packageId: string
  teacherId: string
  groupId?: string
  studentIds: string[]
  zoomUrl: string
}

export type FieldErrors = Partial<Record<keyof LessonDraft | 'students' | 'start', string>> & { studentIssues?: Record<string, string> }

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

export function findConflicts(s: AppState, startIso: string, durationMin: number, teacherId: string, studentIds: string[], ignoreLessonId?: string) {
  const a = new Date(startIso).getTime()
  const b = a + durationMin * 60000
  const active = s.lessons.filter((l) => l.id !== ignoreLessonId && l.status !== 'cancelled' && overlaps(a, b, new Date(l.start).getTime(), lessonEnd(l)))
  const teacherConflict = active.find((l) => l.teacherId === teacherId)
  const studentConflicts: Record<string, Lesson> = {}
  for (const sid of studentIds) {
    const l = active.find((x) => lessonParticipants(s, x.id).some((p) => p.studentId === sid))
    if (l) studentConflicts[sid] = l
  }
  return { teacherConflict, studentConflicts }
}

/** Подбирает заказ со свободной квотой: сначала того же пакета, затем ближайший по сроку истечения. */
export function pickOrderForQuota(s: AppState, studentId: string, subjectId: string, packageId?: string) {
  const candidates = s.orders
    .filter((o) => o.studentId === studentId && o.status === 'paid' && !isOrderExpired(o))
    .filter((o) => quotaBalance(s, { orderId: o.id, subjectId }).free > 0)
    .sort((x, y) => {
      const px = x.packageVersion.packageId === packageId ? 0 : 1
      const py = y.packageVersion.packageId === packageId ? 0 : 1
      return px - py || (x.expiresAt ?? '').localeCompare(y.expiresAt ?? '')
    })
  return candidates[0]
}

export function validateLesson(s: AppState, d: LessonDraft): FieldErrors {
  const e: FieldErrors = {}
  const studentIssues: Record<string, string> = {}
  if (!d.date) e.date = 'Укажите дату'
  if (!d.time) e.time = 'Укажите время'
  const startIso = d.date && d.time ? new Date(`${d.date}T${d.time}:00`).toISOString() : ''
  if (startIso && new Date(startIso).getTime() < Date.now()) e.start = 'Нельзя запланировать урок в прошлом'
  if (!d.subjectId) e.subjectId = 'Выберите предмет'
  const pkg = packageById(s, d.packageId)
  if (!pkg) e.packageId = 'Выберите пакет'
  else {
    if (d.subjectId && !pkg.subjectIds.includes(d.subjectId)) e.packageId = 'Предмет не входит в выбранный пакет'
    if (d.grade < pkg.grades[0] || d.grade > pkg.grades[1]) e.grade = `Пакет рассчитан на ${pkg.grades[0]}–${pkg.grades[1]} классы`
    if (!pkg.languages.includes(d.language)) e.language = 'Язык не поддерживается пакетом'
  }
  const teacher = teacherById(s, d.teacherId)
  if (!teacher) e.teacherId = 'Выберите преподавателя'
  else if (teacher.status !== 'published') e.teacherId = 'Преподаватель не прошёл проверку'
  else if (d.subjectId && !teacherTeaches(teacher, d.subjectId, d.grade, d.language)) e.teacherId = 'Компетенции преподавателя не соответствуют предмету, классу или языку'
  const group = s.groups.find((g) => g.id === d.groupId)
  const limit = Math.min(pkg?.groupLimit ?? 99, group?.limit ?? 99)
  if (!d.studentIds.length) e.students = 'Добавьте хотя бы одного ученика'
  else if (d.studentIds.length > limit) e.students = `Превышен лимит группы: ${d.studentIds.length} из ${limit}`
  for (const sid of d.studentIds) {
    const st = studentById(s, sid)
    if (!st) continue
    if (st.grade !== d.grade) studentIssues[sid] = `${st.grade} класс — не совпадает с уроком`
    else if (st.language !== d.language) studentIssues[sid] = 'Другой язык обучения'
    else if (d.subjectId && !pickOrderForQuota(s, sid, d.subjectId, d.packageId)) studentIssues[sid] = 'Нет оплаченной свободной квоты'
  }
  if (startIso && d.teacherId) {
    const { teacherConflict, studentConflicts } = findConflicts(s, startIso, d.durationMin, d.teacherId, d.studentIds)
    if (teacherConflict) e.teacherId = `Пересечение: у преподавателя урок в ${new Date(teacherConflict.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    for (const [sid, l] of Object.entries(studentConflicts)) {
      studentIssues[sid] = studentIssues[sid] ?? `Пересечение с уроком «${subjectName(s, l.subjectId)}» в ${new Date(l.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    }
  }
  if (!d.zoomUrl.trim()) e.zoomUrl = 'Вставьте тестовую Zoom-ссылку'
  else if (!/^https:\/\/\S+$/.test(d.zoomUrl.trim())) e.zoomUrl = 'Ссылка должна начинаться с https://'
  if (Object.keys(studentIssues).length) {
    e.studentIssues = studentIssues
    e.students = e.students ?? 'У части учеников есть проблемы — исправьте или исключите их'
  }
  return e
}

export function createLesson(s: AppState, d: LessonDraft) {
  const errors = validateLesson(s, d)
  if (Object.keys(errors).length) throw new OpError('Исправьте ошибки в форме')
  const id = uid('L')
  const start = new Date(`${d.date}T${d.time}:00`).toISOString()
  s.lessons.push({
    id, groupId: d.groupId, subjectId: d.subjectId, grade: d.grade, language: d.language, packageId: d.packageId,
    teacherId: d.teacherId, start, durationMin: d.durationMin, zoomUrl: d.zoomUrl.trim(), status: 'scheduled',
  })
  for (const sid of d.studentIds) {
    const order = pickOrderForQuota(s, sid, d.subjectId, d.packageId)!
    const pid = uid('lp')
    s.participants.push({ id: pid, lessonId: id, studentId: sid, orderId: order.id, active: true })
    s.quotaTx.push({ id: uid('qt'), orderId: order.id, studentId: sid, subjectId: d.subjectId, type: 'reserve', amount: 1, lessonId: id, createdAt: nowIso(), note: 'Резерв под урок' })
  }
  const subj = subjectName(s, d.subjectId)
  audit(s, 'lesson.create', `Lesson ${subj}`, `${d.date} ${d.time}, учеников: ${d.studentIds.length}, зарезервировано квот: ${d.studentIds.length}`)
  notify(s, lessonAudience(s, id), 'Новый урок в расписании', `${subj}: ${new Date(start).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`, undefined)
  return id
}

export function rescheduleLesson(s: AppState, lessonId: string, date: string, time: string) {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l || l.status !== 'scheduled') throw new OpError('Перенести можно только запланированный урок')
  if (!date || !time) throw new OpError('Укажите новую дату и время', 'date')
  const start = new Date(`${date}T${time}:00`).toISOString()
  if (new Date(start).getTime() < Date.now()) throw new OpError('Новая дата в прошлом', 'date')
  const { teacherConflict, studentConflicts } = findConflicts(s, start, l.durationMin, l.teacherId, lessonParticipants(s, lessonId).map((p) => p.studentId), lessonId)
  if (teacherConflict) throw new OpError('У преподавателя пересечение в это время', 'date')
  const sc = Object.keys(studentConflicts)
  if (sc.length) throw new OpError(`Пересечение у ученика: ${studentById(s, sc[0])?.name}`, 'date')
  const old = l.start
  l.start = start
  audit(s, 'lesson.reschedule', `Lesson ${subjectName(s, l.subjectId)}`, `${new Date(old).toLocaleString('ru-RU')} → ${new Date(start).toLocaleString('ru-RU')}`)
  notify(s, lessonAudience(s, lessonId), 'Урок перенесён (демо-уведомление)', `${subjectName(s, l.subjectId)}: новое время ${new Date(start).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`)
}

export function cancelLesson(s: AppState, lessonId: string, reason: string) {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l || l.status !== 'scheduled') throw new OpError('Отменить можно только запланированный урок')
  if (reason.trim().length < 3) throw new OpError('Укажите причину отмены', 'reason')
  for (const p of lessonParticipants(s, lessonId)) {
    p.active = false
    p.outcome = 'released'
    s.quotaTx.push({ id: uid('qt'), orderId: p.orderId, studentId: p.studentId, subjectId: l.subjectId, type: 'release', amount: 1, lessonId, createdAt: nowIso(), note: 'Отмена урока' })
  }
  l.status = 'cancelled'
  l.moderatorComment = reason.trim()
  audit(s, 'lesson.cancel', `Lesson ${subjectName(s, l.subjectId)}`, `Отменён: ${reason}. Резервы освобождены`)
  notify(s, lessonAudience(s, lessonId), 'Урок отменён (демо-уведомление)', `${subjectName(s, l.subjectId)}, ${new Date(l.start).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}. Квота возвращена.`)
}

// ───────────── P-04: отчёт и подтверждение ─────────────

export interface ReportDraft {
  topic: string
  actualTime: string
  held: boolean
  comment: string
  rows: { participantId: string; attendance?: Attendance; note: string }[]
}

export function submitReport(s: AppState, lessonId: string, r: ReportDraft) {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l) throw new OpError('Урок не найден')
  if (!['scheduled', 'needs_revision'].includes(l.status)) throw new OpError('Отчёт по этому уроку уже отправлен')
  if (lessonEnd(l) > Date.now()) throw new OpError('Отчёт можно отправить только после окончания урока')
  if (r.held) {
    if (r.topic.trim().length < 3) throw new OpError('Укажите тему урока', 'topic')
    if (!r.actualTime) throw new OpError('Укажите фактическое время начала', 'actualTime')
    const missing = r.rows.find((x) => !x.attendance)
    if (missing) throw new OpError(`Отметьте посещаемость: ${studentById(s, s.participants.find((p) => p.id === missing.participantId)?.studentId)?.name}`, 'rows')
    const short = r.rows.find((x) => x.note.trim().length < 10)
    if (short) throw new OpError(`Заметка для каждого ученика — минимум 10 символов (${studentById(s, s.participants.find((p) => p.id === short.participantId)?.studentId)?.name})`, 'rows')
  } else if (r.comment.trim().length < 5) {
    throw new OpError('Укажите причину, по которой урок не состоялся', 'comment')
  }
  l.topic = r.topic.trim()
  l.held = r.held
  l.teacherComment = r.comment.trim()
  if (r.held) {
    const d = new Date(l.start)
    const [h, m] = r.actualTime.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    l.actualStart = d.toISOString()
  }
  for (const row of r.rows) {
    const p = s.participants.find((x) => x.id === row.participantId)
    if (!p) continue
    p.attendance = r.held ? row.attendance : 'absent'
    p.note = row.note.trim()
  }
  l.status = 'pending_approval'
  audit(s, 'report.submit', `Lesson ${subjectName(s, l.subjectId)}`, `Отчёт отправлен: ${r.held ? 'урок проведён' : 'урок не состоялся'}`)
  notify(s, moderatorIds(s), 'Отчёт ждёт подтверждения', `${subjectName(s, l.subjectId)} — ${teacherById(s, l.teacherId)?.name}`, '/moderator/reports')
}

export function returnReport(s: AppState, lessonId: string, comment: string) {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l || l.status !== 'pending_approval') throw new OpError('Отчёт не находится на проверке')
  if (comment.trim().length < 5) throw new OpError('Опишите замечание (минимум 5 символов)', 'comment')
  l.status = 'needs_revision'
  l.moderatorComment = comment.trim()
  audit(s, 'report.return', `Lesson ${subjectName(s, l.subjectId)}`, `Возвращён: ${comment}`)
  notify(s, [teacherById(s, l.teacherId)?.userId], 'Отчёт возвращён', comment.trim(), `/teacher/lessons/${l.id}/report`)
}

/** Подтверждение отчёта: резерв → списание или возврат по демо-правилу. Повторный вызов ничего не списывает. */
export function confirmReport(s: AppState, lessonId: string): { alreadyClosed: boolean; consumed: number; released: number } {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l) throw new OpError('Урок не найден')
  if (l.status === 'closed') {
    audit(s, 'report.confirm.duplicate', `Lesson ${subjectName(s, l.subjectId)}`, 'Повторное подтверждение — квоты не изменены')
    return { alreadyClosed: true, consumed: 0, released: 0 }
  }
  if (l.status !== 'pending_approval') throw new OpError('Отчёт не находится на проверке')
  let consumed = 0
  let released = 0
  const policy = s.settings.absencePolicy
  for (const p of lessonParticipants(s, lessonId)) {
    const settled = s.quotaTx.some((t) => t.lessonId === lessonId && t.studentId === p.studentId && (t.type === 'consume' || t.type === 'release'))
    if (settled) continue
    const consume = l.held && (p.attendance === 'present' || policy === 'consume')
    p.outcome = consume ? 'consumed' : 'released'
    s.quotaTx.push({
      id: uid('qt'), orderId: p.orderId, studentId: p.studentId, subjectId: l.subjectId, type: consume ? 'consume' : 'release', amount: 1, lessonId, createdAt: nowIso(),
      note: consume ? (p.attendance === 'present' ? 'Урок проведён' : 'Пропуск — списано (демо-правило)') : l.held ? 'Пропуск — резерв возвращён (демо-правило)' : 'Урок не состоялся',
    })
    if (consume) consumed++
    else released++
    if (p.note && l.held) {
      s.feedback.push({ participantId: p.id, lessonId, studentId: p.studentId, text: p.note, publishedAt: nowIso() })
    }
    const st = studentById(s, p.studentId)
    notify(s, [parentUserOfStudent(s, p.studentId)], 'Обратная связь по уроку', `${subjectName(s, l.subjectId)}: ${l.held ? (p.attendance === 'present' ? 'урок проведён' : 'отмечен пропуск') : 'урок не состоялся'} — ${st?.name}.`, undefined)
  }
  l.status = 'closed'
  l.closedAt = nowIso()
  audit(s, 'report.confirm', `Lesson ${subjectName(s, l.subjectId)}`, `Подтверждён. Списано: ${consumed}, возвращено в свободные: ${released} (правило пропусков: ${policy === 'release' ? 'вернуть' : 'списать'})`)
  notify(s, [teacherById(s, l.teacherId)?.userId], 'Отчёт подтверждён', `${subjectName(s, l.subjectId)} — урок закрыт.`, '/teacher')
  return { alreadyClosed: false, consumed, released }
}

/** Отзыв ученика об учителе: оставляется самим учеником после окончания урока (не по пропуску). */
export function addReview(s: AppState, participantId: string, rating: number, text: string) {
  const p = s.participants.find((x) => x.id === participantId)
  if (!p) throw new OpError('Участие не найдено')
  const l = s.lessons.find((x) => x.id === p.lessonId)
  if (!l || l.status === 'cancelled' || !p.active) throw new OpError('Урок отменён — отзыв недоступен')
  if (lessonEnd(l) > Date.now()) throw new OpError('Оценить урок можно после его окончания')
  if (p.attendance === 'absent') throw new OpError('Отзыв недоступен: на уроке отмечен пропуск')
  const st = s.students.find((x) => x.id === p.studentId)
  if (!st || st.userId !== s.session.userId) throw new OpError('Отзыв оставляет сам ученик')
  if (s.reviews.some((r) => r.participantId === participantId)) throw new OpError('Отзыв по этому уроку уже оставлен')
  if (rating < 1 || rating > 5) throw new OpError('Поставьте оценку от 1 до 5', 'rating')
  if (text.trim().length < 5) throw new OpError('Напишите пару слов (минимум 5 символов)', 'text')
  s.reviews.unshift({ id: uid('r'), lessonId: l.id, participantId, teacherId: l.teacherId, studentId: p.studentId, authorUserId: st.userId, rating, text: text.trim(), createdAt: nowIso() })
  audit(s, 'review.create', `Teacher ${teacherById(s, l.teacherId)?.name}`, `Оценка ${rating}/5`)
  notify(s, [teacherById(s, l.teacherId)?.userId], 'Новый отзыв', `Оценка ${rating}/5 за урок «${l.topic ?? subjectName(s, l.subjectId)}»`, undefined)
}

// ───────────── Пакеты, группы, справочники ─────────────

export function savePackage(s: AppState, p: Package) {
  if (p.title.trim().length < 3) throw new OpError('Название — минимум 3 символа', 'title')
  if (!p.subjectIds.length) throw new OpError('Выберите хотя бы один предмет', 'subjectIds')
  if (!p.languages.length) throw new OpError('Выберите язык', 'languages')
  if (p.lessonsCount < 1 || p.lessonsCount > 100) throw new OpError('Количество уроков 1–100', 'lessonsCount')
  if (p.lessonsCount < p.subjectIds.length) throw new OpError('Уроков меньше, чем предметов', 'lessonsCount')
  if (p.price <= 0) throw new OpError('Укажите цену', 'price')
  if (p.groupLimit < 2 || p.groupLimit > 30) throw new OpError('Лимит группы 2–30', 'groupLimit')
  if (p.grades[0] > p.grades[1]) throw new OpError('Диапазон классов указан неверно', 'grades')
  if (p.pickSubjects && (p.pickSubjects < 1 || p.pickSubjects > p.subjectIds.length)) throw new OpError('Предметов на выбор не может быть больше, чем предметов в пакете', 'pickSubjects')
  if (p.pickSubjects && p.lessonsCount < p.pickSubjects) throw new OpError('Уроков меньше, чем предметов на выбор', 'lessonsCount')
  const ex = s.packages.find((x) => x.id === p.id)
  if (ex) {
    const commercial = ex.price !== p.price || ex.lessonsCount !== p.lessonsCount || ex.subjectIds.join() !== p.subjectIds.join() || ex.pickSubjects !== p.pickSubjects
    Object.assign(ex, p, { version: commercial && ex.status === 'published' ? ex.version + 1 : ex.version })
    audit(s, 'package.update', `Package ${p.title}`, commercial && ex.status === 'published' ? `Новая версия v${ex.version}; купленные заказы сохраняют свои условия` : 'Изменены описательные поля')
    return ex.id
  }
  const id = uid('p')
  s.packages.push({ ...p, id, version: 1, status: 'draft' })
  audit(s, 'package.create', `Package ${p.title}`, 'Создан черновик пакета')
  return id
}

export function setPackageStatus(s: AppState, id: string, status: Package['status']) {
  const p = s.packages.find((x) => x.id === id)
  if (!p) throw new OpError('Пакет не найден')
  p.status = status
  audit(s, `package.${status}`, `Package ${p.title}`, { draft: 'В черновики', published: 'Опубликован в каталоге', archived: 'Архивирован — новые покупки недоступны' }[status])
}

export function saveGroup(s: AppState, g: Omit<Group, 'id' | 'members'> & { id?: string }) {
  if (g.name.trim().length < 3) throw new OpError('Название — минимум 3 символа', 'name')
  const t = teacherById(s, g.teacherId)
  if (!t || t.status !== 'published') throw new OpError('Выберите проверенного преподавателя', 'teacherId')
  if (!teacherTeaches(t, g.subjectId, g.grade, g.language)) throw new OpError('Преподаватель не ведёт этот предмет/класс/язык', 'teacherId')
  const pkg = packageById(s, g.packageId)
  if (!pkg?.subjectIds.includes(g.subjectId)) throw new OpError('Предмет не входит в пакет', 'packageId')
  if (g.limit > pkg.groupLimit) throw new OpError(`Лимит группы не может превышать лимит пакета (${pkg.groupLimit})`, 'limit')
  if (g.id) {
    const ex = s.groups.find((x) => x.id === g.id)!
    if (ex.members.length > g.limit) throw new OpError('В группе уже больше учеников, чем новый лимит', 'limit')
    Object.assign(ex, g)
    audit(s, 'group.update', `Group ${g.name}`, 'Параметры группы изменены')
    return ex.id
  }
  const id = uid('g')
  s.groups.push({ ...g, id, members: [] })
  audit(s, 'group.create', `Group ${g.name}`, 'Создана группа')
  return id
}

export function addGroupMember(s: AppState, groupId: string, studentId: string) {
  const g = s.groups.find((x) => x.id === groupId)
  const st = studentById(s, studentId)
  if (!g || !st) throw new OpError('Не найдено')
  if (g.members.some((m) => m.studentId === studentId)) throw new OpError('Ученик уже в группе')
  if (g.members.length >= g.limit) throw new OpError(`Группа заполнена (${g.limit})`)
  if (st.grade !== g.grade) throw new OpError(`Класс ученика (${st.grade}) не совпадает с группой (${g.grade})`)
  if (st.language !== g.language) throw new OpError('Язык обучения ученика не совпадает с группой')
  if (!pickOrderForQuota(s, studentId, g.subjectId)) throw new OpError('У ученика нет оплаченной свободной квоты по предмету')
  g.members.push({ studentId, addedAt: nowIso() })
  audit(s, 'group.member.add', `Group ${g.name}`, `Добавлен ${st.name}`)
}

export function removeGroupMember(s: AppState, groupId: string, studentId: string) {
  const g = s.groups.find((x) => x.id === groupId)
  if (!g) throw new OpError('Группа не найдена')
  g.members = g.members.filter((m) => m.studentId !== studentId)
  audit(s, 'group.member.remove', `Group ${g.name}`, `Исключён ${studentById(s, studentId)?.name}`)
}

export function toggleRole(s: AppState, userId: string, role: Role) {
  const u = s.users.find((x) => x.id === userId)
  if (!u) throw new OpError('Пользователь не найден')
  if (role === 'teacher' && !u.roles.includes('teacher')) return assignTeacherRole(s, userId)
  if (u.roles.includes(role)) {
    if (u.id === s.session.userId && role === s.session.role) throw new OpError('Нельзя снять роль, под которой вы сейчас работаете')
    u.roles = u.roles.filter((r) => r !== role)
  } else {
    u.roles.push(role)
    if (role === 'parent' && !s.parents.some((p) => p.userId === userId)) s.parents.push({ id: uid('par'), userId })
  }
  audit(s, 'role.toggle', `User ${u.name}`, `Роли: ${u.roles.join(', ') || '—'}`)
}

export function addSubject(s: AppState, name: string, tier: 'standard' | 'premium') {
  if (name.trim().length < 3) throw new OpError('Название — минимум 3 символа', 'name')
  if (s.subjects.some((x) => x.name.toLowerCase() === name.trim().toLowerCase())) throw new OpError('Такой предмет уже есть', 'name')
  s.subjects.push({ id: uid('subj'), name: name.trim(), tier })
  audit(s, 'dictionary.subject.add', `Subject ${name}`, `Ценовая категория: ${tier}`)
}

export function setAbsencePolicy(s: AppState, policy: 'release' | 'consume') {
  s.settings.absencePolicy = policy
  audit(s, 'settings.absence', 'DemoSettings', policy === 'release' ? 'Пропуск → вернуть резерв' : 'Пропуск → списать')
}

export function markNotificationsRead(s: AppState, userId: string, id?: string) {
  for (const n of s.notifications) if (n.userId === userId && (!id || n.id === id)) n.read = true
}

