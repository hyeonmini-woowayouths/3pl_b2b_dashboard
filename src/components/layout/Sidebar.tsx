import { Users, Settings, HelpCircle, Layers, UserCog, ExternalLink } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { icon: Users, label: '3PL 협력사 (DP)', href: '/', sub: [
    { label: '영입 파이프라인', href: '/' },
    { label: '협력사 계약 리스트', href: '/partners' },
  ]},
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

      {/* 협력사 포털 안내 (데모) */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <UserCog size={14} className="text-emerald-700" />
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">협력사 포털 (데모)</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed mb-2.5">
            사장님이 접속하는 셀프서비스 포털을 체험해보세요.
          </p>
          <a
            href="/portal"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            포털 열기 <ExternalLink size={11} />
          </a>
        </div>
      </div>

      <div className="border-t border-gray-100 py-3 px-3 space-y-0.5">
        <Link to="/templates" className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          location.pathname === '/templates' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
        }`}>
          <Settings size={18} /> 템플릿 관리
        </Link>
        <a href="#" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          <HelpCircle size={18} /> 정책 위키
        </a>
      </div>
    </aside>
  )
}
