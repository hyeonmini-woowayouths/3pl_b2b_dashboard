import { useEffect, useState } from 'react'
import { Sidebar } from '../components/layout/Sidebar'
import { BarChart3, TrendingUp, Users, Clock, MapPin, ArrowLeft } from 'lucide-react'
import { fetchStats } from '../lib/api'
import { Link } from 'react-router-dom'

interface Stats {
  stageCounts: { pipeline_stage: string; count: number }[]
  recentWeekInbound: number
  contractTypeBreakdown: { contract_type: string; count: number }[]
  weeklyTrend: { week: string; count: number }[]
  avgDays: { pipeline_stage: string; avg_days: number }[]
  statusBreakdown: { status: string; count: number }[]
  zoneBreakdown: { zone_code: string; region_class: string; count: number }[]
}

const STAGE_LABELS: Record<string, string> = {
  inbound: '인바운드', doc_review: '서류 검토', contracting: '계약 진행',
  operating: '운영중', terminated: '종료',
}

const STAGE_COLORS: Record<string, string> = {
  inbound: '#3B82F6', doc_review: '#F59E0B', contracting: '#8B5CF6',
  operating: '#10B981', terminated: '#6B7280',
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof BarChart3; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon size={20} style={{ color }} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function BarDisplay({ items, maxVal }: { items: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-24 truncate text-right">{item.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max((item.value / maxVal) * 100, 2)}%`, backgroundColor: item.color }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-12 text-right">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats().then((d) => { setStats(d as unknown as Stats); setLoading(false) })
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-400">데이터를 불러오는 중...</div>
      </div>
    )
  }

  const totalPartners = stats.stageCounts.reduce((a, b) => a + b.count, 0)
  const activePartners = stats.stageCounts.filter(s => s.pipeline_stage !== 'terminated').reduce((a, b) => a + b.count, 0)
  const operatingCount = stats.stageCounts.find(s => s.pipeline_stage === 'operating')?.count ?? 0
  const maxStageCount = Math.max(...stats.stageCounts.map(s => s.count))
  const maxWeekly = Math.max(...stats.weeklyTrend.map(w => w.count), 1)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} className="text-gray-500" /></Link>
            <h1 className="text-lg font-bold text-gray-900">통계 & 리포트</h1>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={Users} label="전체 협력사" value={totalPartners} sub={`활성 ${activePartners}`} color="#3B82F6" />
            <StatCard icon={TrendingUp} label="최근 7일 인바운드" value={stats.recentWeekInbound} color="#10B981" />
            <StatCard icon={BarChart3} label="운영중 협력사" value={operatingCount} color="#8B5CF6" />
            <StatCard icon={Clock} label="직계약 / 중개사" value={stats.contractTypeBreakdown.map(c => `${c.contract_type === 'direct' ? '직' : '중'}${c.count}`).join(' / ')} color="#F59E0B" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* 파이프라인 단계별 분포 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">파이프라인 단계별 분포</h3>
              <BarDisplay
                items={stats.stageCounts.map(s => ({
                  label: STAGE_LABELS[s.pipeline_stage] ?? s.pipeline_stage,
                  value: s.count,
                  color: STAGE_COLORS[s.pipeline_stage] ?? '#6B7280',
                }))}
                maxVal={maxStageCount}
              />
            </div>

            {/* 주간 인바운드 추이 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">주간 인바운드 추이 (최근 12주)</h3>
              <div className="flex items-end gap-1 h-32">
                {stats.weeklyTrend.map((w) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-500">{w.count}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t transition-all duration-300"
                      style={{ height: `${(w.count / maxWeekly) * 100}%`, minHeight: '2px' }}
                    />
                    <span className="text-[8px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">{w.week.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 평균 소요일 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">단계별 평균 소요일 (신청→현재)</h3>
              <BarDisplay
                items={stats.avgDays.filter(a => a.avg_days > 0).map(a => ({
                  label: STAGE_LABELS[a.pipeline_stage] ?? a.pipeline_stage,
                  value: a.avg_days,
                  color: STAGE_COLORS[a.pipeline_stage] ?? '#6B7280',
                }))}
                maxVal={Math.max(...stats.avgDays.map(a => a.avg_days), 1)}
              />
            </div>

            {/* 권역별 분포 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">
                <MapPin size={14} className="inline mr-1" />권역별 분포 (Top 15)
              </h3>
              <BarDisplay
                items={stats.zoneBreakdown.map(z => ({
                  label: z.zone_code.replace('표준', ''),
                  value: z.count,
                  color: z.region_class === '집중' ? '#EF4444' : z.region_class === '관찰' ? '#F59E0B' : '#10B981',
                }))}
                maxVal={Math.max(...stats.zoneBreakdown.map(z => z.count), 1)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
