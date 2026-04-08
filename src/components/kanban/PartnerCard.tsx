import { useDraggable } from '@dnd-kit/core'
import { MapPin, User, AlertTriangle } from 'lucide-react'
import { STATUS_LABELS } from '../../types/partner'
import type { Partner } from '../../types/partner'

interface PartnerCardProps {
  partner: Partner
  onClick: () => void
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-600',
  validating: 'bg-blue-50 text-blue-600',
  validation_failed: 'bg-red-50 text-red-600',
  proposal_sent: 'bg-sky-50 text-sky-600',
  consulting: 'bg-indigo-50 text-indigo-600',
  dropped: 'bg-red-100 text-red-700',
  docs_pending: 'bg-amber-50 text-amber-600',
  docs_submitted: 'bg-amber-100 text-amber-700',
  docs_rejected: 'bg-red-50 text-red-600',
  docs_approved: 'bg-emerald-50 text-emerald-600',
  zone_confirmed: 'bg-emerald-100 text-emerald-700',
  contract_sending: 'bg-violet-50 text-violet-600',
  contract_sent: 'bg-violet-100 text-violet-700',
  contract_signed: 'bg-purple-100 text-purple-700',
  brms_registering: 'bg-fuchsia-50 text-fuchsia-600',
  brms_registered: 'bg-fuchsia-100 text-fuchsia-700',
  preparing: 'bg-teal-50 text-teal-600',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-orange-100 text-orange-700',
  contract_ended: 'bg-gray-200 text-gray-600',
  contract_terminated: 'bg-gray-300 text-gray-700',
}

export function PartnerCard({ partner, onClick }: PartnerCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: partner.id,
  })

  const isWarning =
    partner.status === 'docs_rejected' ||
    partner.status === 'validation_failed' ||
    partner.status === 'dropped'

  const isSimIgwaSe = partner.business_type === '간이과세'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${isWarning ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {partner.company_name}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {partner.contract_type === 'direct' ? '직계약' : '중개사'}
          </div>
        </div>
        {isSimIgwaSe && (
          <span className="shrink-0 ml-2 text-[10px] font-bold text-red-500 border border-red-300 px-1.5 py-0.5 rounded">
            간이과세자
          </span>
        )}
      </div>

      {isWarning && (
        <div className="flex items-center gap-1 text-[11px] text-red-500 mb-2">
          <AlertTriangle size={12} />
          {partner.status === 'docs_rejected' && '서류 반려'}
          {partner.status === 'validation_failed' && '검증 실패'}
          {partner.status === 'dropped' && '드랍'}
        </div>
      )}

      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <User size={12} className="shrink-0" />
          <span className="truncate">{partner.applicant_name ?? '-'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">
            {partner.confirmed_zone_code ?? partner.desired_region_text ?? '-'}
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            STATUS_COLORS[partner.status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {STATUS_LABELS[partner.status] ?? partner.status}
        </span>
        {partner.apply_date && (
          <span className="text-[10px] text-gray-400">
            {partner.apply_date}
          </span>
        )}
      </div>
    </div>
  )
}
