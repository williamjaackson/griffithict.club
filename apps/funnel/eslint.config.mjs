// No framework plugin here: the bot is plain Node, so it wants the TypeScript
// rules and nothing else. apps/web uses eslint-config-next for its own reasons.
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**'] },
  ...tseslint.configs.recommended,
)
