import type { ReimburseClaim } from '@gict/db'

export type ClaimStatus = ReimburseClaim['status']

/**
 * How each state is written, in one place.
 *
 * The label had grown three copies across the submit, review and admin
 * handlers, which is exactly how one label ends up reading two different ways
 * in two different lists.
 *
 * The icon carries the state on its own in a long list, where reading four
 * words per row to find the one that is still pending is the slow way.
 */
export const STATUS: Record<
  ClaimStatus,
  { icon: string; label: string; told: string; button: string }
> = {
  pending: {
    icon: '🟡',
    label: 'Pending',
    told: 'is waiting on the treasurer',
    button: 'Back to pending',
  },
  submitted: {
    icon: '🔵',
    /*
     * The treasurer has sent it on for payment, wherever that is for a given
     * server. An earlier version said "Sent to the Guild", which is true of one
     * university in Queensland and meaningless everywhere else.
     */
    label: 'Submitted for payment',
    told: 'has been submitted for payment',
    button: 'Submitted',
  },
  paid: {
    icon: '🟢',
    label: 'Paid',
    told: 'has been paid',
    button: 'Paid',
  },
  rejected: {
    icon: '🔴',
    label: 'Rejected',
    told: 'was rejected',
    button: 'Reject',
  },
}

/** Icon and label together, for anywhere a claim's state is shown. */
export function statusText(status: ClaimStatus): string {
  return `${STATUS[status].icon} ${STATUS[status].label}`
}
