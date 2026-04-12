import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { PartnersListPage } from './pages/PartnersListPage'
import { ApplyPage } from './pages/ApplyPage'
import { StatsPage } from './pages/StatsPage'
import { TemplatesPage } from './pages/TemplatesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/partners" element={<PartnersListPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
      </Routes>
    </BrowserRouter>
  )
}
