export type ContractType = 'direct' | 'broker';

export type PipelineStage =
  | 'inbound'
  | 'doc_review'
  | 'contracting'
  | 'operating'
  | 'terminated';

export type PartnerStatus =
  // inbound
  | 'submitted'
  | 'validating'
  | 'validation_failed'
  | 'proposal_sent'
  | 'consulting'
  | 'dropped'
  // doc_review
  | 'docs_pending'
  | 'docs_submitted'
  | 'docs_rejected'
  | 'docs_approved'
  | 'zone_confirmed'
  // contracting
  | 'contract_sending'
  | 'contract_sent'
  | 'contract_signed'
  | 'brms_registering'
  | 'brms_registered'
  // operating
  | 'preparing'
  | 'active'
  | 'suspended'
  // terminated
  | 'contract_ended'
  | 'contract_terminated';

export type BusinessType = '일반과세' | '간이과세' | '법인' | '면세';

export type DocType =
  | 'business_cert'
  | 'bank_statement'
  | 'id_card'
  | 'biz_signup'
  | 'unipost'
  | 'tax_cert';

export type DocStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface Partner {
  id: string;
  contract_type: ContractType;
  pipeline_stage: PipelineStage;
  status: PartnerStatus;

  // 신청 정보
  apply_date: string | null;
  company_name: string;
  applicant_name: string | null;
  representative_name: string | null;
  email: string | null;
  phone: string | null;
  representative_phone: string | null;

  // 사업자 정보
  business_type: BusinessType | null;
  business_number: string | null;
  business_open_date: string | null;
  business_category: string | null;
  business_item: string | null;
  business_address: string | null;

  // 권역
  desired_region_text: string | null;
  confirmed_zone_id: string | null;
  confirmed_zone_code: string | null; // JOIN 결과
  pricing_plan: string | null;
  contract_template: string | null;

  // 지원 이력
  experience_years: string | null;
  rider_count: string | null;
  platform_experience: string | null;

  // 운영 정보
  dp_code: string | null;
  biz_id: string | null;
  sap_code: string | null;
  operating_start_date: string | null;

  // 메타
  assigned_team: string | null;
  assigned_user_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerDocument {
  id: string;
  partner_id: string;
  doc_type: DocType;
  status: DocStatus;
  file_url: string | null;
  drive_url: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
}

export interface Contract {
  id: string;
  partner_id: string;
  template_type: string | null;
  signok_status: string | null;
  sent_date: string | null;
  signed_date: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  delivery_region: string | null;
}

export interface Zone {
  id: string;
  zone_code: string;
  rgn1: string;
  rgn2: string;
  region_class: '집중' | '관찰' | '안정';
  pricing_plan: string | null;
  set_tracker_available: boolean;
  is_open: boolean;
}

// 칸반 보드에서 사용하는 단계 정의
export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'inbound', label: '인바운드 접수', color: '#3B82F6' },
  { key: 'doc_review', label: '서류 검토', color: '#F59E0B' },
  { key: 'contracting', label: '계약 진행', color: '#8B5CF6' },
  { key: 'operating', label: '운영중', color: '#10B981' },
];

export const STATUS_LABELS: Record<PartnerStatus, string> = {
  submitted: '신청 접수',
  validating: '검증 중',
  validation_failed: '검증 실패',
  proposal_sent: '제안서 발송',
  consulting: '유선 상담 중',
  dropped: '드랍',
  docs_pending: '서류 대기',
  docs_submitted: '서류 검토 중',
  docs_rejected: '서류 반려',
  docs_approved: '서류 통과',
  zone_confirmed: '권역 확정',
  contract_sending: '계약서 발송 중',
  contract_sent: '서명 대기',
  contract_signed: '계약 체결',
  brms_registering: 'BRMS 등록 중',
  brms_registered: 'BRMS 완료',
  preparing: '준비중',
  active: '운영중',
  suspended: '운영중지',
  contract_ended: '계약 종료',
  contract_terminated: '계약 해지',
};
