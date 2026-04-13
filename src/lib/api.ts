const API_BASE = '/api'

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: string[]) {
    super(message)
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; errors?: string[] }
    throw new ApiError(
      err.errors ? err.errors.join('\n') : err.error || res.statusText,
      res.status,
      err.errors,
    )
  }
  return res.json() as Promise<T>
}

// ── Partners ──

export interface KanbanData {
  [stage: string]: {
    count: number
    partners: import('../types/partner').Partner[]
  }
}

export interface KanbanFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  contractType?: string
  statuses?: string[]
  sortBy?: string
}

export function fetchKanban(filters?: KanbanFilters): Promise<KanbanData> {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.dateFrom) params.set('date_from', filters.dateFrom)
  if (filters?.dateTo) params.set('date_to', filters.dateTo)
  if (filters?.contractType && filters.contractType !== 'all') params.set('contract_type', filters.contractType)
  if (filters?.statuses?.length) params.set('statuses', filters.statuses.join(','))
  if (filters?.sortBy) params.set('sort_by', filters.sortBy)
  const qs = params.toString()
  return request(`/partners/kanban${qs ? `?${qs}` : ''}`)
}

export function fetchPartnerDetail(id: string) {
  return request<{
    partner: import('../types/partner').Partner
    documents: import('../types/partner').PartnerDocument[]
    contracts: import('../types/partner').Contract[]
    bankAccounts: { id: string; bank_name: string; account_number: string; account_holder: string }[]
    insurance: { id: string; policy_number: string; start_date: string; end_date: string; status: string }[]
    notes: { id: string; note_type: string; content: string; author_name: string; created_at: string }[]
    statusHistory: { id: string; from_stage: string; from_status: string; to_stage: string; to_status: string; created_at: string }[]
  }>(`/partners/${id}`)
}

export function movePartnerStage(id: string, pipeline_stage: string, status?: string, reason?: string) {
  return request<{ ok: boolean; errors?: string[] }>(`/partners/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ pipeline_stage, status, reason }),
  })
}

export function updatePartner(id: string, data: Record<string, unknown>) {
  return request<{ ok: boolean }>(`/partners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function fetchStats() {
  return request<{
    stageCounts: { pipeline_stage: string; count: number }[]
    recentWeekInbound: number
    contractTypeBreakdown: { contract_type: string; count: number }[]
  }>('/partners/stats/summary')
}

export function updateDocument(partnerId: string, doc_type: string, status: string, rejection_reason?: string) {
  return request<{ ok: boolean }>(`/partners/${partnerId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ doc_type, status, rejection_reason }),
  })
}

export function addNote(partnerId: string, content: string, note_type?: string) {
  return request<{ ok: boolean }>(`/partners/${partnerId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ content, note_type }),
  })
}

// ── Integrations ──

export function triggerProposal(partnerId: string) {
  return request<{ ok: boolean; dryRun: boolean }>('/integrations/proposal', {
    method: 'POST', body: JSON.stringify({ partnerId }),
  })
}

export function triggerDocRemind(partnerId: string) {
  return request<{ ok: boolean; dryRun: boolean; docsReminded: number }>('/integrations/doc-remind', {
    method: 'POST', body: JSON.stringify({ partnerId }),
  })
}

export function triggerDriveFolder(partnerId: string) {
  return request<{ ok: boolean; dryRun: boolean }>('/integrations/drive-folder', {
    method: 'POST', body: JSON.stringify({ partnerId }),
  })
}

export function triggerContractSend(partnerId: string) {
  return request<{ ok: boolean; dryRun: boolean; template: string; documentId?: string }>('/integrations/contract-send', {
    method: 'POST', body: JSON.stringify({ partnerId }),
  })
}

export function triggerSlackNotify(event: string, partnerId: string, companyName: string, details: string) {
  return request<{ ok: boolean; dryRun: boolean }>('/integrations/slack-notify', {
    method: 'POST', body: JSON.stringify({ event, partnerId, companyName, details }),
  })
}

// ── Zones ──

export function fetchZones(search?: string, openOnly?: boolean) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (openOnly) params.set('open_only', 'true')
  const qs = params.toString()
  return request<{ data: import('../types/partner').Zone[]; total: number }>(`/zones${qs ? `?${qs}` : ''}`)
}
