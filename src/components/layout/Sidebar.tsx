import { LayoutDashboard, Users, FileText, ShieldCheck, Link as LinkIcon, Settings, HelpCircle, Layers, BarChart3 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: '대시보드 홈', href: '/' },
  { icon: Users, label: '3PL 협력사 (DP)', href: '/', sub: [
    { label: '영입 파이프라인', href: '/' },
    { label: '협력사 계약 리스트', href: '/' },
  ]},
  { icon: BarChart3, label: '통계 & 리포트', href: '/stats' },
  { icon: FileText, label: '루커스튜디오 리포트', href: '#' },
  { icon: ShieldCheck, label: '정산/제재 관리', href: '#' },
  { icon: LinkIcon, label: '외부 시스템 연동', href: '#' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100">
        <Layers className="text-blue-600" size={26} />
        <span className="text-base font-bold text-gray-900">3PL Partners</span>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === location.pathname
          return (
            <div key={item.label}>
              <Link
                to={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
              {item.sub && (
                <div className="ml-9 mt-0.5 space-y-0.5">
                  {item.sub.map((s) => (
                    <Link
                      key={s.label}
                      to={s.href}
                      className="block px-3 py-1.5 rounded text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 py-3 px-3 space-y-0.5">
        <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <Settings size={18} /> 시스템 설정
        </a>
        <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <HelpCircle size={18} /> 정책 위키
        </a>
      </div>
    </aside>
  )
}
