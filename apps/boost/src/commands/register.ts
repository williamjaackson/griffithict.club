import { loadBotConfig, registerCommands } from '@gict/bot-kit'
import { commands } from './definitions'

await registerCommands(loadBotConfig('BOOST'), commands)
