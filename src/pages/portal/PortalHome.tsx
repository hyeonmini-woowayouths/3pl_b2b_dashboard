import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { PortalLayout } from './PortalLayout'
import { portalApi } from '../../lib/portal-api'
import type { LookupResult } from '../../lib/portal-api'
import { formatBizNum, formatPhone } from '../../lib/format'

type Step = 'lookup' | 'otp' | 'new'

export function PortalHome() {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>('lookup')
  const [bizNum, setBizNum] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const r = await portalApi.lookup(bizNum, phone)
      setLookup(r)
      if (r.type === 'new' || !r.partner) {
        setStep('new')
      } else {
        setStep('otp')
        // 자동 OTP 발송
        const otp = await portalApi.sendOtp(r.partner.id, bizNum, phone)
        setOtpSent(true)
        if (otp.devCode) setDevCode(otp.devCode)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await portalApi.verifyOtp(bizNum, phone, otpCode)
      nav('/portal/my')
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!lookup?.partner) return
    setError(null)
    try {
      const r = await portalApi.sendOtp(lookup.partner.id, bizNum, phone)
      if (r.devCode) setDevCode(r.devCode)
      setOtpSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '재발송 실패')
    }
  }

  if (step === 'lookup') {
    return (
      <PortalLayout>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
              <Shield className="text-emerald-600" size={22} />
            </div>
            <h1 className="text-lg font-bold text-gray-900">본인 확인</h1>
            <p className="text-xs text-gray-500 mt-1">사업자번호와 휴대폰 번호로 조회합니다</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">사업자등록번호</label>
              <input
                type="text"
                inputMode="numeric"
                value={bizNum}
                onChange={(e) => setBizNum(formatBizNum(e.target.value))}
                required
                placeholder="000-00-00000"
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">휴대폰 번호</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? '조회 중...' : <>다음 <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 mb-2">처음 신청하시나요?</p>
            <Link to="/portal/apply" className="inline-flex items-center gap-1 text-sm text-emerald-600 font-semibold hover:text-emerald-700">
              신규 협력사 신청하기 <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-4 px-4 text-xs text-gray-400 text-center">
          본인 확인 후 안내에 따라 서류 제출 및 권역 선택이 가능합니다
        </div>
      </PortalLayout>
    )
  }

  if (step === 'new' && lookup?.type === 'new') {
    return (
      <PortalLayout>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
          <CheckCircle className="mx-auto text-sky-500 mb-3" size={36} />
          <h2 className="text-base font-bold text-gray-900 mb-2">신규 신청 대상</h2>
          <p className="text-sm text-gray-600 mb-5">
            입력하신 사업자번호는 등록되어 있지 않습니다.<br />
            신규 협력사 신청을 진행해주세요.
          </p>
          <button
            onClick={() => nav('/portal/apply', { state: { bizNum, phone } })}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
          >
            신규 신청 계속하기
          </button>
          <button
            onClick={() => setStep('lookup')}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            다시 조회
          </button>
        </div>
      </PortalLayout>
    )
  }

  // OTP 단계
  return (
    <PortalLayout>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
            <Shield className="text-emerald-600" size={22} />
          </div>
          <h1 className="text-lg font-bold text-gray-900">인증코드 확인</h1>
          <p className="text-xs text-gray-500 mt-1">
            {phone}로 발송된 6자리 코드를 입력하세요
          </p>
        </div>

        {lookup?.partner && (
          <div className="mb-5 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-xs text-emerald-700">
              <div className="font-semibold">{lookup.partner.company_name}</div>
              <div className="text-[11px] mt-0.5">
                현재 상태: {lookup.partner.pipeline_stage} / {lookup.partner.status}
                {lookup.type === 'operating' && <span className="ml-1 font-bold">✅ 운영 중</span>}
                {lookup.type === 'reapplication' && <span className="ml-1 font-bold text-sky-600">↻ 재신청 가능</span>}
              </div>
            </div>
          </div>
        )}

        {devCode && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            <strong>개발 모드:</strong> 인증코드 <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded">{devCode}</code>
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
            required
            placeholder="6자리 숫자"
            autoFocus
            className="w-full px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? '확인 중...' : '인증 완료'}
          </button>
        </form>

        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setStep('lookup')}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← 다시 조회
          </button>
          <button
            onClick={handleResend}
            disabled={!otpSent}
            className="text-xs text-emerald-600 hover:text-emerald-700"
          >
            코드 재발송
          </button>
        </div>
      </div>
    </PortalLayout>
  )
}
