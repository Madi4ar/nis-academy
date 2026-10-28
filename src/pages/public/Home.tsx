import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, CheckCircle2, MessageSquareHeart, ShieldCheck, Users, Video, Wallet } from 'lucide-react'
import { useStore } from '@/services/store'
import { publishedTeachers, teacherRating } from '@/services/selectors'
import { PackageCard, TeacherCard } from '@/components/domain'
import { Avatar, DemoBadge, StarRating } from '@/components/common'
import { Card } from '@/components/ui/primitives'

export default function Home() {
  const { state } = useStore()
  const pkgs = state.packages.filter((p) => p.status === 'published')
  const popular = pkgs.filter((p) => p.popular).slice(0, 3)
  const teachers = publishedTeachers(state)
    .map((t) => ({ t, r: teacherRating(state, t.id) }))
    .sort((a, b) => b.r.avg - a.r.avg)
    .slice(0, 4)
  const review = state.reviews[0]
  const reviewAuthor = state.users.find((u) => u.id === review?.authorUserId)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-soft/70 via-background to-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <DemoBadge>Интерактивный прототип</DemoBadge>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Групповые онлайн-занятия <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">с проверенными учителями</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-fg-muted">
              Покупайте пакет уроков, распределяйте его между предметами и следите за прогрессом ребёнка: расписание, посещаемость и обратная связь после каждого урока.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/packages" className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-6 font-medium text-white shadow-sm hover:bg-primary-hover">
                Выбрать пакет <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link to="/demo" className="inline-flex h-12 items-center rounded-[var(--radius-sm)] border border-border bg-surface px-6 font-medium hover:bg-muted">
                Войти в демо
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              <div><dt className="text-xs text-fg-muted">Преподавателей</dt><dd className="tabular text-2xl font-bold">{publishedTeachers(state).length}</dd></div>
              <div><dt className="text-xs text-fg-muted">Пакетов</dt><dd className="tabular text-2xl font-bold">{pkgs.length}</dd></div>
              <div><dt className="text-xs text-fg-muted">Предметов</dt><dd className="tabular text-2xl font-bold">{state.subjects.length}</dd></div>
            </dl>
          </div>
          {/* Иллюстративная карточка ближайшего урока */}
          <div className="relative mx-auto w-full max-w-md" aria-hidden>
            <div className="absolute -left-6 -top-6 size-40 rounded-full bg-secondary/20 blur-3xl" />
            <div className="absolute -bottom-8 -right-4 size-48 rounded-full bg-primary/20 blur-3xl" />
            <Card className="relative p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Ближайший урок</span>
                <span className="rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info">Завтра, 16:00</span>
              </div>
              <div className="flex items-center gap-3">
                <Avatar name="Ирина Петрова" hue={250} size={48} />
                <div>
                  <p className="font-semibold">Математика · 6 класс</p>
                  <p className="text-sm text-fg-muted">Ирина Петрова · группа до 6 человек</p>
                </div>
              </div>
              <div className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-primary text-sm font-medium text-white"><Video className="size-4" /> Тестовая Zoom-ссылка</div>
              <div className="mt-5 rounded-[var(--radius-md)] bg-muted p-3">
                <p className="mb-2 text-xs font-medium text-fg-muted">Остаток пакета</p>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-surface">
                  <span className="w-[25%] bg-primary" /><span className="w-[25%] bg-amber-400" /><span className="w-[50%] bg-emerald-500" />
                </div>
                <div className="mt-2 flex justify-between text-xs text-fg-muted"><span>списано 2</span><span>резерв 2</span><span>свободно 4</span></div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Преимущества */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">Почему родителям удобно</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: 'Проверенные учителя', text: 'Каждая анкета проходит модерацию: компетенции, стаж, категория.' },
            { icon: Users, title: 'Мини-группы', text: 'Ученики подобраны по классу, предмету и языку обучения.' },
            { icon: Wallet, title: 'Прозрачные квоты', text: 'Видно, сколько уроков куплено, проведено, забронировано и свободно.' },
            { icon: MessageSquareHeart, title: 'Обратная связь', text: 'После каждого урока — заметка учителя по вашему ребёнку.' },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title} className="p-6">
              <span className="mb-4 inline-flex rounded-[var(--radius-sm)] bg-primary-soft p-2.5 text-primary"><Icon className="size-5" aria-hidden /></span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section id="how" className="scroll-mt-20 border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Как это работает</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              { icon: Wallet, title: 'Выберите пакет', text: 'Распределите уроки между предметами пакета и примите оферту.' },
              { icon: CheckCircle2, title: 'Оплатите', text: 'После оплаты уроки начисляются на ребёнка как квоты.' },
              { icon: CalendarCheck, title: 'Получите расписание', text: 'Модератор подбирает группу и учителя — урок появляется в календаре.' },
              { icon: MessageSquareHeart, title: 'Учитесь и оценивайте', text: 'Заходите по Zoom-ссылке, читайте отчёты и оставляйте отзывы.' },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative">
                <span className="tabular mb-3 flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-bold text-white">{i + 1}</span>
                <h3 className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-primary" aria-hidden />{title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Популярные пакеты */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Популярные пакеты</h2>
            <p className="mt-1 text-fg-muted">Групповые занятия — индивидуальных уроков в MVP нет.</p>
          </div>
          <Link to="/packages" className="hidden text-sm font-medium text-primary hover:underline sm:block">Все пакеты →</Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {popular.map((p) => <PackageCard key={p.id} pkg={p} />)}
        </div>
      </section>

      {/* Учителя */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Преподаватели</h2>
            <Link to="/teachers" className="text-sm font-medium text-primary hover:underline">Весь каталог →</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {teachers.map(({ t }) => <TeacherCard key={t.id} t={t} />)}
          </div>
        </div>
      </section>

      {/* Отзыв + CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {review && (
            <Card className="p-8">
              <StarRating value={review.rating} />
              <blockquote className="mt-4 text-lg font-medium">«{review.text}»</blockquote>
              <p className="mt-4 text-sm text-fg-muted">{reviewAuthor?.name} · отзыв ученика после урока</p>
            </Card>
          )}
          <div className="flex flex-col justify-center rounded-[var(--radius-lg)] bg-gradient-to-br from-primary to-indigo-700 p-8 text-white">
            <h2 className="text-2xl font-bold">Попробуйте все сценарии в демо</h2>
            <p className="mt-2 text-indigo-100">Покупка, расписание, отчёт учителя, подтверждение модератором — без регистрации и реальных платежей.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/demo" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-white px-5 text-sm font-semibold text-primary hover:bg-indigo-50">Выбрать роль</Link>
              <Link to="/register" className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10">Демо-регистрация</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
