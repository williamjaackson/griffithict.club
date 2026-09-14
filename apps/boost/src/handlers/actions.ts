import {
  ActionRowBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js'
import { and, eq } from 'drizzle-orm'
import { boostConfig, boostPasses, type Database } from '@gict/db'
import { formatColour, parseColour, swatch, UNSET } from '../colour'
import {
  FIELD_ANCHOR,
  FIELD_COLOUR,
  FIELD_MEMBER,
  FIELD_PASS_COUNT,
  FIELD_PASS_ROLE,
} from '../modals'
import {
  applyPersonalRole,
  configFor,
  isBooster,
  passesGiven,
  passesReceived,
  syncPassRole,
} from '../perks'
import { renderConsole } from './console'

export const TAKE_SELECT = 'boost:take'

const REFUSED: Record<string, string> = {
  'no-permission': 'I need the Manage Roles permission to do that.',
  'role-limit': "This server is at Discord's 250 role limit, so I cannot make another one.",
  'discord-refused':
    'Discord refused that. Usually it means my role sits below where the personal roles go.',
}

/** Refresh the panel in place, so it never shows a state that has moved on. */
async function refresh(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return
  const view = await renderConsole(interaction.member, database)
  await interaction
    .editReply({ content: view.content ?? '', components: view.components ?? [] })
    .catch(() => {})
}

export async function onColourSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return

  const parsed = parseColour(interaction.fields.getTextInputValue(FIELD_COLOUR))
  if (!parsed.ok) {
    await interaction.reply({ content: parsed.error, flags: MessageFlags.Ephemeral })
    return
  }

  if (!isBooster(interaction.member)) {
    await interaction.reply({
      content: 'Only boosters have a personal role.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const result = await applyPersonalRole(database, interaction.member, parsed.value)
  if (!result.ok) {
    await interaction.editReply(REFUSED[result.reason] ?? 'That did not work.')
    return
  }

  await interaction.editReply(
    parsed.value === UNSET
      ? 'Colour removed. Your role is uncoloured, so whatever your other roles give you shows instead.'
      : `${swatch(parsed.value)} Your role is now \`${formatColour(parsed.value)}\`.`,
  )
}

export async function onPassSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return

  const recipient = interaction.fields.getSelectedMembers(FIELD_MEMBER)?.first()
  const target = interaction.fields.getSelectedUsers(FIELD_MEMBER, true).first()
  if (!target) return

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const config = await configFor(database, interaction.guildId)
  if (!config?.passRoleId) {
    await interaction.editReply('Passes are not set up in this server.')
    return
  }

  if (!isBooster(interaction.member)) {
    await interaction.editReply('Only boosters have passes to give.')
    return
  }

  if (target.id === interaction.user.id) {
    await interaction.editReply('You cannot give yourself a pass.')
    return
  }

  if (target.bot) {
    await interaction.editReply('Bots have no use for a pass.')
    return
  }

  const given = await passesGiven(database, interaction.guildId, interaction.user.id)
  if (given.length >= config.passesPerBooster) {
    await interaction.editReply(
      `You have given all ${config.passesPerBooster} of your passes. Take one back first.`,
    )
    return
  }

  // Only your own pass can be a duplicate. Somebody else having passed them is
  // fine, and is exactly why the role is not added and removed per pass.
  const already = await passesReceived(database, interaction.guildId, target.id)
  if (already.some((pass) => pass.granterId === interaction.user.id)) {
    await interaction.editReply(`<@${target.id}> already has your pass.`)
    return
  }

  const member = recipient ?? (await interaction.guild.members.fetch(target.id).catch(() => null))
  if (!member) {
    await interaction.editReply('That person is not in this server.')
    return
  }

  await database.insert(boostPasses).values({
    guildId: interaction.guildId,
    granterId: interaction.user.id,
    recipientId: target.id,
  })

  await syncPassRole(database, interaction.guild, target.id)

  await interaction.editReply(
    already.length === 0
      ? `<@${target.id}> has your booster pass.`
      : `<@${target.id}> has your booster pass, on top of ${already.length} from somebody else.`,
  )
}

/** Which pass to take back, listed rather than typed. */
export async function onTakeButton(
  interaction: ButtonInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return

  const given = await passesGiven(database, interaction.guildId, interaction.user.id)
  if (given.length === 0) {
    await interaction.reply({
      content: 'You have not given any passes.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  const options = await Promise.all(
    given.map(async (pass) => {
      const member = await interaction.guild.members.fetch(pass.recipientId).catch(() => null)
      return {
        label: member?.displayName ?? member?.user.username ?? pass.recipientId,
        description: 'Take this pass back',
        value: pass.recipientId,
      }
    }),
  )

  await interaction.reply({
    content: 'Whose pass are you taking back?',
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(TAKE_SELECT)
          .setPlaceholder('Pick somebody')
          .addOptions(options.slice(0, 25)),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  })
}

export async function onTakeSelect(
  interaction: StringSelectMenuInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return

  const recipientId = interaction.values[0]
  if (!recipientId) return

  await interaction.deferUpdate()

  // Conditional on it still being theirs, so two clicks cannot take the same
  // pass back twice and leave the count wrong.
  const removed = await database
    .delete(boostPasses)
    .where(
      and(
        eq(boostPasses.guildId, interaction.guildId),
        eq(boostPasses.granterId, interaction.user.id),
        eq(boostPasses.recipientId, recipientId),
      ),
    )
    .returning({ recipientId: boostPasses.recipientId })

  if (removed.length === 0) {
    await interaction.editReply({ content: 'That pass is already back.', components: [] })
    return
  }

  // Only strips the role if nothing else is holding it up.
  await syncPassRole(database, interaction.guild, recipientId)

  const left = await passesReceived(database, interaction.guildId, recipientId)
  await interaction.editReply({
    content:
      left.length === 0
        ? `Took the pass back from <@${recipientId}>.`
        : `Took your pass back from <@${recipientId}>. They keep the role: ${left.length} other pass${left.length === 1 ? '' : 'es'} still stands.`,
    components: [],
  })
}

export async function onSetupSubmit(
  interaction: ModalSubmitInteraction,
  database: Database,
): Promise<void> {
  if (!interaction.inCachedGuild()) return

  const passRole = interaction.fields.getSelectedRoles(FIELD_PASS_ROLE, false)?.first() ?? null
  const anchor = interaction.fields.getSelectedRoles(FIELD_ANCHOR, false)?.first() ?? null
  const rawCount = interaction.fields.getTextInputValue(FIELD_PASS_COUNT).trim()
  const passes = Number(rawCount)

  if (!Number.isInteger(passes) || passes < 0 || passes > 25) {
    await interaction.reply({
      content: 'Passes per booster should be a whole number from 0 to 25.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  await database
    .insert(boostConfig)
    .values({
      guildId: interaction.guildId,
      passRoleId: passRole?.id ?? null,
      passesPerBooster: passes,
      anchorRoleId: anchor?.id ?? null,
    })
    .onConflictDoUpdate({
      target: boostConfig.guildId,
      set: {
        passRoleId: passRole?.id ?? null,
        passesPerBooster: passes,
        anchorRoleId: anchor?.id ?? null,
      },
    })

  const lines = [
    passRole
      ? `Boosters get ${passes} pass${passes === 1 ? '' : 'es'} for <@&${passRole.id}>.`
      : 'Passes are off. Boosters still get a personal role.',
  ]
  if (anchor) lines.push(`Personal roles go just under <@&${anchor.id}>.`)
  else
    lines.push(
      '-# No anchor role set, so personal roles go as high as I can put them. A colour only shows above every other coloured role somebody has.',
    )

  await interaction.reply({
    content: lines.join('\n'),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  })
}

export { refresh }
