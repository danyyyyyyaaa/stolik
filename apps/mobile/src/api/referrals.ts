import { useAppStore } from '../store/useAppStore'

const base = () => process.env.EXPO_PUBLIC_API_URL || ''
const auth = () => ({ Authorization: `Bearer ${useAppStore.getState().token}` })

export interface ReferralStats {
  referralCode: string
  totalReferrals: number
  pendingReferrals: number
  completedReferrals: number
  referrals: { id: string; name: string; status: string; completedAt?: string; joinedAt: string }[]
}

export async function getReferralStats(): Promise<ReferralStats> {
  const res = await fetch(`${base()}/api/referrals/stats`, { headers: auth() as any })
  if (!res.ok) throw new Error('Failed')
  return res.json()
}
