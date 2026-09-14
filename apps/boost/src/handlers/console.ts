import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type GuildMember,
  type InteractionUpdateOptions,
  type RepliableInteraction,
} from 'discord.js'
import type { Database } from '@gict/db'
import { formatColour, swatch } from '../colour'
import { configFor, isBooster, passesGiven, passesReceived, personalRole } from '../perks'

export const BUTTON = {
  colour: 'boost:btn:colour',
  give: 'boost:btn:give',
  take: 'boost:btn:take',
} as const

/**
 * What a booster sees, and what everybody else sees.
 *
 * One screen for both, because "you are not boosting" is a state of this panel
 * rather than a different panel. Somebody who has just stopped boosting should
 * find their perks gone from the same place they used to manage them.
 */
export async function renderConsole(
  member: GuildMember,
  database: Database,
): Promise<InteractionUpdateOptions> {
  const guildId = member.guild.id
  const config = await configFor(database, guildId)
  const boosting = isBooster(member)

  /*
   * Passes received are shown to everybody, which is the point of somebody who
   * does not boost running this at all: it is how they find out who gave them
   * the role, and who to thank.
   */
  const received = config?.passRoleId ? await passesReceived(database, guildId, member.id) : []

  const lines = ['## Booster perks', '']
  const row = new ActionRowBuilder<ButtonBuilder>()

  if (boosting) {
    const role = await personalRole(database, guildId, member.id)
    const given = await passesGiven(database, guildId, member.id)
    const allowance = config?.passRoleId ? config.passesPerBooster : 0

    lines.push(
      role
        ? `**Your role** — <@&${role.roleId}> ${describeColour(role.colour)}`
        : '**Your role** — not made yet. Pick a colour and it appears.',
    )

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(BUTTON.colour)
        .setEmoji('🎨')
        .setLabel(role ? 'Change colour' : 'Pick a colour')
        .setStyle(ButtonStyle.Primary),
    )

    if (allowance > 0) {
      lines.push(
        '',
        `**Passes you have given** — ${given.length} of ${allowance}`,
        ...(given.length > 0
          ? given.map((pass) => `· <@${pass.recipientId}>`)
          : ['_None given yet._']),
      )

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(BUTTON.give)
          .setEmoji('🎟️')
          .setLabel('Give a pass')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(given.length >= allowance),
      )
      if (given.length > 0) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(BUTTON.take)
            .setEmoji('↩️')
            .setLabel('Take one back')
            .setStyle(ButtonStyle.Secondary),
        )
      }
    }
  }

  if (received.length > 0) {
    lines.push(
      boosting ? '' : '',
      `**Passes you have** — <@&${config!.passRoleId}>`,
      ...received.map((pass) => `· from <@${pass.granterId}>`),
      received.length > 1
        ? `-# Any one of these keeps the role, so it only goes when the last one does.`
        : '-# It goes if they take it back or stop boosting.',
    )
  } else if (!boosting) {
    lines.push(
      'You are not boosting and nobody has given you a pass.',
      '',
      '-# Boost the server, or ask a booster for one of theirs.',
    )
  }

  return {
    content: lines.join('\n'),
    components: row.components.length > 0 ? [row] : [],
    allowedMentions: { parse: [] },
  }
}

/**
 * A role with no colour is not black, it is uncoloured, and the difference
 * matters: an uncoloured role lets whatever else they have show through.
 */
function describeColour(colour: number): string {
  return colour === 0 ? '_no colour set_' : `${swatch(colour)} \`${formatColour(colour)}\``
}

export async function openConsole(
  interaction: RepliableInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: 'Booster perks are per server, so this has to be used inside one.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const view = await renderConsole(interaction.member, database)
  await interaction.reply({
    content: view.content ?? '',
    components: view.components ?? [],
    allowedMentions: { parse: [] },
    flags: MessageFlags.Ephemeral,
  })
}
