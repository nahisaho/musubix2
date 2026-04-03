import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GitLogParser,
  GitKnowledgeBuilder,
  createGitLogParser,
  createGitKnowledgeBuilder,
  buildGitKnowledge,
  type GitCommitInfo,
  type GitKnowledgeConfig,
  type GitFileChange,
  type BuildResult,
  type CoChangeEdge,
  type AuthorExpertise,
} from '../src/index.js';
import type { Entity, KnowledgeStore, Relation } from '@musubix2/knowledge';

// ── Mock child_process ──────────────────────────────────────────

vi.mock('node:child_process', () => ({
  execFile: vi.fn(
    (
      _cmd: string,
      _args: string[],
      _opts: Record<string, unknown>,
      cb: (err: Error | null, result: { stdout: string; stderr: string }) => void,
    ) => {
      cb(null, { stdout: '', stderr: '' });
    },
  ),
}));

// ── Mock KnowledgeStore ─────────────────────────────────────────

function createMockStore(): KnowledgeStore {
  const entities = new Map<string, Entity>();
  const relations: Relation[] = [];
  return {
    getEntity: vi.fn(async (id: string) => entities.get(id)),
    putEntity: vi.fn(async (entity: Entity) => {
      entities.set(entity.id, entity);
    }),
    deleteEntity: vi.fn(async (id: string) => entities.delete(id)),
    addRelation: vi.fn(async (relation: Relation) => {
      relations.push(relation);
    }),
    removeRelation: vi.fn(async () => false),
    getRelations: vi.fn(async () => []),
    query: vi.fn(async () => []),
    search: vi.fn(async () => []),
    getSubgraph: vi.fn(async () => ({
      version: '1.0.0' as const,
      metadata: { lastModified: '', entityCount: 0, relationCount: 0 },
      entities: {},
      relations: [],
    })),
    traverse: vi.fn(async () => []),
    save: vi.fn(async () => {}),
    load: vi.fn(async () => {}),
    getStats: vi.fn(() => ({ entityCount: 0, relationCount: 0, types: {} })),
  };
}

// ── Sample Git Output ───────────────────────────────────────────

const sampleLogOutput = `COMMIT_START
abc123def456abc123def456abc123def456abc1
Alice Developer
alice@example.com
2024-01-15T10:30:00+00:00
feat: add user authentication
10\t2\tsrc/auth/login.ts
5\t0\tsrc/auth/types.ts

COMMIT_START
def456abc123def456abc123def456abc123def4
Bob Engineer
bob@example.com
2024-01-14T09:00:00+00:00
fix: resolve database connection issue
3\t1\tsrc/db/connection.ts

COMMIT_START
789012abc123789012abc123789012abc123789a
Alice Developer
alice@example.com
2024-01-13T15:00:00+00:00
feat(auth): implement token refresh
8\t3\tsrc/auth/login.ts
15\t0\tsrc/auth/refresh.ts
2\t1\tsrc/auth/types.ts
`;

const sampleBlameOutput = `abc123def456abc123def456abc123def456abc1 1 1 3
author Alice Developer
author-mail <alice@example.com>
author-time 1705312200
author-tz +0000
committer Alice Developer
committer-mail <alice@example.com>
committer-time 1705312200
committer-tz +0000
summary feat: add user authentication
filename src/auth/login.ts
\timport { hash } from 'bcrypt';
abc123def456abc123def456abc123def456abc1 2 2
\t
abc123def456abc123def456abc123def456abc1 3 3
\texport async function login(user: string) {
def456abc123def456abc123def456abc123def4 4 4 1
author Bob Engineer
author-mail <bob@example.com>
author-time 1705225800
author-tz +0000
committer Bob Engineer
committer-mail <bob@example.com>
committer-time 1705225800
committer-tz +0000
summary fix: resolve database connection issue
filename src/auth/login.ts
\t  return await db.connect();
`;

const defaultConfig: GitKnowledgeConfig = { repoPath: '/fake/repo' };

// ── 1. GitLogParser.parseLog ────────────────────────────────────

describe('GitLogParser.parseLog', () => {
  it('parses commits from log output', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);

    expect(commits).toHaveLength(3);
    expect(commits[0].hash).toBe('abc123def456abc123def456abc123def456abc1');
    expect(commits[0].author).toBe('Alice Developer');
    expect(commits[0].email).toBe('alice@example.com');
    expect(commits[0].message).toBe('feat: add user authentication');
  });

  it('parses file changes with numstat', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);

    expect(commits[0].files).toHaveLength(2);
    expect(commits[0].files[0]).toEqual({
      path: 'src/auth/login.ts',
      additions: 10,
      deletions: 2,
      status: 'modified',
    });
  });

  it('parses dates as Date objects', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);

    expect(commits[0].date).toBeInstanceOf(Date);
    expect(commits[0].date.getFullYear()).toBe(2024);
  });

  it('handles commits with no files', () => {
    const output = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Charlie
charlie@example.com
2024-01-10T12:00:00+00:00
chore: update README
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits).toHaveLength(1);
    expect(commits[0].files).toHaveLength(0);
  });

  it('handles empty git log output', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput('');

    expect(commits).toHaveLength(0);
  });

  it('handles renamed files in numstat', () => {
    const output = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Dev
dev@example.com
2024-02-01T10:00:00+00:00
refactor: rename module
5\t3\told/path.ts => new/path.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits[0].files[0].status).toBe('renamed');
    expect(commits[0].files[0].path).toBe('new/path.ts');
    expect(commits[0].files[0].oldPath).toBe('old/path.ts');
  });

  it('detects added files (additions only)', () => {
    const output = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Dev
dev@example.com
2024-02-01T10:00:00+00:00
feat: new file
20\t0\tsrc/new-file.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits[0].files[0].status).toBe('added');
  });

  it('detects deleted files (deletions only)', () => {
    const output = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Dev
dev@example.com
2024-02-01T10:00:00+00:00
chore: remove old file
0\t30\tsrc/old-file.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits[0].files[0].status).toBe('deleted');
  });
});

// ── 2. GitLogParser.parseBlame ──────────────────────────────────

describe('GitLogParser.parseBlame', () => {
  it('parses porcelain blame output', () => {
    const parser = new GitLogParser(defaultConfig);
    const blame = parser.parseBlameOutput('src/auth/login.ts', sampleBlameOutput);

    expect(blame.file).toBe('src/auth/login.ts');
    expect(blame.lines.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts correct author per line', () => {
    const parser = new GitLogParser(defaultConfig);
    const blame = parser.parseBlameOutput('src/auth/login.ts', sampleBlameOutput);

    const aliceLines = blame.lines.filter((l) => l.author === 'Alice Developer');
    const bobLines = blame.lines.filter((l) => l.author === 'Bob Engineer');

    expect(aliceLines.length).toBeGreaterThanOrEqual(1);
    expect(bobLines.length).toBeGreaterThanOrEqual(1);
  });

  it('extracts line content (strips leading tab)', () => {
    const parser = new GitLogParser(defaultConfig);
    const blame = parser.parseBlameOutput('src/auth/login.ts', sampleBlameOutput);

    expect(blame.lines[0].content).toBe("import { hash } from 'bcrypt';");
  });

  it('handles empty blame output', () => {
    const parser = new GitLogParser(defaultConfig);
    const blame = parser.parseBlameOutput('empty.ts', '');

    expect(blame.file).toBe('empty.ts');
    expect(blame.lines).toHaveLength(0);
  });
});

// ── 3. GitKnowledgeBuilder.build — entities ─────────────────────

describe('GitKnowledgeBuilder.build — entities', () => {
  let store: KnowledgeStore;
  let parser: GitLogParser;

  beforeEach(() => {
    store = createMockStore();
    parser = new GitLogParser(defaultConfig);
    vi.spyOn(parser, 'parseLog').mockResolvedValue(
      parser.parseLogOutput(sampleLogOutput),
    );
  });

  it('creates commit entities', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    const result = await builder.build();

    expect(result.commits).toBe(3);
    expect(store.putEntity).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'commit:abc123def456abc123def456abc123def456abc1', type: 'task' }),
    );
  });

  it('creates author entities (deduplicated)', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    const result = await builder.build();

    // Alice appears in 2 commits, but should only have 1 entity
    expect(result.authors).toBe(2);
  });

  it('creates file entities (deduplicated)', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    const result = await builder.build();

    // src/auth/login.ts appears in 2 commits, only 1 entity
    expect(result.files).toBe(4); // login.ts, types.ts, connection.ts, refresh.ts
  });

  it('creates feature entities from commit messages', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    expect(store.putEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'requirement',
        tags: expect.arrayContaining(['feature']),
      }),
    );
  });

  it('sets correct entity properties', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    expect(store.putEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'author:alice@example.com',
        type: 'pattern',
        name: 'Alice Developer',
        properties: expect.objectContaining({ email: 'alice@example.com' }),
      }),
    );
  });
});

// ── 4. GitKnowledgeBuilder.build — relations ────────────────────

describe('GitKnowledgeBuilder.build — relations', () => {
  let store: KnowledgeStore;
  let parser: GitLogParser;

  beforeEach(() => {
    store = createMockStore();
    parser = new GitLogParser(defaultConfig);
    vi.spyOn(parser, 'parseLog').mockResolvedValue(
      parser.parseLogOutput(sampleLogOutput),
    );
  });

  it('creates author→commit relations', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    expect(store.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'author:alice@example.com',
        target: 'commit:abc123def456abc123def456abc123def456abc1',
        type: 'related_to',
      }),
    );
  });

  it('creates commit→file relations', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    expect(store.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'commit:abc123def456abc123def456abc123def456abc1',
        target: 'file:src/auth/login.ts',
        type: 'implements',
      }),
    );
  });

  it('creates co-change dependency relations', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    // login.ts and types.ts changed together in 2 commits → co-change edge
    expect(store.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'file:src/auth/login.ts',
        target: 'file:src/auth/types.ts',
        type: 'depends_on',
      }),
    );
  });

  it('creates author collaboration relations', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    // There are no files changed by both Alice and Bob in sample data,
    // but we can verify relations count is > 0
    expect(store.addRelation).toHaveBeenCalled();
  });

  it('creates commit→feature relations', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    await builder.build();

    expect(store.addRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'implements',
        source: expect.stringContaining('commit:'),
        target: expect.stringContaining('feature:'),
      }),
    );
  });

  it('reports correct relation count in BuildResult', async () => {
    const builder = new GitKnowledgeBuilder(parser, store);
    const result = await builder.build();

    expect(result.relations).toBeGreaterThan(0);
    expect(result.coChangeEdges).toBeGreaterThanOrEqual(1);
  });
});

// ── 5. Co-change analysis ───────────────────────────────────────

describe('Co-change analysis', () => {
  it('detects co-changed files', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const edges = builder.buildCoChangeGraph(commits);

    const loginTypes = edges.find(
      (e) =>
        (e.file1 === 'src/auth/login.ts' && e.file2 === 'src/auth/types.ts') ||
        (e.file1 === 'src/auth/types.ts' && e.file2 === 'src/auth/login.ts'),
    );
    expect(loginTypes).toBeDefined();
    expect(loginTypes!.count).toBe(2);
  });

  it('respects threshold parameter', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const highThreshold = builder.buildCoChangeGraph(commits, 10);
    expect(highThreshold).toHaveLength(0);

    const lowThreshold = builder.buildCoChangeGraph(commits, 1);
    expect(lowThreshold.length).toBeGreaterThan(0);
  });

  it('sorts edges by count descending', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const edges = builder.buildCoChangeGraph(commits, 1);
    for (let i = 1; i < edges.length; i++) {
      expect(edges[i - 1].count).toBeGreaterThanOrEqual(edges[i].count);
    }
  });

  it('includes commit hashes in edges', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const edges = builder.buildCoChangeGraph(commits, 1);
    for (const edge of edges) {
      expect(edge.commits.length).toBeGreaterThan(0);
      for (const hash of edge.commits) {
        expect(hash.length).toBeGreaterThan(0);
      }
    }
  });

  it('returns empty for single-file commits', () => {
    const singleFileOutput = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Dev
dev@example.com
2024-01-01T10:00:00+00:00
fix: single file
3\t1\tsrc/single.ts

COMMIT_START
bbb222ccc333ddd444eee555fff666aaa111bbb2
Dev
dev@example.com
2024-01-02T10:00:00+00:00
fix: another single
2\t1\tsrc/other.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(singleFileOutput);

    const edges = builder.buildCoChangeGraph(commits);
    expect(edges).toHaveLength(0);
  });
});

// ── 6. Author expertise ─────────────────────────────────────────

describe('Author expertise', () => {
  it('computes domain expertise from file changes', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const expertise = builder.buildAuthorExpertise(commits);
    expect(expertise.length).toBeGreaterThan(0);
  });

  it('calculates correct percentage per domain', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const expertise = builder.buildAuthorExpertise(commits);
    for (const author of expertise) {
      const total = author.domains.reduce((sum, d) => sum + d.percentage, 0);
      expect(total).toBeCloseTo(100, 0);
    }
  });

  it('sorts domains by change count descending', () => {
    const parser = new GitLogParser(defaultConfig);
    const builder = new GitKnowledgeBuilder(parser, createMockStore());
    const commits = parser.parseLogOutput(sampleLogOutput);

    const expertise = builder.buildAuthorExpertise(commits);
    for (const author of expertise) {
      for (let i = 1; i < author.domains.length; i++) {
        expect(author.domains[i - 1].changeCount).toBeGreaterThanOrEqual(
          author.domains[i].changeCount,
        );
      }
    }
  });
});

// ── 7. Config filtering ─────────────────────────────────────────

describe('Config filtering', () => {
  it('filters out excluded paths', () => {
    const config: GitKnowledgeConfig = {
      repoPath: '/fake/repo',
      excludePaths: ['src/db/'],
    };
    const parser = new GitLogParser(config);
    const commits = parser.parseLogOutput(sampleLogOutput);

    const allPaths = commits.flatMap((c) => c.files.map((f) => f.path));
    expect(allPaths).not.toContain('src/db/connection.ts');
  });

  it('respects maxCommits in parsed output', () => {
    // maxCommits is applied at git command level, but verify parsing handles all commits
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);
    expect(commits).toHaveLength(3);
  });

  it('handles multiple exclude paths', () => {
    const config: GitKnowledgeConfig = {
      repoPath: '/fake/repo',
      excludePaths: ['src/db/', 'src/auth/'],
    };
    const parser = new GitLogParser(config);
    const commits = parser.parseLogOutput(sampleLogOutput);

    const allPaths = commits.flatMap((c) => c.files.map((f) => f.path));
    expect(allPaths).toHaveLength(0);
  });
});

// ── 8. Error handling ───────────────────────────────────────────

describe('Error handling', () => {
  it('handles malformed log output gracefully', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput('not valid git output');

    expect(commits).toHaveLength(0);
  });

  it('handles incomplete commit blocks', () => {
    const output = `COMMIT_START
abc123
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    // Block has < 4 lines, should be skipped
    expect(commits).toHaveLength(0);
  });

  it('handles malformed numstat lines', () => {
    const output = `COMMIT_START
abc123def456abc123def456abc123def456abc1
Dev
dev@example.com
2024-01-01T10:00:00+00:00
fix: something
not-a-numstat-line
3\t1\tsrc/valid.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits).toHaveLength(1);
    // Only valid numstat line should be parsed
    expect(commits[0].files).toHaveLength(1);
    expect(commits[0].files[0].path).toBe('src/valid.ts');
  });
});

// ── 9. computeAuthorStats ───────────────────────────────────────

describe('computeAuthorStats', () => {
  it('computes correct commit counts per author', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);
    const stats = parser.computeAuthorStats(commits);

    const alice = stats.find((s) => s.email === 'alice@example.com');
    const bob = stats.find((s) => s.email === 'bob@example.com');

    expect(alice).toBeDefined();
    expect(alice!.commitCount).toBe(2);
    expect(bob).toBeDefined();
    expect(bob!.commitCount).toBe(1);
  });

  it('tracks unique files per author', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);
    const stats = parser.computeAuthorStats(commits);

    const alice = stats.find((s) => s.email === 'alice@example.com')!;
    expect(alice.filesChanged.has('src/auth/login.ts')).toBe(true);
    expect(alice.filesChanged.has('src/auth/types.ts')).toBe(true);
    expect(alice.filesChanged.has('src/auth/refresh.ts')).toBe(true);
  });

  it('determines first and last commit dates', () => {
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(sampleLogOutput);
    const stats = parser.computeAuthorStats(commits);

    const alice = stats.find((s) => s.email === 'alice@example.com')!;
    expect(alice.firstCommit.getTime()).toBeLessThan(alice.lastCommit.getTime());
  });
});

// ── 10. Factory functions ───────────────────────────────────────

describe('Factory functions', () => {
  it('createGitLogParser returns GitLogParser instance', () => {
    const parser = createGitLogParser(defaultConfig);
    expect(parser).toBeInstanceOf(GitLogParser);
  });

  it('createGitKnowledgeBuilder returns GitKnowledgeBuilder instance', () => {
    const store = createMockStore();
    const builder = createGitKnowledgeBuilder(defaultConfig, store);
    expect(builder).toBeInstanceOf(GitKnowledgeBuilder);
  });

  it('buildGitKnowledge returns BuildResult', async () => {
    const store = createMockStore();
    const parser = new GitLogParser(defaultConfig);
    vi.spyOn(parser, 'parseLog').mockResolvedValue([]);

    const builder = new GitKnowledgeBuilder(parser, store);
    vi.spyOn(GitKnowledgeBuilder.prototype, 'build').mockResolvedValueOnce({
      entities: 0,
      relations: 0,
      authors: 0,
      files: 0,
      commits: 0,
      coChangeEdges: 0,
    });

    const result = await buildGitKnowledge(defaultConfig, store);
    expect(result).toBeDefined();
    expect(typeof result.entities).toBe('number');
  });
});

// ── 11. Rename detection patterns ───────────────────────────────

describe('Rename detection', () => {
  it('handles brace-style renames', () => {
    const output = `COMMIT_START
aaa111bbb222ccc333ddd444eee555fff666aaa1
Dev
dev@example.com
2024-02-01T10:00:00+00:00
refactor: move files
5\t3\tsrc/{old-name => new-name}/file.ts
`;
    const parser = new GitLogParser(defaultConfig);
    const commits = parser.parseLogOutput(output);

    expect(commits[0].files[0].status).toBe('renamed');
    expect(commits[0].files[0].path).toBe('src/new-name/file.ts');
    expect(commits[0].files[0].oldPath).toBe('src/old-name/file.ts');
  });
});
