import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'

/**
 * One top-level command with subcommands, rather than half a dozen verbs in
 * every server's command list.
 *
 * Gated to Manage Server. That is the same permission the bot needs to read
 * invites at all, so anyone who could meaningfully configure this already has
 * it. A server that wants the leaderboard open to everyone can loosen it under
 * Server Settings → Integrations without a code change.
 */
export const funnelCommand = new SlashCommandBuilder()
  .setName('funnel')
  .setDescription('Invite tracking and join attribution')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('setup')
      .setDescription('Choose where join notices get posted')
      .addChannelOption((option) =>
        option
          .setName('channel')
          .setDescription('Leave empty to stop posting and track silently')
          .addChannelTypes(ChannelType.GuildText),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Who has brought in the most members')
      .addIntegerOption((option) =>
        option
          .setName('days')
          .setDescription('How far back to count. Defaults to 30.')
          .setMinValue(1)
          .setMaxValue(365),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('sources')
      .setDescription('Where members came from, by tagged source')
      .addIntegerOption((option) =>
        option
          .setName('days')
          .setDescription('How far back to count. Defaults to 30.')
          .setMinValue(1)
          .setMaxValue(365),
      ),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('source')
      .setDescription('Label invites with where they were published')
      .addSubcommand((sub) =>
        sub
          .setName('set')
          .setDescription('Tag an invite with the place it was published')
          .addStringOption((option) =>
            option
              .setName('invite')
              .setDescription('The invite code, or the whole link')
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Website, Campus Groups, Handbook, a poster…')
              .setRequired(true)
              .setMaxLength(60),
          ),
      )
      .addSubcommand((sub) =>
        sub
          .setName('unset')
          .setDescription("Remove an invite's source label")
          .addStringOption((option) =>
            option
              .setName('invite')
              .setDescription('The invite code, or the whole link')
              .setRequired(true),
          ),
      )
      .addSubcommand((sub) =>
        sub.setName('list').setDescription('Every invite and what it is tagged as'),
      ),
  )

export const commands = [funnelCommand]
