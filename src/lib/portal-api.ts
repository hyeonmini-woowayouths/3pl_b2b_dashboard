const BASE = '/api/portal'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  const data = await res.json().catch(() => ({})) as { error?: string }
  if (!res.ok) throw new Error(data.error ?? res.statusText)
  return data as T
}

export interface LookupResult {
  type: 'new' | 'in_progress' | 'operating' | 'reapplication'
  partner: {
    id: string
    company_name: string
    pipeline_stage: string
    status: string
    applicant_name: string | null
    dp_code: string | null
  } | null
  history?: number
}

export const portalApi = {
  lookup: (business_number: string, phone: string) =>
    req<LookupResult>('/lookup', { method: 'POST', body: JSON.stringify({ business_number, phone }) }),

  sendOtp: (partner_id: string, business_number: string, phone: string) =>
    req<{ ok: boolean; dryRun: boolean; devCode?: string }>('/otp/send', { method: 'POST', body: JSON.stringify({ partner_id, business_number, phone }) }),

  verifyOtp: (business_number: string, phone: string, code: string) =>
    req<{ ok: boolean }>('/otp/verify', { method: 'POST', body: JSON.stringify({ business_number, phone, code }) }),

  apply: (data: Record<string, unknown>) =>
    req<{ ok: boolean; id: string }>('/apply', { method: 'POST', body: JSON.stringify(data) }),

  me: () => req<{
    partner: Record<string, unknown>
    documents: Array<{ doc_type: string; status: string; rejection_reason: string | null; reviewed_at: string | null }>
    history: Array<{ from_stage: string | null; to_stage: string; to_status: string; reason: string | null; created_at: string }>
    proposalCode: { hasActive: boolean; viewsLeft: number } | null
    zoneRequest: Array<{ id: string; request_type: string; status: string; to_zone_code: string | null; created_at: string; decision_reason: string | null }>
    contracts: Array<{ id: string; template_type: string | null; signok_status: string | null; sent_date: string | null; signed_date: string | null }>
  }>('/me'),

  logout: () => req<{ ok: boolean }>('/logout', { method: 'POST' }),

  uploadDocument: (docType: string, file_url: string, file_name: string) =>
    req<{ ok: boolean }>(`/documents/${docType}`, { method: 'POST', body: JSON.stringify({ file_url, file_name }) }),

  viewProposal: (code: string) =>
    req<{ ok: boolean; viewsLeft: number; candidates: Array<{ id: string; zone_code: string; rgn1: string; rgn2: string; region_class: string; pricing_plan: string }>; terms: Record<string, unknown> }>('/proposal/view', { method: 'POST', body: JSON.stringify({ code }) }),

  selectZone: (zone_id: string, reason?: string) =>
    req<{ ok: boolean; message: string }>('/zone/select', { method: 'POST', body: JSON.stringify({ zone_id, reason }) }),

  requestSetChange: (requested_sets: number, effective_week?: string, reason?: string) =>
    req<{ ok: boolean }>('/set/request', { method: 'POST', body: JSON.stringify({ requested_sets, effective_week, reason }) }),

  requestInfoChange: (field_type: string, new_value: string, reason?: string) =>
    req<{ ok: boolean }>('/info/request', { method: 'POST', body: JSON.stringify({ field_type, new_value, reason }) }),
}
