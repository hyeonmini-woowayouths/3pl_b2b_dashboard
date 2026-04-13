import { Layers, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { portalApi } from '../../lib/portal-api'

interface Props {
  children: React.ReactNode
  showLogout?: boolean
}

export function PortalLayout({ children, showLogout }: Props) {
  const nav = useNavigate()

  const handleLogout = async () => {
    await portalApi.logout().catch(() => {})
    nav('/portal')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 to-white">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/portal" className="flex items-center gap-2.5">
            <Layers className="text-emerald-600" size={24} />
            <div>
              <div className="text-sm font-bold text-gray-900">배민커넥트비즈 협력사 포털</div>
              <div className="text-[11px] text-gray-500">사장님 전용 온보딩 & 운영 관리</div>
            </div>
          </Link>
          {showLogout && (
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <LogOut size={12} /> 로그아웃
            </button>
          )}
        </div>
      </header>
      <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6">
        {children}
      </main>
    </div>
  )
}
