/**
 * P2-02 / DES-INS-005: Resolve MCP launch command — prefer local, fallback to npx.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { LaunchDefinition } from '../../domain/install/types.js';

export class McpLaunchResolver {
  async resolve(projectPath: string): Promise<LaunchDefinition> {
    const localBin = resolve(projectPath, 'node_modules', '.bin', 'musubix2');
    if (existsSync(localBin)) {
      return {
        command: './node_modules/.bin/musubix2',
        args: ['mcp'],
        transport: 'stdio',
      };
    }
    return {
      command: 'npx',
      args: ['musubix2', 'mcp'],
      transport: 'stdio',
    };
  }
}
