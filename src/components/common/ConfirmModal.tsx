import { X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ConfirmModalProps {
  title: string
  description?: string
  confirmLabel?: string
  confirmColor?: string
  showReasonInput?: boolean
  reasonPlaceholder?: string
  onConfirm: (reason?: string) => void | Promise<void>
  onCancel: () => void
  children?: React.ReactNode
}

export function ConfirmModal({
  title, description, confirmLabel = '확인', confirmColor = 'bg-blue-600 hover:bg-blue-700',
  showReasonInput, reasonPlaceholder = '사유를 입력하세요 (선택)',
  onConfirm, onCancel, children,
}: ConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onCancel])

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(reason || undefined)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded"><X size={16} className="text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {description && <p className="text-sm text-gray-600">{description}</p>}
          {children}
          {showReasonInput && (
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              autoFocus
            />
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100">
            취소
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={`px-4 py-2 text-sm text-white rounded-lg font-medium disabled:opacity-50 ${confirmColor}`}>
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
