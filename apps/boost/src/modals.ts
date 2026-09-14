import { ModalBuilder, TextInputStyle } from 'discord.js'
import type { BoostConfig } from '@gict/db'
import { formatColour } from './colour'

export const COLOUR_MODAL = 'boost:colour'
export const PASS_MODAL = 'boost:pass'
export const SETUP_MODAL = 'boost:setup'

export const FIELD_COLOUR = 'colour'
export const FIELD_MEMBER = 'member'
export const FIELD_PASS_ROLE = 'passRole'
export const FIELD_PASS_COUNT = 'passCount'
export const FIELD_ANCHOR = 'anchor'

export function colourModal(current: number | null): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(COLOUR_MODAL)
    .setTitle('Your role colour')
    .addLabelComponents((label) =>
      label
        .setLabel('Colour')
        .setDescription('A hex code like #E51B13, or a name like blue. Empty removes it.')
        .setTextInputComponent((input) =>
          input
            .setCustomId(FIELD_COLOUR)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#E51B13, or leave empty')
            // Not required: an empty box is how you take the colour off, and a
            // required field would make removing one impossible.
            .setRequired(false)
            .setMaxLength(30)
            .setValue(current === null ? '' : formatColour(current)),
        ),
    )
}

/**
 * A user picker rather than a name to type.
 *
 * Typing a username means getting it wrong, and there is no good way to tell
 * two people apart by name alone.
 */
export function passModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(PASS_MODAL)
    .setTitle('Give a booster pass')
    .addLabelComponents((label) =>
      label
        .setLabel('Who gets it')
        .setDescription('They keep it until you take it back or your boost lapses.')
        .setUserSelectMenuComponent((select) =>
          select.setCustomId(FIELD_MEMBER).setRequired(true).setMinValues(1).setMaxValues(1),
        ),
    )
}

export function setupModal(config: BoostConfig | null): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(SETUP_MODAL)
    .setTitle('Booster perks setup')
    .addLabelComponents(
      (label) =>
        label
          .setLabel('Booster pass role')
          .setDescription('What a booster hands out. Leave empty to turn passes off.')
          .setRoleSelectMenuComponent((select) =>
            select
              .setCustomId(FIELD_PASS_ROLE)
              .setRequired(false)
              .setDefaultRoles(config?.passRoleId ? [config.passRoleId] : []),
          ),
      (label) =>
        label.setLabel('Passes per booster').setTextInputComponent((input) =>
          input
            .setCustomId(FIELD_PASS_COUNT)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setRequired(true)
            .setMaxLength(2)
            .setValue(String(config?.passesPerBooster ?? 1)),
        ),
      (label) =>
        label
          .setLabel('Put personal roles under')
          .setDescription('Their colour only shows above every other coloured role they have.')
          .setRoleSelectMenuComponent((select) =>
            select
              .setCustomId(FIELD_ANCHOR)
              .setRequired(false)
              .setDefaultRoles(config?.anchorRoleId ? [config.anchorRoleId] : []),
          ),
    )
}
