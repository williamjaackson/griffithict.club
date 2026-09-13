import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type SlashCommandBooleanOption,
} from 'discord.js'

/**
 * One top-level command with subcommands, rather than half a dozen verbs in
 * every server's command list.
 *
 * Gated to Manage Server. That is the same permission the bot needs to read
 * invites at all, so anyone who could meaningfully configure this already has
 * it. A server that wants the leaderboard open to everyone can loosen it under
 * Server Settings → Integrations without a code change.
 */
/**
 * Replies are private unless asked for otherwise.
 *
 * The whole command is Manage Server gated, so a public reply puts committee
 * analytics in front of people who could not have asked for them. A top
 * inviters board is the one thing here worth showing off, so posting it stays
 * possible but has to be chosen.
 */
const share = (option: SlashCommandBooleanOption) =>
  option.setName('share').setDescription('Post it in the channel instead of only to you')

export const funnelCommand = new SlashCommandBuilder()
  .setName('funnel')
  .setDescription('Invite tracking and join attribution')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName('leaderboard')
      .setDescription('Who has brought in the most members')
      .addBooleanOption(share),
  )
  .addSubcommand((sub) =>
    sub
      .setName('sources')
      .setDescription('Where members came from, by tagged source')
      .addBooleanOption(share),
  )
  .addSubcommandGroup((group) =>
    group
      .setName('source')
      .setDescription('Label invites with where they were published')
      .addSubcommand((sub) =>
        sub
          .setName('create')
          .setDescription('Make a fresh invite for a source and tag it in one go')
          .addStringOption((option) =>
            option
              .setName('name')
              .setDescription('Website, Campus Groups, Handbook, a poster…')
              .setRequired(true)
              .setMaxLength(60),
          )
          .addChannelOption((option) =>
            option
              .setName('channel')
              .setDescription('Where it lands. Defaults to this channel.')
              .addChannelTypes(ChannelType.GuildText),
          ),
      )
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

/**
 * Setup is its own command in every bot in this workspace, so somebody
 * configuring a new server types the same word whichever one they are adding.
 *
 * A modal rather than options, because it is run once per server and then never
 * again, and because a channel picker in a form beats remembering an option
 * name.
 */
export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure invite tracking for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)

export const commands = [funnelCommand, setupCommand]
