// Клиентские типы прототипа. Связи — по ID; трассировка: заказ → квота → участие → урок.

export type Role = 'guest' | 'parent' | 'student' | 'teacher' | 'moderator' | 'admin'
export type Language = 'ru' | 'kz'
export type PriceTier = 'standard' | 'premium'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  roles: Role[]
  createdAt: string
}

export interface Subject {
  id: string
  name: string
  tier: PriceTier
}

export interface ParentProfile {
  id: string
  userId: string
}

export interface StudentProfile {
  id: string
  userId?: string
  parentId: string
  name: string
  grade: number
  language: Language
  birthYear: number
}

export type TeacherStatus = 'draft' | 'pending_review' | 'needs_revision' | 'published' | 'unpublished'

export interface TeacherCompetency {
  subjectId: string
  grades: [number, number]
}

export interface TeacherProfile {
  id: string
  userId: string
  name: string
  photoHue: number
  competencies: TeacherCompetency[]
  languages: Language[]
  experienceYears: number
  category: string
  school: string
  bio: string
  status: TeacherStatus
  moderatorComment?: string
  updatedAt: string
}

export type PackageStatus = 'draft' | 'published' | 'archived'

export interface Package {
  id: string
  title: string
  description: string
  lessonsCount: number
  lessonDuration: number
  groupLimit: number
  subjectIds: string[]
  grades: [number, number]
  languages: Language[]
  price: number
  validityDays: number
  status: PackageStatus
  version: number
  popular?: boolean
  /** Пакет «на выбор»: покупатель выбирает ровно столько предметов из subjectIds. */
  pickSubjects?: number
}

/** Снимок условий пакета на момент покупки. */
export interface PackageVersion {
  packageId: string
  version: number
  title: string
  price: number
  lessonsCount: number
  lessonDuration: number
  subjectIds: string[]
}

export interface OrderItem {
  subjectId: string
  lessons: number
}

export interface OfferAcceptance {
  acceptedAt: string
  offerVersion: string
}

export type OrderStatus = 'unpaid' | 'paid'

export interface Order {
  id: string
  number: string
  parentId: string
  studentId: string
  packageVersion: PackageVersion
  items: OrderItem[]
  grade: number
  language: Language
  desiredTeacherId?: string
  status: OrderStatus
  total: number
  createdAt: string
  paidAt?: string
  expiresAt?: string
  renewedFromId?: string
  offer?: OfferAcceptance
}

export interface Payment {
  id: string
  orderId: string
  status: 'succeeded' | 'failed'
  amount: number
  createdAt: string
  /** Повторный демо-webhook для того же платежа не должен начислять квоты повторно. */
  webhookCount: number
}

export interface Group {
  id: string
  name: string
  subjectId: string
  grade: number
  language: Language
  teacherId: string
  packageId: string
  limit: number
  members: GroupMember[]
}

export interface GroupMember {
  studentId: string
  addedAt: string
}

export type LessonStatus = 'scheduled' | 'pending_approval' | 'needs_revision' | 'closed' | 'cancelled'

export interface Lesson {
  id: string
  groupId?: string
  subjectId: string
  grade: number
  language: Language
  packageId: string
  teacherId: string
  start: string
  durationMin: number
  zoomUrl: string
  status: LessonStatus
  topic?: string
  actualStart?: string
  held?: boolean
  teacherComment?: string
  moderatorComment?: string
  closedAt?: string
}

export type Attendance = 'present' | 'absent'

export interface LessonParticipant {
  id: string
  lessonId: string
  studentId: string
  orderId: string
  attendance?: Attendance
  note?: string
  outcome?: 'consumed' | 'released'
  active: boolean
}

export type QuotaTxType = 'grant' | 'reserve' | 'release' | 'consume' | 'reallocate_out' | 'reallocate_in' | 'expire'

export interface QuotaTransaction {
  id: string
  orderId: string
  studentId: string
  subjectId: string
  type: QuotaTxType
  amount: number
  lessonId?: string
  createdAt: string
  note?: string
}

export interface LessonFeedback {
  participantId: string
  lessonId: string
  studentId: string
  text: string
  publishedAt: string
}

export interface TeacherReview {
  id: string
  lessonId: string
  participantId: string
  teacherId: string
  studentId: string
  authorUserId: string
  rating: number
  text: string
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  text: string
  link?: string
  createdAt: string
  read: boolean
}

export interface AuditLog {
  id: string
  actorId: string
  action: string
  entity: string
  details: string
  createdAt: string
}

export type AbsencePolicy = 'release' | 'consume'

export interface DemoSettings {
  absencePolicy: AbsencePolicy
}

export interface Session {
  userId: string | null
  role: Role
}

export interface AppState {
  schemaVersion: number
  seededAt: string
  session: Session
  settings: DemoSettings
  users: User[]
  subjects: Subject[]
  parents: ParentProfile[]
  students: StudentProfile[]
  teachers: TeacherProfile[]
  packages: Package[]
  orders: Order[]
  payments: Payment[]
  groups: Group[]
  lessons: Lesson[]
  participants: LessonParticipant[]
  quotaTx: QuotaTransaction[]
  feedback: LessonFeedback[]
  reviews: TeacherReview[]
  notifications: Notification[]
  auditLog: AuditLog[]
}

export interface QuotaBalance {
  purchased: number
  consumed: number
  reserved: number
  expired: number
  free: number
}
