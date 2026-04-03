// MCP Prompt Registry — prompt registration and execution

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{ name: string; description: string; required?: boolean }>;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
}

export type PromptHandler = (args: Record<string, string>) => MCPPromptMessage[];

export class PromptRegistry {
  private prompts: Map<string, { prompt: MCPPrompt; handler: PromptHandler }> = new Map();

  register(prompt: MCPPrompt, handler: PromptHandler): void {
    this.prompts.set(prompt.name, { prompt, handler });
  }

  unregister(name: string): boolean {
    return this.prompts.delete(name);
  }

  get(name: string): MCPPrompt | undefined {
    return this.prompts.get(name)?.prompt;
  }

  list(): MCPPrompt[] {
    return [...this.prompts.values()].map((entry) => entry.prompt);
  }

  execute(name: string, args: Record<string, string>): MCPPromptMessage[] {
    const entry = this.prompts.get(name);
    if (!entry) {
      throw new Error(`Prompt not found: ${name}`);
    }
    return entry.handler(args);
  }
}
