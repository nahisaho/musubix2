/**
 * P3-02 / DES-INS-002: Resolve platform selection via TTY prompt or non-interactive fallback.
 */
import { createInterface } from 'node:readline';
import type { PlatformSelection } from '../../domain/install/types.js';

export class ConfirmationResolver {
  async resolveCandidate(
    selection: PlatformSelection,
    interactive: boolean,
  ): Promise<PlatformSelection> {
    if (!selection.needsConfirmation) return selection;

    if (!interactive) {
      return {
        copilot: false,
        claude: false,
        source: 'candidate',
        needsConfirmation: false,
      };
    }

    // TTY prompt
    const answer = await this.prompt(
      'Detected platforms: none confirmed.\nSelect platform [copilot/claude/both/skip]: ',
    );

    const choice = answer.trim().toLowerCase();
    if (choice === 'copilot') {
      return { copilot: true, claude: false, source: 'prompt', needsConfirmation: false };
    }
    if (choice === 'claude') {
      return { copilot: false, claude: true, source: 'prompt', needsConfirmation: false };
    }
    if (choice === 'both') {
      return { copilot: true, claude: true, source: 'prompt', needsConfirmation: false };
    }
    // skip or unrecognized
    return { copilot: false, claude: false, source: 'prompt', needsConfirmation: false };
  }

  private prompt(question: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }
}
