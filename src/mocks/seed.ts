// Демо-данные. Все люди и дети вымышленные. Даты строятся относительно момента первого запуска.
import type {
  AppState, Group, Lesson, LessonFeedback, LessonParticipant, Order, Package, PackageVersion, Payment,
  QuotaTransaction, StudentProfile, Subject, TeacherProfile, TeacherReview, User, Notification, AuditLog,
} from '@/types'
import { addMinutes } from '@/lib/utils'

export const SCHEMA_VERSION = 5

export const subjects: Subject[] = [
  { id: 'math', name: 'Математика', tier: 'standard' },
  { id: 'russian', name: 'Русский язык', tier: 'standard' },
  { id: 'kazakh', name: 'Казахский язык', tier: 'standard' },
  { id: 'english', name: 'Английский язык', tier: 'premium' },
  { id: 'physics', name: 'Физика', tier: 'standard' },
  { id: 'chemistry', name: 'Химия', tier: 'standard' },
  { id: 'biology', name: 'Биология', tier: 'standard' },
  { id: 'informatics', name: 'Информатика', tier: 'premium' },
]

const packages: Package[] = [
  {
    id: 'p7', title: '4 предмета на выбор', popular: true, pickSubjects: 4,
    description: 'Соберите свой пакет: выберите любые 4 предмета — например, математику, физику, биологию и казахский язык.',
    lessonsCount: 32, lessonDuration: 60, groupLimit: 8, subjectIds: ['math', 'physics', 'chemistry', 'biology', 'kazakh', 'russian'], grades: [5, 11],
    languages: ['ru', 'kz'], price: 120000, validityDays: 90, status: 'published', version: 1,
  },
  {
    id: 'p1', title: 'Старт: математика и русский', popular: true,
    description: 'Базовый пакет для 5–7 классов: закрываем пробелы и выстраиваем систему в двух ключевых предметах.',
    lessonsCount: 8, lessonDuration: 60, groupLimit: 6, subjectIds: ['math', 'russian'], grades: [5, 7],
    languages: ['ru', 'kz'], price: 32000, validityDays: 60, status: 'published', version: 1,
  },
  {
    id: 'p2', title: 'Интенсив ЕНТ', popular: true,
    description: 'Подготовка к ЕНТ в мини-группах: математика, физика и информатика с пробными тестами.',
    lessonsCount: 16, lessonDuration: 90, groupLimit: 8, subjectIds: ['math', 'physics', 'informatics'], grades: [9, 11],
    languages: ['ru', 'kz'], price: 72000, validityDays: 90, status: 'published', version: 2,
  },
  {
    id: 'p3', title: 'Языковой баланс', popular: true,
    description: 'Английский, казахский и русский в одном пакете — разговорная практика и грамматика.',
    lessonsCount: 12, lessonDuration: 60, groupLimit: 5, subjectIds: ['english', 'kazakh', 'russian'], grades: [3, 8],
    languages: ['ru', 'kz'], price: 54000, validityDays: 75, status: 'published', version: 1,
  },
  {
    id: 'p4', title: 'Естественные науки',
    description: 'Физика, химия и биология для 7–9 классов: опыты, задачи и подготовка к олимпиадам.',
    lessonsCount: 10, lessonDuration: 60, groupLimit: 6, subjectIds: ['physics', 'chemistry', 'biology'], grades: [6, 9],
    languages: ['ru'], price: 45000, validityDays: 60, status: 'published', version: 1,
  },
  {
    id: 'p5', title: 'Мини: английский для младших',
    description: 'Короткий пакет-знакомство для 1–4 классов: игры, песни и первые диалоги.',
    lessonsCount: 4, lessonDuration: 45, groupLimit: 4, subjectIds: ['english'], grades: [1, 4],
    languages: ['ru', 'kz'], price: 18000, validityDays: 30, status: 'published', version: 1,
  },
  {
    id: 'p6', title: 'Информатика: Python с нуля',
    description: 'Черновик пакета — ещё не опубликован в каталоге.',
    lessonsCount: 8, lessonDuration: 90, groupLimit: 6, subjectIds: ['informatics'], grades: [7, 11],
    languages: ['ru'], price: 48000, validityDays: 60, status: 'draft', version: 1,
  },
]

export function snapshot(p: Package): PackageVersion {
  return {
    packageId: p.id, version: p.version, title: p.title, price: p.price,
    lessonsCount: p.lessonsCount, lessonDuration: p.lessonDuration, subjectIds: [...p.subjectIds],
  }
}

export function buildSeed(): AppState {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const at = (days: number, h: number, m = 0) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const ago = (days: number) => at(-days, 10)

  const users: User[] = [
    { id: 'u-par1', name: 'Асель Нурланова', email: 'asel.demo@example.com', phone: '+7 700 000 00 01', roles: ['parent'], createdAt: ago(60) },
    { id: 'u-par2', name: 'Ерлан Садыков', email: 'erlan.demo@example.com', phone: '+7 700 000 00 02', roles: ['parent'], createdAt: ago(50) },
    { id: 'u-par3', name: 'Мария Ковалёва', email: 'maria.demo@example.com', phone: '+7 700 000 00 03', roles: ['parent', 'teacher'], createdAt: ago(40) },
    { id: 'u-s1', name: 'Тимур Нурланов', email: 'timur.demo@example.com', roles: ['student'], createdAt: ago(58) },
    { id: 'u-s2', name: 'Алия Нурланова', email: 'aliya.demo@example.com', roles: ['student'], createdAt: ago(58) },
    { id: 'u-s3', name: 'Дана Садыкова', email: 'dana.demo@example.com', roles: ['student'], createdAt: ago(49) },
    { id: 'u-s4', name: 'Арман Садыков', email: 'arman.demo@example.com', roles: ['student'], createdAt: ago(10) },
    { id: 'u-s5', name: 'Лиза Ковалёва', email: 'liza.demo@example.com', roles: ['student'], createdAt: ago(39) },
    { id: 'u-s6', name: 'Максим Ковалёв', email: 'maxim.demo@example.com', roles: ['student'], createdAt: ago(39) },
    { id: 'u-t1', name: 'Ирина Петрова', email: 'irina.demo@example.com', roles: ['teacher'], createdAt: ago(120) },
    { id: 'u-t2', name: 'Айдос Жумабеков', email: 'aidos.demo@example.com', roles: ['teacher'], createdAt: ago(110) },
    { id: 'u-t3', name: 'Светлана Ким', email: 'svetlana.demo@example.com', roles: ['teacher'], createdAt: ago(100) },
    { id: 'u-t4', name: 'Бауыржан Тлеуов', email: 'baur.demo@example.com', roles: ['teacher'], createdAt: ago(95) },
    { id: 'u-t5', name: 'Анна Смирнова', email: 'anna.demo@example.com', roles: ['teacher'], createdAt: ago(90) },
    { id: 'u-t6', name: 'Даурен Омаров', email: 'dauren.demo@example.com', roles: ['teacher'], createdAt: ago(80) },
    { id: 'u-t7', name: 'Гульнара Есенова', email: 'gulnara.demo@example.com', roles: ['teacher'], createdAt: ago(70) },
    { id: 'u-t8', name: 'Олжас Нуриев', email: 'olzhas.demo@example.com', roles: ['teacher'], createdAt: ago(5) },
    { id: 'u-t9', name: 'Елена Волкова', email: 'elena.demo@example.com', roles: ['teacher'], createdAt: ago(12) },
    { id: 'u-t10', name: 'Марат Искаков', email: 'marat.demo@example.com', roles: ['teacher'], createdAt: ago(200) },
    { id: 'u-cand', name: 'Сабина Алиева', email: 'sabina.demo@example.com', roles: [], createdAt: ago(2) },
    { id: 'u-mod', name: 'Айгерим Касымова', email: 'moderator.demo@example.com', roles: ['moderator', 'admin'], createdAt: ago(300) },
    { id: 'u-admin', name: 'Олег Ли', email: 'admin.demo@example.com', roles: ['admin'], createdAt: ago(300) },
  ]

  const parents = [
    { id: 'par1', userId: 'u-par1' },
    { id: 'par2', userId: 'u-par2' },
    { id: 'par3', userId: 'u-par3' },
  ]

  const students: StudentProfile[] = [
    { id: 's1', userId: 'u-s1', parentId: 'par1', name: 'Тимур Нурланов', grade: 6, language: 'ru', birthYear: 2014 },
    { id: 's2', userId: 'u-s2', parentId: 'par1', name: 'Алия Нурланова', grade: 10, language: 'kz', birthYear: 2010 },
    { id: 's3', userId: 'u-s3', parentId: 'par2', name: 'Дана Садыкова', grade: 6, language: 'kz', birthYear: 2014 },
    { id: 's4', userId: 'u-s4', parentId: 'par2', name: 'Арман Садыков', grade: 6, language: 'ru', birthYear: 2014 },
    { id: 's5', userId: 'u-s5', parentId: 'par3', name: 'Лиза Ковалёва', grade: 3, language: 'ru', birthYear: 2017 },
    { id: 's6', userId: 'u-s6', parentId: 'par3', name: 'Максим Ковалёв', grade: 6, language: 'ru', birthYear: 2014 },
  ]

  const t = (
    id: string, userId: string, name: string, hue: number, competencies: TeacherProfile['competencies'],
    languages: TeacherProfile['languages'], exp: number, category: string, school: string, bio: string,
    status: TeacherProfile['status'], moderatorComment?: string,
  ): TeacherProfile => ({ id, userId, name, photoHue: hue, competencies, languages, experienceYears: exp, category, school, bio, status, moderatorComment, updatedAt: ago(3) })

  const teachers: TeacherProfile[] = [
    t('t1', 'u-t1', 'Ирина Петрова', 250, [{ subjectId: 'math', grades: [5, 9] }], ['ru'], 12, 'Педагог-исследователь', 'Школа-лицей №8 (демо)',
      'Объясняю математику через задачи из жизни. Готовлю к олимпиадам городского уровня.', 'published'),
    t('t2', 'u-t2', 'Айдос Жумабеков', 200, [{ subjectId: 'math', grades: [5, 11] }], ['kz', 'ru'], 9, 'Педагог-эксперт', 'Гимназия №3 (демо)',
      'Математика на казахском и русском. Специализация — подготовка к ЕНТ.', 'published'),
    t('t3', 'u-t3', 'Светлана Ким', 330, [{ subjectId: 'russian', grades: [3, 9] }], ['ru', 'kz'], 15, 'Педагог-мастер', 'Школа №25 (демо)',
      'Русский язык для русско- и казахоязычных учеников: грамотность, речь, сочинения.', 'published'),
    t('t4', 'u-t4', 'Бауыржан Тлеуов', 160, [{ subjectId: 'physics', grades: [7, 11] }], ['kz', 'ru'], 7, 'Педагог-модератор', 'НИШ-подобная школа (демо)',
      'Физика без зубрёжки: эксперименты, задачи ЕНТ, разбор типичных ошибок.', 'published'),
    t('t5', 'u-t5', 'Анна Смирнова', 20, [{ subjectId: 'english', grades: [1, 6] }], ['ru'], 6, 'Педагог', 'Языковая школа (демо)',
      'Английский для младших школьников через игры и проекты. Сертификат CELTA.', 'published'),
    t('t6', 'u-t6', 'Даурен Омаров', 280, [{ subjectId: 'informatics', grades: [8, 11] }], ['kz', 'ru'], 5, 'Педагог-модератор', 'IT-лицей (демо)',
      'Python, алгоритмы и задачи ЕНТ по информатике. Бывший разработчик.', 'published'),
    t('t7', 'u-t7', 'Гульнара Есенова', 120, [{ subjectId: 'kazakh', grades: [3, 9] }], ['kz', 'ru'], 18, 'Педагог-мастер', 'Школа-гимназия №12 (демо)',
      'Казахский язык как родной и как второй: разговорная практика и грамматика.', 'published'),
    t('t8', 'u-t8', 'Олжас Нуриев', 60, [{ subjectId: 'chemistry', grades: [7, 11] }, { subjectId: 'biology', grades: [7, 9] }], ['ru', 'kz'], 4, 'Педагог', 'Школа №41 (демо)',
      'Химия и биология: лабораторные опыты дома и подготовка к олимпиадам.', 'pending_review'),
    t('t9', 'u-t9', 'Елена Волкова', 300, [{ subjectId: 'english', grades: [5, 11] }], ['ru'], 3, 'Педагог', 'Частная практика (демо)',
      'Английский для подростков.', 'needs_revision', 'Добавьте подробную биографию и подтвердите категорию — сейчас описание слишком короткое.'),
    t('t10', 'u-t10', 'Марат Искаков', 40, [{ subjectId: 'math', grades: [7, 11] }], ['ru'], 20, 'Педагог-эксперт', 'Школа №1 (демо)',
      'Профиль снят с публикации по просьбе преподавателя (отпуск).', 'unpublished'),
    t('t11', 'u-par3', 'Мария Ковалёва', 350, [{ subjectId: 'biology', grades: [6, 9] }], ['ru'], 8, 'Педагог-модератор', 'Школа №17 (демо)',
      'Биология: от клетки до экосистем. Мама двоих учеников платформы.', 'published'),
  ]

  // ── Заказы ──
  const P = (id: string) => packages.find((p) => p.id === id)!
  const mkOrder = (
    id: string, number: string, parentId: string, studentId: string, pkg: string, items: [string, number][],
    grade: number, language: 'ru' | 'kz', status: 'paid' | 'unpaid', createdDays: number, extra: Partial<Order> = {},
  ): Order => {
    const p = P(pkg)
    const createdAt = ago(createdDays)
    return {
      id, number, parentId, studentId, packageVersion: snapshot(p), items: items.map(([subjectId, lessons]) => ({ subjectId, lessons })),
      grade, language, status, total: p.price, createdAt,
      paidAt: status === 'paid' ? createdAt : undefined,
      expiresAt: status === 'paid' ? new Date(new Date(createdAt).getTime() + p.validityDays * 86400000).toISOString() : undefined,
      offer: { acceptedAt: createdAt, offerVersion: '2026-10-20' },
      ...extra,
    }
  }

  const orders: Order[] = [
    mkOrder('o1', 'ЗК-1001', 'par1', 's1', 'p1', [['math', 4], ['russian', 4]], 6, 'ru', 'paid', 30, { desiredTeacherId: 't1' }),
    mkOrder('o2', 'ЗК-1002', 'par1', 's2', 'p2', [['math', 8], ['physics', 4], ['informatics', 4]], 10, 'kz', 'paid', 28),
    mkOrder('o3', 'ЗК-1003', 'par2', 's3', 'p1', [['math', 2], ['russian', 6]], 6, 'kz', 'paid', 20),
    mkOrder('o4', 'ЗК-1004', 'par2', 's4', 'p1', [['math', 4], ['russian', 4]], 6, 'ru', 'unpaid', 1),
    mkOrder('o5', 'ЗК-1005', 'par1', 's1', 'p1', [['math', 4], ['russian', 4]], 6, 'ru', 'paid', 4, { renewedFromId: 'o1' }),
    mkOrder('o6', 'ЗК-1006', 'par3', 's5', 'p5', [['english', 4]], 3, 'ru', 'paid', 25),
    mkOrder('o7', 'ЗК-1007', 'par3', 's6', 'p1', [['math', 6], ['russian', 2]], 6, 'ru', 'paid', 26),
  ]

  const payments: Payment[] = [
    ...orders.filter((o) => o.status === 'paid').map((o) => ({ id: `pay-${o.id}`, orderId: o.id, status: 'succeeded' as const, amount: o.total, createdAt: o.createdAt, webhookCount: 1 })),
    { id: 'pay-o4-f', orderId: 'o4', status: 'failed', amount: 32000, createdAt: ago(1), webhookCount: 1 },
  ]

  // ── Группы ──
  const groups: Group[] = [
    { id: 'g1', name: 'Математика 6 (рус) — А', subjectId: 'math', grade: 6, language: 'ru', teacherId: 't1', packageId: 'p1', limit: 2, members: [{ studentId: 's1', addedAt: ago(29) }, { studentId: 's6', addedAt: ago(25) }] },
    { id: 'g2', name: 'Математика 6 (каз)', subjectId: 'math', grade: 6, language: 'kz', teacherId: 't2', packageId: 'p1', limit: 6, members: [{ studentId: 's3', addedAt: ago(19) }] },
    { id: 'g3', name: 'Русский язык 6 (рус)', subjectId: 'russian', grade: 6, language: 'ru', teacherId: 't3', packageId: 'p1', limit: 6, members: [{ studentId: 's1', addedAt: ago(29) }] },
    { id: 'g4', name: 'Физика ЕНТ 10 (каз)', subjectId: 'physics', grade: 10, language: 'kz', teacherId: 't4', packageId: 'p2', limit: 8, members: [{ studentId: 's2', addedAt: ago(27) }] },
    { id: 'g5', name: 'Математика ЕНТ 10 (каз)', subjectId: 'math', grade: 10, language: 'kz', teacherId: 't2', packageId: 'p2', limit: 8, members: [{ studentId: 's2', addedAt: ago(27) }] },
    { id: 'g6', name: 'Английский 3 (рус)', subjectId: 'english', grade: 3, language: 'ru', teacherId: 't5', packageId: 'p5', limit: 4, members: [{ studentId: 's5', addedAt: ago(24) }] },
    { id: 'g7', name: 'Информатика 10 (каз)', subjectId: 'informatics', grade: 10, language: 'kz', teacherId: 't6', packageId: 'p2', limit: 8, members: [{ studentId: 's2', addedAt: ago(27) }] },
    { id: 'g8', name: 'Русский язык 6 (каз)', subjectId: 'russian', grade: 6, language: 'kz', teacherId: 't3', packageId: 'p1', limit: 6, members: [{ studentId: 's3', addedAt: ago(19) }] },
  ]

  // ── Уроки и участники ──
  type PSeed = [studentId: string, orderId: string, attendance?: 'present' | 'absent', outcome?: 'consumed' | 'released', note?: string]
  const lessons: Lesson[] = []
  const participants: LessonParticipant[] = []
  const quotaTx: QuotaTransaction[] = []
  const G = (id: string) => groups.find((g) => g.id === id)!
  const mkLesson = (id: string, groupId: string, start: string, status: Lesson['status'], ps: PSeed[], extra: Partial<Lesson> = {}) => {
    const g = G(groupId)
    const p = P(g.packageId)
    lessons.push({
      id, groupId, subjectId: g.subjectId, grade: g.grade, language: g.language, packageId: g.packageId, teacherId: g.teacherId,
      start, durationMin: p.lessonDuration, zoomUrl: `https://zoom.us/j/0000${id.replace(/\D/g, '').padStart(3, '0')}000?demo=1`, status, ...extra,
    })
    ps.forEach(([studentId, orderId, attendance, outcome, note], i) => {
      const pid = `lp-${id}-${i}`
      participants.push({ id: pid, lessonId: id, studentId, orderId, attendance, outcome, note, active: status !== 'cancelled' })
      const base = { orderId, studentId, subjectId: g.subjectId, amount: 1, lessonId: id }
      quotaTx.push({ id: `qt-${pid}-r`, type: 'reserve', createdAt: addMinutes(start, -2880), ...base })
      if (outcome === 'consumed') quotaTx.push({ id: `qt-${pid}-c`, type: 'consume', createdAt: addMinutes(start, 600), ...base })
      if (outcome === 'released') quotaTx.push({ id: `qt-${pid}-x`, type: 'release', createdAt: addMinutes(start, 600), ...base, note: status === 'cancelled' ? 'Отмена урока' : 'Пропуск — резерв возвращён (демо-правило)' })
    })
  }

  mkLesson('L1', 'g1', at(-14, 16), 'closed', [['s1', 'o1', 'present', 'consumed', 'Тимур уверенно решает уравнения, нужно больше практики с дробями.'], ['s6', 'o7', 'present', 'consumed', 'Максим активно работал, все задачи решены.']],
    { topic: 'Линейные уравнения', held: true, actualStart: at(-14, 16), closedAt: at(-13, 10) })
  mkLesson('L2', 'g3', at(-12, 15), 'closed', [['s1', 'o1', 'present', 'consumed', 'Хорошо справился с диктантом, 2 ошибки в безударных гласных.']],
    { topic: 'Безударные гласные', held: true, actualStart: at(-12, 15), closedAt: at(-11, 10) })
  mkLesson('L3', 'g6', at(-10, 11), 'closed', [['s5', 'o6', 'present', 'consumed', 'Лиза выучила 15 новых слов и спела песню целиком!']],
    { topic: 'Animals & colours', held: true, actualStart: at(-10, 11), closedAt: at(-9, 10) })
  mkLesson('L4', 'g6', at(-7, 11), 'closed', [['s5', 'o6', 'absent', 'released', 'Отсутствовала по болезни.']],
    { topic: 'My family', held: true, actualStart: at(-7, 11), closedAt: at(-6, 10) })
  mkLesson('L5', 'g5', at(-5, 17), 'closed', [['s2', 'o2', 'present', 'consumed', 'Алия отлично разобрала задачи на проценты. Рекомендую повторить логарифмы.']],
    { topic: 'Проценты и пропорции (ЕНТ)', held: true, actualStart: at(-5, 17), closedAt: at(-4, 10) })
  mkLesson('L6', 'g4', at(-3, 17), 'pending_approval', [['s2', 'o2', 'present', undefined, 'Работала хорошо, вопросы по второму закону Ньютона закрыты.']],
    { topic: 'Законы Ньютона', held: true, actualStart: at(-3, 17, 5), teacherComment: 'Урок прошёл по плану.' })
  mkLesson('L7', 'g1', at(-2, 16), 'scheduled', [['s1', 'o1'], ['s6', 'o7']])
  mkLesson('L8', 'g2', at(-1, 15), 'needs_revision', [['s3', 'o3', 'present', undefined, 'Хорошо.']],
    { topic: 'Дроби', held: true, actualStart: at(-1, 15), moderatorComment: 'Заметка по ученику слишком короткая — опишите, что получилось и что стоит повторить.' })
  mkLesson('L9', 'g7', at(-4, 18), 'cancelled', [['s2', 'o2', undefined, 'released']], { moderatorComment: 'Отменён: болезнь преподавателя (демо).' })
  mkLesson('L10', 'g1', at(1, 16), 'scheduled', [['s1', 'o1'], ['s6', 'o7']])
  mkLesson('L11', 'g3', at(2, 15), 'scheduled', [['s1', 'o1']])
  mkLesson('L12', 'g2', at(1, 15), 'scheduled', [['s3', 'o3']])
  mkLesson('L13', 'g5', at(3, 17), 'scheduled', [['s2', 'o2']])
  mkLesson('L14', 'g4', at(4, 17), 'scheduled', [['s2', 'o2']])
  mkLesson('L15', 'g6', at(2, 11), 'scheduled', [['s5', 'o6']])
  mkLesson('L16', 'g7', at(5, 18), 'scheduled', [['s2', 'o2']])
  mkLesson('L17', 'g8', at(3, 14), 'scheduled', [['s3', 'o3']])
  mkLesson('L18', 'g1', at(8, 16), 'scheduled', [['s1', 'o5'], ['s6', 'o7']])
  mkLesson('L19', 'g3', at(-9, 15), 'closed', [['s1', 'o1', 'present', 'consumed', 'Сочинение-миниатюра получилось живым, хорошая структура.']],
    { topic: 'Сочинение-описание', held: true, actualStart: at(-9, 15), closedAt: at(-8, 10) })
  mkLesson('L20', 'g5', at(0, 19), 'scheduled', [['s2', 'o2']])

  // Начисления по оплаченным заказам
  for (const o of orders.filter((x) => x.status === 'paid')) {
    for (const it of o.items) {
      quotaTx.push({ id: `qt-${o.id}-${it.subjectId}-g`, orderId: o.id, studentId: o.studentId, subjectId: it.subjectId, type: 'grant', amount: it.lessons, createdAt: o.paidAt!, note: 'Оплата заказа' })
    }
  }

  const feedback: LessonFeedback[] = participants
    .filter((p) => p.note && lessons.find((l) => l.id === p.lessonId)?.status === 'closed')
    .map((p) => ({ participantId: p.id, lessonId: p.lessonId, studentId: p.studentId, text: p.note!, publishedAt: lessons.find((l) => l.id === p.lessonId)!.closedAt! }))

  const reviews: TeacherReview[] = [
    { id: 'r1', lessonId: 'L1', participantId: 'lp-L1-0', teacherId: 't1', studentId: 's1', authorUserId: 'u-s1', rating: 5, text: 'Объясняет так, что уравнения стали понятными!', createdAt: at(-13, 20) },
    { id: 'r2', lessonId: 'L3', participantId: 'lp-L3-0', teacherId: 't5', studentId: 's5', authorUserId: 'u-s5', rating: 4, text: 'Было весело, мы пели песню! Хочу ещё игр.', createdAt: at(-9, 20) },
    { id: 'r3', lessonId: 'L5', participantId: 'lp-L5-0', teacherId: 't2', studentId: 's2', authorUserId: 'u-s2', rating: 5, text: 'Очень понятно объясняет, разобрали все мои вопросы.', createdAt: at(-4, 21) },
    { id: 'r4', lessonId: 'L2', participantId: 'lp-L2-0', teacherId: 't3', studentId: 's1', authorUserId: 'u-s1', rating: 4, text: 'Было интересно, но диктант сложный :)', createdAt: at(-11, 18) },
    { id: 'r5', lessonId: 'L1', participantId: 'lp-L1-1', teacherId: 't1', studentId: 's6', authorUserId: 'u-s6', rating: 5, text: 'Классные задачи, решил все сам.', createdAt: at(-13, 21) },
  ]

  const notifications: Notification[] = [
    { id: 'n1', userId: 'u-par1', title: 'Обратная связь опубликована', text: 'Отчёт по уроку «Проценты и пропорции» для Алии доступен.', link: '/parent/feedback', createdAt: at(-4, 10), read: false },
    { id: 'n2', userId: 'u-par2', title: 'Демо-оплата отклонена', text: 'Заказ ЗК-1004 не оплачен. Можно повторить оплату.', link: '/parent/orders', createdAt: ago(1), read: false },
    { id: 'n3', userId: 'u-t2', title: 'Отчёт возвращён', text: 'Модератор вернул отчёт по уроку «Дроби» с замечанием.', link: '/teacher/lessons/L8/report', createdAt: at(0, 9), read: false },
    { id: 'n4', userId: 'u-mod', title: 'Новая анкета на проверке', text: 'Олжас Нуриев отправил анкету преподавателя.', link: '/moderator/teachers', createdAt: ago(1), read: false },
    { id: 'n5', userId: 'u-s1', title: 'Скоро урок', text: 'Завтра в 16:00 — математика с Ириной Петровой.', link: '/student/calendar', createdAt: at(0, 8), read: false },
  ]

  const auditLog: AuditLog[] = [
    { id: 'a1', actorId: 'u-mod', action: 'teacher.publish', entity: 'TeacherProfile t1', details: 'Анкета одобрена и опубликована', createdAt: ago(100) },
    { id: 'a2', actorId: 'u-par1', action: 'order.paid', entity: 'Order ЗК-1001', details: 'Демо-оплата успешна, начислено 8 уроков', createdAt: ago(30) },
    { id: 'a3', actorId: 'u-mod', action: 'teacher.return', entity: 'TeacherProfile t9', details: 'Возвращено на доработку', createdAt: ago(3) },
    { id: 'a4', actorId: 'u-par2', action: 'payment.failed', entity: 'Order ЗК-1004', details: 'Демо-оплата отклонена, квоты не начислены', createdAt: ago(1) },
  ]

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt: now.toISOString(),
    session: { userId: null, role: 'guest' },
    settings: { absencePolicy: 'release' },
    users, subjects, parents, students, teachers, packages, orders, payments, groups,
    lessons, participants, quotaTx, feedback, reviews, notifications, auditLog,
  }
}
