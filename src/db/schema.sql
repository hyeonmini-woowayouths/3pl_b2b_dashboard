-- 3PL 협력사 온보딩 대시보드 DB Schema v1
-- SQLite (better-sqlite3) — 로컬 개발용, 추후 PostgreSQL 전환

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================================
-- 1. zones (권역 마스터)
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  zone_code TEXT NOT NULL UNIQUE,
  rgn1 TEXT NOT NULL,
  rgn2 TEXT NOT NULL,
  region_class TEXT CHECK(region_class IN ('집중','관찰','안정')) NOT NULL DEFAULT '관찰',
  pricing_plan TEXT,
  set_tracker_available INTEGER NOT NULL DEFAULT 1,
  is_open INTEGER NOT NULL DEFAULT 1,
  platform TEXT NOT NULL DEFAULT '배민커넥트비즈',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. users (운영 담당자)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator','viewer')),
  team TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 3. brokers (중개사 — 확장용)
-- ============================================================
CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  service_name TEXT,
  corporate_name TEXT,
  business_number TEXT UNIQUE,
  report_subject TEXT,
  contract_status TEXT NOT NULL DEFAULT 'active' CHECK(contract_status IN ('active','terminated')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 4. partners (핵심 엔티티)
-- ============================================================
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contract_type TEXT NOT NULL DEFAULT 'direct' CHECK(contract_type IN ('direct','broker')),
  pipeline_stage TEXT NOT NULL DEFAULT 'inbound',
  status TEXT NOT NULL DEFAULT 'submitted',

  -- 신청 정보
  apply_date TEXT,
  company_name TEXT NOT NULL,
  applicant_name TEXT,
  representative_name TEXT,
  email TEXT,
  phone TEXT,
  representative_phone TEXT,

  -- 사업자 정보
  business_type TEXT,
  business_number TEXT,
  business_open_date TEXT,
  business_category TEXT,
  business_item TEXT,
  business_address TEXT,
  representative_birth TEXT,

  -- 권역
  desired_region_text TEXT,
  confirmed_zone_id TEXT REFERENCES zones(id),
  pricing_plan TEXT,
  contract_template TEXT,

  -- 지원 이력
  experience_years TEXT,
  rider_count TEXT,
  currently_operating TEXT,
  platform_experience TEXT,
  has_office TEXT,
  operating_region TEXT,
  comment TEXT,

  -- 운영 정보
  dp_code TEXT,
  biz_id TEXT,
  biz_member_name TEXT,
  sap_code TEXT,
  operating_start_date TEXT,
  first_delivery_date TEXT,
  drive_folder_link TEXT,

  -- 중개사 확장
  broker_id TEXT REFERENCES brokers(id),

  -- 담당
  assigned_team TEXT,
  assigned_user_id TEXT REFERENCES users(id),

  -- 인바운드 추가 필드
  phone_validation_result TEXT,
  doc_review_result TEXT,
  drop_reason TEXT,
  proposal_sent TEXT,
  proposal_date TEXT,
  call_status TEXT,
  call_result TEXT,
  lms_sent TEXT,
  contract_progress TEXT,

  -- 유선 상담 기록 (P0-3)
  consultation_date TEXT,
  consultation_duration INTEGER, -- minutes
  consultation_result TEXT,
  consultation_memo TEXT,

  -- 메타
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_partners_stage_status ON partners(pipeline_stage, status);
CREATE INDEX IF NOT EXISTS idx_partners_business_number ON partners(business_number);
CREATE INDEX IF NOT EXISTS idx_partners_contract_type ON partners(contract_type);
CREATE INDEX IF NOT EXISTS idx_partners_zone ON partners(confirmed_zone_id);
CREATE INDEX IF NOT EXISTS idx_partners_dp_code ON partners(dp_code);
CREATE INDEX IF NOT EXISTS idx_partners_created ON partners(created_at DESC);

-- ============================================================
-- 5. partner_documents (서류)
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  doc_type TEXT NOT NULL CHECK(doc_type IN ('business_cert','bank_statement','id_card','biz_signup','unipost','tax_cert')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','approved','rejected')),
  file_url TEXT,
  drive_url TEXT,
  drive_file_name TEXT,
  rejection_reason TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_docs_partner ON partner_documents(partner_id, doc_type);

-- ============================================================
-- 6. partner_status_logs (상태 전이 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_status_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  from_stage TEXT,
  from_status TEXT,
  to_stage TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by TEXT REFERENCES users(id),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_status_logs_partner ON partner_status_logs(partner_id, created_at DESC);

-- ============================================================
-- 7. contracts (계약)
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  template_type TEXT,
  signok_status TEXT,
  signok_doc_id TEXT,
  sent_date TEXT,
  sign_deadline TEXT,
  signed_date TEXT,
  contract_start_date TEXT,
  contract_end_date TEXT,
  delivery_region TEXT,
  order_period TEXT,
  remind_lms_sent INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_partner ON contracts(partner_id);

-- ============================================================
-- 8. bank_accounts (계좌)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 9. insurance_records (보증보험)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_records (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  policy_number TEXT,
  insurer TEXT DEFAULT 'SGI',
  coverage_amount INTEGER DEFAULT 10000000,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('active','expired','pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 10. partner_notes (메모)
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  partner_id TEXT NOT NULL REFERENCES partners(id),
  note_type TEXT NOT NULL DEFAULT 'general' CHECK(note_type IN ('consultation','rejection','general','reminder')),
  content TEXT NOT NULL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 11. activity_logs (감사 로그)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changes TEXT, -- JSON
  performed_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id, created_at DESC);
