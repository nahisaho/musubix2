#!/usr/bin/env node
import { createCLIDispatcher, getDefaultCommands, showHelp } from '../dist/cli.js';

const args = process.argv.slice(2);

if (args.length === 0 || (args[0] === '--help' || args[0] === '-h')) {
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
for (const cmd of commands) {
  dispatcher.register(cmd);
}

const exitCode = await dispatcher.run(args);
process.exit(exitCode);
