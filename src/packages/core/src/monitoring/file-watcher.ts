/**
 * File Watcher & Task Scheduler
 *
 * Event-based file change processing and scheduled task management.
 *
 * @module monitoring/file-watcher
 * @see DES-MON-001 — ファイル監視
 */

export type FileChangeType = 'create' | 'modify' | 'delete';

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: Date;
}

export interface WatcherConfig {
  patterns: string[];
  ignorePatterns: string[];
  debounceMs: number;
}

export const DEFAULT_WATCHER_CONFIG: WatcherConfig = {
  patterns: ['**/*.ts'],
  ignorePatterns: ['node_modules', 'dist', '.git'],
  debounceMs: 300,
};

export interface TaskSchedulerConfig {
  maxConcurrent: number;
  retryOnFailure: boolean;
  retryDelay: number;
}

export interface ScheduledTask {
  id: string;
  name: string;
  run: () => Promise<void>;
  interval?: number;
}

type FileChangeHandler = (event: FileChangeEvent) => void;

export class FileWatcher {
  private handlers = new Map<string, FileChangeHandler[]>();

  on(eventType: FileChangeType, handler: FileChangeHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  off(eventType: FileChangeType, handler: FileChangeHandler): void {
    const existing = this.handlers.get(eventType);
    if (!existing) {
      return;
    }

    const idx = existing.indexOf(handler);
    if (idx !== -1) {
      existing.splice(idx, 1);
    }
  }

  emit(event: FileChangeEvent): void {
    const handlers = this.handlers.get(event.type);
    if (!handlers) {
      return;
    }

    for (const handler of handlers) {
      handler(event);
    }
  }

  shouldIgnore(path: string, config: WatcherConfig): boolean {
    for (const pattern of config.ignorePatterns) {
      if (path.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  matchesPattern(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.simpleMatch(path, pattern)) {
        return true;
      }
    }
    return false;
  }

  private simpleMatch(path: string, pattern: string): boolean {
    if (pattern.startsWith('**/*.')) {
      const ext = pattern.slice(pattern.indexOf('.'));
      return path.endsWith(ext);
    }

    if (pattern.includes('*')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$',
      );
      return regex.test(path);
    }

    return path === pattern;
  }
}

export class TaskScheduler {
  private tasks = new Map<string, ScheduledTask>();

  register(task: ScheduledTask): void {
    this.tasks.set(task.id, task);
  }

  unregister(id: string): boolean {
    return this.tasks.delete(id);
  }

  async runOnce(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task "${id}" is not registered`);
    }
    await task.run();
  }

  listTasks(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }
}

export function createFileWatcher(): FileWatcher {
  return new FileWatcher();
}

export function createTaskScheduler(): TaskScheduler {
  return new TaskScheduler();
}
