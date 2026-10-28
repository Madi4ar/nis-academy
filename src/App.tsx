import { useEffect } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { DashboardLayout, PublicLayout } from '@/layouts/Layouts'
import { EmptyState } from '@/components/common'
import Home from '@/pages/public/Home'
import { PackageDetail, Packages } from '@/pages/public/Catalog'
import { TeacherDetail, Teachers } from '@/pages/public/Teachers'
import { Demo, Register } from '@/pages/public/Demo'
import Checkout from '@/pages/public/Checkout'
import ParentDashboard from '@/pages/parent/Dashboard'
import Children from '@/pages/parent/Children'
import { Allocate, Orders } from '@/pages/parent/Orders'
import { ParentCalendar, ParentFeedback } from '@/pages/parent/CalendarFeedback'
import { StudentCalendar, StudentDashboard } from '@/pages/student/Student'
import { TeacherDashboard, TeacherProfilePage } from '@/pages/teacher/Teacher'
import TeacherReport from '@/pages/teacher/Report'
import ModeratorDashboard from '@/pages/moderator/Dashboard'
import ModeratorTeachers from '@/pages/moderator/Teachers'
import ModeratorPackages from '@/pages/moderator/Packages'
import ModeratorGroups from '@/pages/moderator/Groups'
import ModeratorCalendar from '@/pages/moderator/Calendar'
import ModeratorReports from '@/pages/moderator/Reports'
import Analytics from '@/pages/moderator/Analytics'
import Admin from '@/pages/admin/Admin'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState title="Страница не найдена" description="Возможно, ссылка устарела или данные были сброшены." action={<Link to="/" className="text-primary hover:underline">На главную</Link>} />
    </div>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/teachers/:id" element={<TeacherDetail />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/:packageId" element={<Checkout />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/parent" element={<DashboardLayout role="parent" />}>
          <Route index element={<ParentDashboard />} />
          <Route path="children" element={<Children />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id/allocate" element={<Allocate />} />
          <Route path="calendar" element={<ParentCalendar />} />
          <Route path="feedback" element={<ParentFeedback />} />
        </Route>
        <Route path="/student" element={<DashboardLayout role="student" />}>
          <Route index element={<StudentDashboard />} />
          <Route path="calendar" element={<StudentCalendar />} />
        </Route>
        <Route path="/teacher" element={<DashboardLayout role="teacher" />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="profile" element={<TeacherProfilePage />} />
          <Route path="lessons/:id/report" element={<TeacherReport />} />
        </Route>
        <Route path="/moderator" element={<DashboardLayout role="moderator" />}>
          <Route index element={<ModeratorDashboard />} />
          <Route path="teachers" element={<ModeratorTeachers />} />
          <Route path="packages" element={<ModeratorPackages />} />
          <Route path="groups" element={<ModeratorGroups />} />
          <Route path="calendar" element={<ModeratorCalendar />} />
          <Route path="reports" element={<ModeratorReports />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<Admin />} />
        </Route>
      </Routes>
    </>
  )
}
