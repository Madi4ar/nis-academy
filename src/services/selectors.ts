// Вычисляемые агрегаты поверх локальных данных. Остатки всегда считаются из журнала QuotaTransaction.
import type { AppState, Lesson, Order, QuotaBalance, Role, TeacherProfile } from '@/types'

export interface QuotaFilter {
  orderId?: string
  studentId?: string
  subjectId?: string
}

export function isOrderExpired(o: Order, now = Date.now()) {
  return !!o.expiresAt && new Date(o.expiresAt).getTime() < now
}

export function quotaBalance(s: AppState, f: QuotaFilter): QuotaBalance {
  const orderIds = s.orders
    .filter((o) => o.status === 'paid')
    .filter((o) => (!f.orderId || o.id === f.orderId) && (!f.studentId || o.studentId === f.studentId))
    .map((o) => o.id)
  const total: QuotaBalance = { purchased: 0, consumed: 0, reserved: 0, expired: 0, free: 0 }
  for (const orderId of orderIds) {
    const order = s.orders.find((o) => o.id === orderId)!
    const b: QuotaBalance = { purchased: 0, consumed: 0, reserved: 0, expired: 0, free: 0 }
    for (const tx of s.quotaTx) {
      if (tx.orderId !== orderId || (f.subjectId && tx.subjectId !== f.subjectId)) continue
      switch (tx.type) {
        case 'grant': case 'reallocate_in': b.purchased += tx.amount; break
        case 'reallocate_out': b.purchased -= tx.amount; break
        case 'reserve': b.reserved += tx.amount; break
        case 'release': b.reserved -= tx.amount; break
        case 'consume': b.reserved -= tx.amount; b.consumed += tx.amount; break
        case 'expire': b.expired += tx.amount; break
      }
    }
    b.free = b.purchased - b.reserved - b.consumed - b.expired
    if (isOrderExpired(order) && b.free > 0) {
      b.expired += b.free
      b.free = 0
    }
    total.purchased += b.purchased
    total.consumed += b.consumed
    total.reserved += b.reserved
    total.expired += b.expired
    total.free += b.free
  }
  return total
}

export const subjectName = (s: AppState, id: string) => s.subjects.find((x) => x.id === id)?.name ?? id
export const teacherById = (s: AppState, id?: string) => s.teachers.find((t) => t.id === id)
export const studentById = (s: AppState, id?: string) => s.students.find((t) => t.id === id)
export const userById = (s: AppState, id?: string | null) => s.users.find((u) => u.id === id)
export const packageById = (s: AppState, id?: string) => s.packages.find((p) => p.id === id)
export const orderById = (s: AppState, id?: string) => s.orders.find((o) => o.id === id)

export function lessonEnd(l: Lesson) {
  return new Date(l.start).getTime() + l.durationMin * 60000
}

export type LessonDisplayStatus = Lesson['status'] | 'awaiting_report' | 'in_progress'

export function lessonDisplayStatus(l: Lesson, now = Date.now()): LessonDisplayStatus {
  if (l.status !== 'scheduled') return l.status
  if (lessonEnd(l) < now) return 'awaiting_report'
  if (new Date(l.start).getTime() <= now) return 'in_progress'
  return 'scheduled'
}

export function lessonParticipants(s: AppState, lessonId: string, includeInactive = false) {
  return s.participants.filter((p) => p.lessonId === lessonId && (includeInactive || p.active))
}

export function lessonsForStudent(s: AppState, studentId: string) {
  const ids = new Set(s.participants.filter((p) => p.studentId === studentId).map((p) => p.lessonId))
  return s.lessons.filter((l) => ids.has(l.id))
}

export function lessonsForTeacher(s: AppState, teacherId: string) {
  return s.lessons.filter((l) => l.teacherId === teacherId)
}

export function upcoming(lessons: Lesson[], now = Date.now()) {
  return lessons
    .filter((l) => l.status === 'scheduled' && lessonEnd(l) >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function teacherRating(s: AppState, teacherId: string) {
  const rs = s.reviews.filter((r) => r.teacherId === teacherId)
  if (!rs.length) return { avg: 0, count: 0 }
  return { avg: rs.reduce((a, r) => a + r.rating, 0) / rs.length, count: rs.length }
}

export function teacherStats(s: AppState, teacherId: string) {
  const ls = lessonsForTeacher(s, teacherId)
  const closed = ls.filter((l) => l.status === 'closed')
  const studentIds = new Set(s.participants.filter((p) => ls.some((l) => l.id === p.lessonId)).map((p) => p.studentId))
  return { lessonsHeld: closed.length, students: studentIds.size, upcoming: upcoming(ls).length }
}

export function teacherTeaches(t: TeacherProfile, subjectId: string, grade?: number, language?: string) {
  const c = t.competencies.find((x) => x.subjectId === subjectId)
  if (!c) return false
  if (grade !== undefined && (grade < c.grades[0] || grade > c.grades[1])) return false
  if (language && !t.languages.includes(language as never)) return false
  return true
}

export function publishedTeachers(s: AppState) {
  return s.teachers.filter((t) => t.status === 'published')
}

export function parentByUser(s: AppState, userId?: string | null) {
  return s.parents.find((p) => p.userId === userId)
}
export function teacherByUser(s: AppState, userId?: string | null) {
  return s.teachers.find((t) => t.userId === userId)
}
export function studentByUser(s: AppState, userId?: string | null) {
  return s.students.find((t) => t.userId === userId)
}

export function childrenOf(s: AppState, parentId?: string) {
  return s.students.filter((c) => c.parentId === parentId)
}

export function parentUserOfStudent(s: AppState, studentId: string) {
  const st = studentById(s, studentId)
  const par = s.parents.find((p) => p.id === st?.parentId)
  return par?.userId
}

/** Пользователи, которых затрагивает урок: учитель, ученики и их родители. */
export function lessonAudience(s: AppState, lessonId: string) {
  const l = s.lessons.find((x) => x.id === lessonId)
  if (!l) return []
  const ids = new Set<string>()
  const t = teacherById(s, l.teacherId)
  if (t) ids.add(t.userId)
  for (const p of lessonParticipants(s, lessonId, true)) {
    const st = studentById(s, p.studentId)
    if (st?.userId) ids.add(st.userId)
    const pu = parentUserOfStudent(s, p.studentId)
    if (pu) ids.add(pu)
  }
  return [...ids]
}

export const ROLE_LABEL: Record<Role, string> = {
  guest: 'Гость',
  parent: 'Родитель',
  student: 'Ученик',
  teacher: 'Учитель',
  moderator: 'Модератор',
  admin: 'Администратор',
}

export const ROLE_HOME: Record<Role, string> = {
  guest: '/',
  parent: '/parent',
  student: '/student',
  teacher: '/teacher',
  moderator: '/moderator',
  admin: '/admin',
}
