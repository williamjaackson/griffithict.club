import { SlashCommandBuilder } from 'discord.js'

/**
 * One command. No subcommands, no options, no permission gate.
 *
 * It opens a dashboard, and everything else is a button on it. That is fewer
 * things to remember than a verb per action, and it is the only arrangement
 * where somebody who has never used the bot can find out what it does: a member
 * had no way of guessing that `/reimbursements bank` existed.
 *
 * Ungated because the dashboard shows each person only what is theirs. The
 * committee's buttons appear for the committee and nobody else.
 */
export const reimbursementCommand = new SlashCommandBuilder()
  .setName('reimbursement')
  .setDescription('Claim money back, and see where your claims are up to')
  .setDMPermission(false)

export const commands = [reimbursementCommand]
