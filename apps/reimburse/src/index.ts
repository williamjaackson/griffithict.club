import { database as openDatabase, loadBotConfig, shutdownOn } from '@gict/bot-kit'
import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js'
import { configFor, moveClaimsByReference, payeeFor, type ClaimStatus } from './claims'
import { onSetupSubmit } from './handlers/admin'
import { onBankSubmit } from './handlers/bank'
import {
  decodeRefs,
  isCommittee,
  openConsole,
  PREFIX,
  renderConsole,
  type View,
} from './handlers/console'
import { onExport } from './handlers/export'
import { onReviewButton } from './handlers/review'
import { STATUS } from './status'
import { onClaimSubmit } from './handlers/submit'
import {
  BANK_MODAL_ID,
  bankModal,
  CLAIM_MODAL_ID,
  claimModal,
  SETUP_MODAL_ID,
  setupModal,
} from './modal'

const config = loadBotConfig('REIMBURSE')
const database = openDatabase(config.databaseUrl)

/*
 * Guilds only. This bot never watches members or messages, it only answers
 * interactions, so it needs no privileged intent and nothing enabled in the
 * developer portal.
 */
const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, (ready) => {
  console.log(`Reimburse is up as ${ready.user.tag} across ${ready.guilds.cache.size} server(s)`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'reimbursement') {
        const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
        await interaction.showModal(payee ? claimModal() : bankModal(null))
        return
      }
      if (interaction.commandName === 'reimbursements') {
        await openConsole(interaction, database)
        return
      }
      if (interaction.commandName === 'setup') {
        await interaction.showModal(setupModal(await configFor(database, interaction.guildId!)))
        return
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === CLAIM_MODAL_ID)
        return void (await onClaimSubmit(interaction, database))
      if (interaction.customId === BANK_MODAL_ID)
        return void (await onBankSubmit(interaction, database))
      if (interaction.customId === SETUP_MODAL_ID)
        return void (await onSetupSubmit(interaction, database))
    }

    // Moving one claim along, from its post in the review channel.
    if (interaction.isButton() && interaction.customId.startsWith('claim:')) {
      await onReviewButton(interaction, database)
      return
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith(PREFIX)) {
        await onConsoleControl(interaction, interaction.customId.slice(PREFIX.length))
        return
      }
    }

    // The hand-off out of the bank form, since a modal cannot open a modal.
    if (interaction.isButton() && interaction.customId === 'reimbursement:continue') {
      await interaction.showModal(claimModal())
      return
    }
  } catch (error) {
    console.error('Interaction failed:', error)
    if (!interaction.isRepliable()) return
    const message = {
      content: 'Something went wrong there.',
      flags: MessageFlags.Ephemeral,
    } as const
    await (
      interaction.deferred || interaction.replied
        ? interaction.followUp(message)
        : interaction.reply(message)
    ).catch(() => {})
  }
})

/** Everything on the management screen. */
async function onConsoleControl(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  action: string,
): Promise<void> {
  const redraw = async (view: View, offset: number, selected: readonly number[]) => {
    await interaction.update(await renderConsole(interaction, database, view, offset, selected))
  }

  // The filter select. Keeps the page, drops the selection, since what was
  // picked is almost certainly not in the new view.
  if (interaction.isStringSelectMenu() && action.startsWith('view:')) {
    await redraw(interaction.values[0] as View, 0, [])
    return
  }

  // The claim select. Its values are the selection.
  if (interaction.isStringSelectMenu() && action.startsWith('pick:')) {
    const [, view, offset] = action.split(':')
    await redraw(view as View, Number(offset) || 0, interaction.values.map(Number))
    return
  }

  if (action.startsWith('page:')) {
    const [, view, offset, refs] = action.split(':')
    await redraw(view as View, Number(offset) || 0, decodeRefs(refs))
    return
  }

  if (action === 'bank') {
    const payee = await payeeFor(database, interaction.guildId!, interaction.user.id)
    await interaction.showModal(bankModal(payee))
    return
  }

  // One gate for every committee control, rather than a copy of it per action.
  if (!(await isCommittee(interaction, database))) {
    await interaction.reply({
      content: 'That one is for the committee.',
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  if (action.startsWith('export:')) {
    if (!interaction.isButton()) return
    const [, view, refs] = action.split(':')
    const selected = decodeRefs(refs)
    await onExport(
      interaction,
      database,
      {
        status: view === 'all' ? undefined : (view as ClaimStatus),
        references: selected.length > 0 ? selected : undefined,
      },
      selected.length > 0 ? 'selected' : view === 'all' ? 'all' : STATUS[view as ClaimStatus].label,
    )
    return
  }

  if (action.startsWith('bulk:')) {
    const [, view, to, refs] = action.split(':')
    const selected = decodeRefs(refs)

    const moved = await moveClaimsByReference(
      database,
      interaction.guildId!,
      selected,
      to as ClaimStatus,
      interaction.user.id,
    )

    await redraw(view as View, 0, [])
    await interaction.followUp({
      content:
        moved === 0
          ? 'Nothing moved — those claims were already there.'
          : `Moved ${moved} claim${moved === 1 ? '' : 's'} to ${STATUS[to as ClaimStatus].label}.`,
      flags: MessageFlags.Ephemeral,
    })
  }
}

client.on(Events.Error, (error) => console.error('Gateway error:', error))

shutdownOn(client)

await client.login(config.token)
