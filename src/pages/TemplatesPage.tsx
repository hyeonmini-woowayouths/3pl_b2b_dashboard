import { Sidebar } from '../components/layout/Sidebar'
import { ArrowLeft, Send, MessageSquare, FileSignature } from 'lucide-react'
import { Link } from 'react-router-dom'

const PROPOSAL_TEMPLATE = {
  name: '보안 제안서',
  trigger: '인바운드 단계에서 "보안 제안서 발송" 클릭',
  channel: '이메일',
  webhook: 'N8N_WEBHOOK_PROPOSAL',
  variables: ['연락처', '인증코드(자동생성)', '보안링크(자동생성)', '이메일'],
  description: '협력사 사장님에게 배민커넥트비즈 제안 정보와 보안 인증코드를 이메일로 발송합니다. 인증코드는 자동 생성되며 조회 가능 기간과 횟수가 제한됩니다.',
}

const ALIMTALK_TEMPLATES = [
  {
    code: 'BIZ_DOC_RESUBMIT',
    name: '서류 보완 요청',
    trigger: '서류 검토 단계에서 "서류 보완 알림톡" 클릭',
    channel: '카카오 알림톡',
    webhook: 'N8N_WEBHOOK_DOC_REMIND',
    schedule: '매주 월요일 일괄 발송 또는 수시',
    variables: ['수신자명', '상호명', '반려사유(자동)', '휴대폰번호'],
    messageUrl: 'https://message.baemin.in/projects/321/alimtalk-templates/detail?templateCode=BIZ_DOC_RESUBMIT',
  },
]

const SIGNOK_TEMPLATES = [
  { name: '서울A', regions: '서울 강남/서초/송파 등 주요 지역', planType: '서울A 요금제' },
  { name: '서울B&경인A', regions: '서울 기타 + 경기 주요', planType: '서울B/경인A 요금제' },
  { name: '경인B', regions: '경기 외곽 + 인천', planType: '경인B 요금제' },
  { name: '지방', regions: '부산/대구/광주/대전 등', planType: '지방 요금제' },
  { name: '창원진해A', regions: '창원시 진해구', planType: '창원진해A 요금제 (주 600건)' },
  { name: '경기과천A', regions: '경기도 과천시', planType: '경기과천A 요금제 (심야 변경)' },
  { name: '로드러너', regions: '화성시/오산시 (PPC)', planType: '로드러너 전용' },
]

const SIGNOK_VARIABLES = [
  '이메일 또는 휴대폰번호(필수)', '이름(필수)', '남길말(선택)',
  '휴대폰 인증용 실명(필수)', '휴대폰 인증용 휴대폰번호(필수)',
  '계약일자', '업체명', '업체주소', '대표자명', '계좌정보',
  '사업자번호', '이메일주소', '발주기간', '배달지역',
]

function Section({ icon: Icon, title, color, children }: {
  icon: typeof Send; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5" style={{ borderLeftWidth: 4, borderLeftColor: color }}>
        <Icon size={18} style={{ color }} />
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export function TemplatesPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
          <Link to="/" className="p-1.5 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} className="text-gray-500" /></Link>
          <h1 className="text-lg font-bold text-gray-900">템플릿 관리</h1>
          <span className="text-xs text-gray-400">보안 제안서, 알림톡, 싸인오케이 템플릿</span>
        </header>

        <div className="p-6 space-y-6 max-w-4xl">
          {/* 보안 제안서 */}
          <Section icon={Send} title="보안 제안서 템플릿" color="#3B82F6">
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">{PROPOSAL_TEMPLATE.description}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-gray-500">트리거</span>
                  <p className="text-gray-800">{PROPOSAL_TEMPLATE.trigger}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">채널</span>
                  <p className="text-gray-800">{PROPOSAL_TEMPLATE.channel}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">Webhook</span>
                  <p className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{PROPOSAL_TEMPLATE.webhook}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500">변수</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {PROPOSAL_TEMPLATE.variables.map(v => (
                      <span key={v} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* 알림톡 */}
          <Section icon={MessageSquare} title="카카오 알림톡 템플릿" color="#F59E0B">
            {ALIMTALK_TEMPLATES.map(t => (
              <div key={t.code} className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">{t.code}</span>
                  <span className="font-medium text-gray-900">{t.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-semibold text-gray-500">트리거</span>
                    <p className="text-gray-800">{t.trigger}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500">발송 주기</span>
                    <p className="text-gray-800">{t.schedule}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500">변수</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {t.variables.map(v => (
                        <span key={v} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500">메시지 플랫폼</span>
                    <a href={t.messageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline block mt-0.5">템플릿 원본 보기</a>
                  </div>
                </div>
              </div>
            ))}
          </Section>

          {/* 싸인오케이 */}
          <Section icon={FileSignature} title="싸인오케이 계약서 템플릿 (7종)" color="#8B5CF6">
            <div className="space-y-4 text-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-semibold text-gray-600">템플릿명</th>
                    <th className="text-left py-2 font-semibold text-gray-600">적용 권역</th>
                    <th className="text-left py-2 font-semibold text-gray-600">요금제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {SIGNOK_TEMPLATES.map(t => (
                    <tr key={t.name}>
                      <td className="py-2 font-medium text-violet-700">{t.name}</td>
                      <td className="py-2 text-gray-700">{t.regions}</td>
                      <td className="py-2 text-gray-500">{t.planType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div>
                <span className="text-xs font-semibold text-gray-500">발송 변수 (공통)</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {SIGNOK_VARIABLES.map(v => (
                    <span key={v} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-700 rounded">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-xs text-violet-700">
                  <strong>자동 매핑 로직:</strong> 확정 권역의 요금제 → 템플릿 자동 선택.
                  서울A 요금제 → "서울A" 템플릿, 경인B 요금제 → "경인B" 템플릿, 기타 → "지방" 템플릿.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </main>
    </div>
  )
}
