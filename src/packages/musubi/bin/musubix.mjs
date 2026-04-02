#!/usr/bin/env node
import { CLIDispatcher, createCLIDispatcher, getDefaultCommands, parseArgs, showHelp } from '../dist/index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(showHelp());
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  const pkg = await import('../package.json', { with: { type: 'json' } });
  console.log(`musubix2 v${pkg.default.version}`);
  process.exit(0);
}

const dispatcher = createCLIDispatcher();
const commands = getDefaultCommands();
commands.forEach(cmd => dispatcher.register(cmd.name, cmd.description, cmd.handler));

const parsed = parseArgs(args);
try {
  const exitCode = await dispatcher.dispatch(parsed.command, parsed.args, parsed.flags);
  process.exit(exitCode);
} catch (err) {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
}
