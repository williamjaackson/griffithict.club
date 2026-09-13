import { ChannelType, SlashCommandBuilder } from 'discord.js'

/**
 * The claim form, and nothing else.
 *
 * Deliberately has no subcommands. A command that has them cannot be run bare,
 * and Discord would make somebody pick from a list before they could type an
 * amount. Everything a treasurer does lives on buttons attached to the claim or
 * under /reimbursements, so the thing most people do stays one word.
 *
 * No permission gate: anybody who spent club money can claim it back.
 */
export const claimCommand = new SlashCommandBuilder()
  .setName('reimbursement')
  .setDescription('Claim money back for something you bought for the club')
  .setDMPermission(false)

/*
 * Not gated at the Discord level, because `bank` and `mine` belong to everyone
 * while `setup` and `list` do not. A single permission on the command would
 * either hide somebody's own bank details from them or show the whole claim
 * list to the server. The checks live in the handler instead.
 */
export const adminCommand = new SlashCommandBuilder()
  .setName('reimbursements')
  .setDescription('Reimbursement claims and your bank details')
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub.setName('bank').setDescription('Set or change where your reimbursements are paid'),
  )
  .addSubcommand((sub) =>
    sub
      .setName('setup')
      .setDescription('Choose where claims are posted and who can act on them')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription("Where claims go. Make it private: these are people's finances.")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addRoleOption((option) =>
        option
          .setName('treasurer')
          .setDescription('The role allowed to move claims along')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('currency')
          .setDescription('ISO code. Defaults to AUD.')
          .setMinLength(3)
          .setMaxLength(3),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('Claims in this server')
      .addStringOption((option) =>
        option
          .setName('status')
          .setDescription('Only claims in this state')
          .addChoices(
            { name: 'Pending', value: 'pending' },
            { name: 'Submitted for payment', value: 'submitted' },
            { name: 'Paid', value: 'paid' },
            { name: 'Rejected', value: 'rejected' },
          ),
      ),
  )
  .addSubcommand((sub) => sub.setName('mine').setDescription('Your own claims'))

export const commands = [claimCommand, adminCommand]
