/**
 * Reading bank details out of a modal.
 *
 * Deliberately loose about format and strict about shape. The bot serves any
 * server, and a BSB, a sort code and a routing number are all just "the code
 * that identifies the bank" — validating six digits would work in Australia and
 * lock everybody else out.
 *
 * What it does enforce is that the value survives being typed by a person:
 * spaces and dashes are stripped, because somebody will write 123-456 and
 * somebody else 123 456, and those must land in the database identically or a
 * treasurer comparing two claims sees a difference that is not there.
 */

export type BankDetails = { accountName: string; bankCode: string; accountNumber: string }
export type PayeeResult = { ok: true; details: BankDetails } | { ok: false; error: string }

/** Digits only, once the punctuation people type is taken out. */
function digits(value: string): string {
  return value.replace(/[\s-]/g, '')
}

export function parsePayee(
  accountName: string,
  bankCode: string,
  accountNumber: string,
): PayeeResult {
  const name = accountName.trim().replace(/\s+/g, ' ')
  if (name.length < 2) return { ok: false, error: 'Give the name on the account.' }
  if (name.length > 120) return { ok: false, error: 'That account name is too long.' }

  const code = digits(bankCode)
  if (!/^\d{4,11}$/.test(code)) {
    return {
      ok: false,
      error: 'The BSB should be digits, like 123-456. Check it and try again.',
    }
  }

  const account = digits(accountNumber)
  if (!/^\d{4,20}$/.test(account)) {
    return {
      ok: false,
      error: 'The account number should be between 4 and 20 digits.',
    }
  }

  return { ok: true, details: { accountName: name, bankCode: code, accountNumber: account } }
}

/**
 * Show an account number with most of it hidden.
 *
 * Claims are posted into a channel a whole committee can read, and the treasurer
 * paying it already has the full number in the payment run. The last three
 * digits are enough to tell two of somebody's accounts apart, which is the only
 * thing anyone needs to do by eye.
 */
export function maskAccount(accountNumber: string): string {
  if (accountNumber.length <= 3) return '•'.repeat(accountNumber.length)
  return `${'•'.repeat(accountNumber.length - 3)}${accountNumber.slice(-3)}`
}

/** BSBs are read in two halves, so show them that way. */
export function formatBankCode(bankCode: string): string {
  return bankCode.length === 6 ? `${bankCode.slice(0, 3)}-${bankCode.slice(3)}` : bankCode
}
