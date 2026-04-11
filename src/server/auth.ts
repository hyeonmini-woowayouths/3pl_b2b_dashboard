/**
 * F-18: 인증/인가 미들웨어
 * Security 리뷰 SEC-001~004 대응
 *
 * 개발 모드: X-Dev-User 헤더로 간이 인증
 * 운영 모드: JWT Bearer Token (사내 IAM 연동)
 *
 * RBAC: admin > operator > viewer
 */
import { Context, Next } from 'hono'
import { getDb } from './db'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
  team: string | null
}

const DEV_MODE = process.env.AUTH_MODE !== 'production'

/**
 * 인증 미들웨어 — 모든 /api/* 라우트에 적용
 */
export async function authMiddleware(c: Context, next: Next) {
  // 공개 엔드포인트는 인증 생략
  const path = c.req.path
  if (path === '/api/health' || path.startsWith('/api/partners/apply')) {
    return next()
  }

  if (DEV_MODE) {
    // 개발 모드: X-Dev-User 헤더 또는 기본 운영자
    const devUser = c.req.header('X-Dev-User')
    const user: AuthUser = devUser
      ? JSON.parse(devUser)
      : { id: 'dev-operator', name: '개발자', email: 'dev@test.com', role: 'operator', team: '지원파트' }
    c.set('user', user)
    return next()
  }

  // 운영 모드: JWT
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    // TODO: JWT 검증 (사내 IAM 공개키로 검증)
    // const payload = verifyJwt(token, IAM_PUBLIC_KEY)
    // 임시: DB에서 사용자 조회
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(token) as AuthUser | undefined
    if (!user) return c.json({ error: 'Invalid token' }, 401)
    c.set('user', user)
    return next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

/**
 * 역할 기반 인가 체크
 */
export function requireRole(...roles: AuthUser['role'][]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined
    if (!user) return c.json({ error: 'Authentication required' }, 401)
    if (!roles.includes(user.role)) {
      return c.json({ error: `Requires role: ${roles.join(' or ')}` }, 403)
    }
    return next()
  }
}

/**
 * SEC-002: 민감 필드 마스킹
 * viewer 역할은 계좌번호, 생년월일, 연락처가 마스킹됨
 */
export function maskSensitiveFields(data: Record<string, unknown>, userRole: AuthUser['role']): Record<string, unknown> {
  if (userRole === 'admin') return data

  const masked = { ...data }

  // 계좌번호: ****1234
  if (typeof masked.account_number === 'string' && masked.account_number.length > 4) {
    masked.account_number = '****' + masked.account_number.slice(-4)
  }

  // 생년월일: 완전 마스킹
  if (userRole === 'viewer') {
    masked.representative_birth = '****-**-**'
    if (typeof masked.phone === 'string' && masked.phone.length > 4) {
      masked.phone = masked.phone.slice(0, 3) + '-****-' + masked.phone.slice(-4)
    }
    if (typeof masked.representative_phone === 'string' && masked.representative_phone.length > 4) {
      masked.representative_phone = masked.representative_phone.slice(0, 3) + '-****-' + masked.representative_phone.slice(-4)
    }
    if (typeof masked.business_number === 'string' && masked.business_number.length > 4) {
      masked.business_number = '***-**-' + masked.business_number.slice(-5)
    }
  }

  return masked
}
