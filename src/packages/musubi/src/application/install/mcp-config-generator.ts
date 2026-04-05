/**
 * P2-03 / DES-INS-005: Generate MCP config JSON for Copilot and Claude formats.
 */
import type { McpConfigDocument } from '../../domain/install/types.js';
import { McpLaunchResolver } from './mcp-launch-resolver.js';

export class McpConfigGenerator {
  constructor(private readonly launchResolver: McpLaunchResolver) {}

  async buildCopilotConfig(projectPath: string): Promise<McpConfigDocument> {
    const launch = await this.launchResolver.resolve(projectPath);
    return {
      path: '.vscode/mcp.json',
      json: {
        servers: {
          musubix2: {
            type: 'stdio',
            command: launch.command,
            args: launch.args,
          },
        },
      },
    };
  }

  async buildClaudeConfig(projectPath: string): Promise<McpConfigDocument> {
    const launch = await this.launchResolver.resolve(projectPath);
    return {
      path: '.mcp.json',
      json: {
        mcpServers: {
          musubix2: {
            command: launch.command,
            args: launch.args,
          },
        },
      },
    };
  }
}
