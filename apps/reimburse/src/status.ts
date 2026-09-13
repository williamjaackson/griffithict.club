import type { ReimburseClaim } from '@gict/db'

export type ClaimStatus = ReimburseClaim['status']

/**
 * How each state is written, in one place.
 *
 * The label had grown three copies across the submit, review and admin
 * handlers, which is exactly how "Sent to the Guild" ends up reading as
 * "Submitted" in one list and not another.
 *
 * The icon carries the state on its own in a long list, where reading four
 * words per row to find the one that is still pending is the slow way.
 */
export const STATUS: Record<ClaimStatus, { icon: string; label: string; told: string }> = {
  pending: {
    icon: '🟡',
    label: 'Pending',
    told: 'is waiting on the treasurer',
  },
  submitted: {
    icon: '🔵',
    // Not "Submitted": the club does not hold its own money, so this means the
    // treasurer has passed it up, not that the member has filed it.
    label: 'Sent to the Guild',
    told: 'has gone to the Guild',
  },
  paid: {
    icon: '🟢',
    label: 'Paid',
    told: 'has been paid',
  },
  rejected: {
    icon: '🔴',
    label: 'Rejected',
    told: 'was rejected',
  },
}

/** Icon and label together, for anywhere a claim's state is shown. */
export function statusText(status: ClaimStatus): string {
  return `${STATUS[status].icon} ${STATUS[status].label}`
}
