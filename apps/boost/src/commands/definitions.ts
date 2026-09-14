import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js'

/**
 * Two commands, the same split the other bots use: the thing everybody does,
 * and the thing an admin does once.
 */
export const boostCommand = new SlashCommandBuilder()
  .setName('boost')
  .setDescription('Your booster perks: role colour and passes')
  .setDMPermission(false)

export const setupCommand = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure booster perks for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .setDMPermission(false)

export const commands = [boostCommand, setupCommand]
