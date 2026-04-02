import { describe, it, expect, vi } from 'vitest';
import {
  FileWatcher,
  TaskScheduler,
  DEFAULT_WATCHER_CONFIG,
  createFileWatcher,
  createTaskScheduler,
  type FileChangeEvent,
  type ScheduledTask,
} from '../../src/monitoring/file-watcher.js';

describe('DES-MON-001: FileWatcher', () => {
  it('should register and trigger event handlers', () => {
    const watcher = createFileWatcher();
    const events: FileChangeEvent[] = [];

    watcher.on('create', (e) => events.push(e));

    const event: FileChangeEvent = { type: 'create', path: 'src/new.ts', timestamp: new Date() };
    watcher.emit(event);

    expect(events).toHaveLength(1);
    expect(events[0].path).toBe('src/new.ts');
  });

  it('should support multiple handlers for the same event type', () => {
    const watcher = createFileWatcher();
    let count = 0;

    watcher.on('modify', () => count++);
    watcher.on('modify', () => count++);

    watcher.emit({ type: 'modify', path: 'file.ts', timestamp: new Date() });
    expect(count).toBe(2);
  });

  it('should remove a handler with off()', () => {
    const watcher = createFileWatcher();
    const events: FileChangeEvent[] = [];
    const handler = (e: FileChangeEvent): void => { events.push(e); };

    watcher.on('delete', handler);
    watcher.emit({ type: 'delete', path: 'old.ts', timestamp: new Date() });
    expect(events).toHaveLength(1);

    watcher.off('delete', handler);
    watcher.emit({ type: 'delete', path: 'another.ts', timestamp: new Date() });
    expect(events).toHaveLength(1);
  });

  it('should not trigger handlers for different event types', () => {
    const watcher = createFileWatcher();
    const events: FileChangeEvent[] = [];

    watcher.on('create', (e) => events.push(e));
    watcher.emit({ type: 'modify', path: 'file.ts', timestamp: new Date() });

    expect(events).toHaveLength(0);
  });

  it('should check ignore patterns', () => {
    const watcher = createFileWatcher();
    const config = DEFAULT_WATCHER_CONFIG;

    expect(watcher.shouldIgnore('node_modules/foo/bar.ts', config)).toBe(true);
    expect(watcher.shouldIgnore('dist/index.js', config)).toBe(true);
    expect(watcher.shouldIgnore('.git/HEAD', config)).toBe(true);
    expect(watcher.shouldIgnore('src/main.ts', config)).toBe(false);
  });

  it('should match glob-like patterns', () => {
    const watcher = createFileWatcher();

    expect(watcher.matchesPattern('src/main.ts', ['**/*.ts'])).toBe(true);
    expect(watcher.matchesPattern('lib/util.js', ['**/*.ts'])).toBe(false);
    expect(watcher.matchesPattern('test.ts', ['**/*.ts'])).toBe(true);
  });

  it('DEFAULT_WATCHER_CONFIG has correct defaults', () => {
    expect(DEFAULT_WATCHER_CONFIG.patterns).toEqual(['**/*.ts']);
    expect(DEFAULT_WATCHER_CONFIG.ignorePatterns).toContain('node_modules');
    expect(DEFAULT_WATCHER_CONFIG.ignorePatterns).toContain('dist');
    expect(DEFAULT_WATCHER_CONFIG.ignorePatterns).toContain('.git');
    expect(DEFAULT_WATCHER_CONFIG.debounceMs).toBe(300);
  });

  it('factory createFileWatcher returns a FileWatcher instance', () => {
    const watcher = createFileWatcher();
    expect(watcher).toBeInstanceOf(FileWatcher);
  });
});

describe('DES-MON-001: TaskScheduler', () => {
  it('should register and run a task', async () => {
    const scheduler = createTaskScheduler();
    const fn = vi.fn().mockResolvedValue(undefined);
    const task: ScheduledTask = { id: 'lint', name: 'Lint', run: fn };

    scheduler.register(task);
    await scheduler.runOnce('lint');

    expect(fn).toHaveBeenCalledOnce();
  });

  it('should throw when running unregistered task', async () => {
    const scheduler = createTaskScheduler();
    await expect(scheduler.runOnce('nope')).rejects.toThrow('Task "nope" is not registered');
  });

  it('should unregister a task', () => {
    const scheduler = createTaskScheduler();
    scheduler.register({ id: 't1', name: 'Task 1', run: async () => {} });

    expect(scheduler.unregister('t1')).toBe(true);
    expect(scheduler.unregister('t1')).toBe(false);
    expect(scheduler.getTask('t1')).toBeUndefined();
  });

  it('should list all tasks', () => {
    const scheduler = createTaskScheduler();
    scheduler.register({ id: 'a', name: 'A', run: async () => {} });
    scheduler.register({ id: 'b', name: 'B', run: async () => {} });

    const tasks = scheduler.listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.id)).toContain('a');
    expect(tasks.map((t) => t.id)).toContain('b');
  });

  it('should get a task by id', () => {
    const scheduler = createTaskScheduler();
    const task: ScheduledTask = { id: 'x', name: 'X', run: async () => {}, interval: 5000 };
    scheduler.register(task);

    const retrieved = scheduler.getTask('x');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('X');
    expect(retrieved!.interval).toBe(5000);
  });

  it('factory createTaskScheduler returns a TaskScheduler instance', () => {
    const scheduler = createTaskScheduler();
    expect(scheduler).toBeInstanceOf(TaskScheduler);
  });
});
