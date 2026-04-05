/**
 * P3-06 / DES-INS-006: postinstall bootstrap.
 * Only runs when MUSUBIX_AUTO_INIT=1. Best-effort, never fails install.
 */
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkspaceRootResolver } from '../../infrastructure/workspace/workspace-root-resolver.js';

export class PostinstallBootstrap {
  async run(
    env: NodeJS.ProcessEnv,
    cwd: string,
  ): Promise<{ attempted: boolean; success: boolean; workspaceRoot?: string }> {
    if (env.MUSUBIX_AUTO_INIT !== '1') {
      return { attempted: false, success: false };
    }

    const resolver = new WorkspaceRootResolver();
    const workspaceRoot = resolver.resolveFromLifecycle(env, cwd);

    try {
      const { createInitCommandHandler } = await import('./init-command-handler.js');
      const handler = createInitCommandHandler();
      await handler.run({
        projectPath: workspaceRoot,
        platform: 'auto',
        force: false,
        dryRun: false,
        update: false,
      });

      this.log(workspaceRoot, 'SUCCESS', 'postinstall auto-init completed');
      return { attempted: true, success: true, workspaceRoot };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log(workspaceRoot, 'WARN', `postinstall auto-init failed: ${msg}`);
      console.warn(`⚠ musubix2 postinstall: ${msg}`);
      return { attempted: true, success: false, workspaceRoot };
    }
  }

  private log(root: string, level: string, message: string): void {
    try {
      const logPath = resolve(root, 'musubix-init.log');
      const entry = `[${new Date().toISOString()}] [${level}] ${message}\n`;
      appendFileSync(logPath, entry);
    } catch {
      // best-effort logging
    }
  }
}

// Direct execution entry point for package.json "postinstall"
const bootstrap = new PostinstallBootstrap();
bootstrap.run(process.env, process.cwd()).catch(() => {
  // Never fail npm install
});
