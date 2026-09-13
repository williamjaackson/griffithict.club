import { SlashCommandBuilder } from 'discord.js'

/**
 * Two commands, split by what somebody came to do.
 *
 * Claiming is the common act and belongs behind one word with nothing in the
 * way, so /reimbursement opens the form directly. Everything else — chasing
 * what is outstanding, moving claims on, exports, setup — is a different job
 * done at a different time, and lives in one screen behind /reimbursements.
 *
 * Neither is gated. The console shows each person what is theirs, and the
 * committee's controls render only for the committee.
 */
export const claimCommand = new SlashCommandBuilder()
  .setName('reimbursement')
  .setDescription('Claim money back for something you bought')
  .setDMPermission(false)

export const consoleCommand = new SlashCommandBuilder()
  .setName('reimbursements')
  .setDescription('See and manage claims')
  .setDMPermission(false)

export const commands = [claimCommand, consoleCommand]
