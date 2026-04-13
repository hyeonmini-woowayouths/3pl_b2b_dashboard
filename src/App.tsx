import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { PartnersListPage } from './pages/PartnersListPage'
import { ApplyPage } from './pages/ApplyPage'
import { StatsPage } from './pages/StatsPage'
import { TemplatesPage } from './pages/TemplatesPage'
import { PortalHome } from './pages/portal/PortalHome'
import { PortalApply } from './pages/portal/PortalApply'
import { PortalDashboard } from './pages/portal/PortalDashboard'
import { PortalDocuments } from './pages/portal/PortalDocuments'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/partners" element={<PartnersListPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />

        {/* 협력사 포털 */}
        <Route path="/portal" element={<PortalHome />} />
        <Route path="/portal/apply" element={<PortalApply />} />
        <Route path="/portal/my" element={<PortalDashboard />} />
        <Route path="/portal/my/documents" element={<PortalDocuments />} />
      </Routes>
    </BrowserRouter>
  )
}
