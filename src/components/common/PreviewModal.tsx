import { X, Eye } from 'lucide-react'

interface PreviewModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  onSend?: () => void
  sendLabel?: string
  sending?: boolean
  children: React.ReactNode
}

export function PreviewModal({ title, subtitle, onClose, onSend, sendLabel = '발송', sending, children }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-blue-500" />
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={16} className="text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">
            닫기
          </button>
          {onSend && (
            <button onClick={onSend} disabled={sending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {sending ? '발송 중...' : sendLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
