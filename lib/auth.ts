import { auth } from '@clerk/nextjs/server'
import { createHash } from 'crypto'

export function getUuidFromClerkId(clerkId: string): string {
  const hash = createHash('sha256').update(clerkId).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

export async function getUser() {
  const { userId } = await auth()
  if (!userId) return null

  return {
    id: getUuidFromClerkId(userId)
  }
}
