/**
 * Configuration Loader
 *
 * Loads and validates musubix.config.json project configuration.
 *
 * @module config
 * @see REQ-ARC-004 — Configuration management
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ActionableError, ErrorCodes } from '../error/index.js';

export interface LlmConfig {
  provider: string;
  model: string;
}

export interface KnowledgeConfig {
  basePath: string;
}

export interface IntegrationConfig {
  confidenceThreshold: number;
}

export interface MuSubixConfig {
  steeringDir: string;
  storageDir: string;
  llm: LlmConfig;
  knowledge: KnowledgeConfig;
  integration: IntegrationConfig;
}

export const DEFAULT_CONFIG: MuSubixConfig = {
  steeringDir: 'steering',
  storageDir: 'storage',
  llm: {
    provider: 'github-copilot',
    model: 'default',
  },
  knowledge: {
    basePath: 'storage/specs',
  },
  integration: {
    confidenceThreshold: 0.85,
  },
};

const CONFIG_FILENAME = 'musubix.config.json';

export class ConfigLoader {
  private config: MuSubixConfig | null = null;
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? process.cwd();
  }

  async load(): Promise<MuSubixConfig> {
    const configPath = join(this.basePath, CONFIG_FILENAME);

    try {
      const raw = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<MuSubixConfig>;
      this.config = this.merge(parsed);
      return this.config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ActionableError(`Configuration file not found: ${configPath}`, {
          code: ErrorCodes.CONFIG_MISSING,
          context: { file: configPath },
          suggestions: [
            {
              action: 'Initialize project',
              description: 'Run init to create default configuration',
              command: 'npx musubix init',
            },
          ],
        });
      }
      throw new ActionableError(`Failed to parse configuration: ${(error as Error).message}`, {
        code: ErrorCodes.CONFIG_INVALID,
        context: { file: configPath },
        cause: error as Error,
        suggestions: [
          {
            action: 'Check JSON syntax',
            description: 'Ensure musubix.config.json is valid JSON',
          },
        ],
      });
    }
  }

  getConfig(): MuSubixConfig {
    if (!this.config) {
      return DEFAULT_CONFIG;
    }
    return this.config;
  }

  private merge(partial: Partial<MuSubixConfig>): MuSubixConfig {
    return {
      steeringDir: partial.steeringDir ?? DEFAULT_CONFIG.steeringDir,
      storageDir: partial.storageDir ?? DEFAULT_CONFIG.storageDir,
      llm: {
        ...DEFAULT_CONFIG.llm,
        ...partial.llm,
      },
      knowledge: {
        ...DEFAULT_CONFIG.knowledge,
        ...partial.knowledge,
      },
      integration: {
        ...DEFAULT_CONFIG.integration,
        ...partial.integration,
      },
    };
  }
}
