const API_BASE = 'http://localhost:3001/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error || res.statusText)
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

export function fetchKanban(search?: string): Promise<KanbanData> {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  return request(`/partners/kanban${params}`)
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

export function movePartnerStage(id: string, pipeline_stage: string, status?: string) {
  return request<{ ok: boolean }>(`/partners/${id}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({ pipeline_stage, status }),
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

// ── Zones ──

export function fetchZones(search?: string, openOnly?: boolean) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (openOnly) params.set('open_only', 'true')
  const qs = params.toString()
  return request<{ data: import('../types/partner').Zone[]; total: number }>(`/zones${qs ? `?${qs}` : ''}`)
}
