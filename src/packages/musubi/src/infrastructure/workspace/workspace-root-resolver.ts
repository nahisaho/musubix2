/**
 * P1-05 / DES-INS-006: Resolve workspace root during npm lifecycle.
 * Priority: INIT_CWD → npm_config_local_prefix → cwd
 */

export class WorkspaceRootResolver {
  resolveFromLifecycle(env: NodeJS.ProcessEnv, cwd: string): string {
    return env.INIT_CWD ?? env.npm_config_local_prefix ?? cwd;
  }
}
