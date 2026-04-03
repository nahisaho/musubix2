/**
 * @musubix2/git-knowledge — Git Knowledge Extraction
 *
 * Extracts knowledge from git history and builds a knowledge graph
 * with entities for authors, files, commits, and features, plus
 * relations for co-change coupling and author expertise.
 */

import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname } from 'node:path';
import type { Entity, KnowledgeStore, Relation } from '@musubix2/knowledge';

const execFile = promisify(execFileCb);

// ── Core Types ──────────────────────────────────────────────────

export interface GitCommitInfo {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  files: GitFileChange[];
}

export interface GitFileChange {
  path: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string;
}

export interface GitBlameInfo {
  file: string;
  lines: GitBlameLine[];
}

export interface GitBlameLine {
  lineNumber: number;
  hash: string;
  author: string;
  date: Date;
  content: string;
}

export interface GitAuthorStats {
  name: string;
  email: string;
  commitCount: number;
  filesChanged: Set<string>;
  firstCommit: Date;
  lastCommit: Date;
}

export interface GitKnowledgeConfig {
  repoPath: string;
  maxCommits?: number;
  since?: string;
  until?: string;
  excludePaths?: string[];
  includeBlame?: boolean;
}

export interface BuildResult {
  entities: number;
  relations: number;
  authors: number;
  files: number;
  commits: number;
  coChangeEdges: number;
}

export interface CoChangeEdge {
  file1: string;
  file2: string;
  count: number;
  commits: string[];
}

export interface AuthorExpertise {
  author: string;
  domains: Array<{ path: string; changeCount: number; percentage: number }>;
}

// ── GitLogParser ────────────────────────────────────────────────

const COMMIT_DELIMITER = 'COMMIT_START';
const LOG_FORMAT = `${COMMIT_DELIMITER}%n%H%n%an%n%ae%n%aI%n%s`;

function parseNumstatLine(line: string): GitFileChange | null {
  const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
  if (!match) return null;

  const additions = match[1] === '-' ? 0 : parseInt(match[1], 10);
  const deletions = match[2] === '-' ? 0 : parseInt(match[2], 10);
  const pathPart = match[3];

  const renameMatch = pathPart.match(/^(.+)\{(.+) => (.+)\}(.*)$/);
  if (renameMatch) {
    const prefix = renameMatch[1];
    const oldSuffix = renameMatch[2];
    const newSuffix = renameMatch[3];
    const postfix = renameMatch[4];
    return {
      path: `${prefix}${newSuffix}${postfix}`.replace(/\/\//g, '/'),
      oldPath: `${prefix}${oldSuffix}${postfix}`.replace(/\/\//g, '/'),
      additions,
      deletions,
      status: 'renamed',
    };
  }

  const arrowRename = pathPart.match(/^(.+) => (.+)$/);
  if (arrowRename) {
    return {
      path: arrowRename[2],
      oldPath: arrowRename[1],
      additions,
      deletions,
      status: 'renamed',
    };
  }

  let status: GitFileChange['status'] = 'modified';
  if (additions > 0 && deletions === 0) {
    status = 'added';
  } else if (additions === 0 && deletions > 0) {
    status = 'deleted';
  }

  return { path: pathPart, additions, deletions, status };
}

export class GitLogParser {
  constructor(private config: GitKnowledgeConfig) {}

  async parseLog(): Promise<GitCommitInfo[]> {
    const args = ['log', `--format=${LOG_FORMAT}`, '--numstat'];

    if (this.config.maxCommits) {
      args.push(`-n`, `${this.config.maxCommits}`);
    }
    if (this.config.since) {
      args.push(`--since=${this.config.since}`);
    }
    if (this.config.until) {
      args.push(`--until=${this.config.until}`);
    }

    const { stdout } = await execFile('git', args, { cwd: this.config.repoPath });
    return this.parseLogOutput(stdout);
  }

  parseLogOutput(stdout: string): GitCommitInfo[] {
    const commits: GitCommitInfo[] = [];
    const blocks = stdout.split(COMMIT_DELIMITER).filter((b) => b.trim().length > 0);

    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l !== '');
      if (lines.length < 4) continue;

      const hash = lines[0].trim();
      const author = lines[1].trim();
      const email = lines[2].trim();
      const dateStr = lines[3].trim();
      const message = lines[4]?.trim() ?? '';

      const files: GitFileChange[] = [];
      for (let i = 5; i < lines.length; i++) {
        const parsed = parseNumstatLine(lines[i]);
        if (parsed) {
          files.push(parsed);
        }
      }

      const filteredFiles = this.filterFiles(files);

      commits.push({
        hash,
        author,
        email,
        date: new Date(dateStr),
        message,
        files: filteredFiles,
      });
    }

    return commits;
  }

  async parseBlame(filePath: string): Promise<GitBlameInfo> {
    const { stdout } = await execFile('git', ['blame', '--porcelain', filePath], {
      cwd: this.config.repoPath,
    });
    return this.parseBlameOutput(filePath, stdout);
  }

  parseBlameOutput(filePath: string, stdout: string): GitBlameInfo {
    const lines: GitBlameLine[] = [];
    const rawLines = stdout.split('\n');
    let currentHash = '';
    let currentAuthor = '';
    let currentDate = new Date();
    let currentLineNumber = 0;

    for (const line of rawLines) {
      const headerMatch = line.match(/^([0-9a-f]{40}) \d+ (\d+)/);
      if (headerMatch) {
        currentHash = headerMatch[1];
        currentLineNumber = parseInt(headerMatch[2], 10);
        continue;
      }

      if (line.startsWith('author ')) {
        currentAuthor = line.slice(7);
        continue;
      }

      if (line.startsWith('author-time ')) {
        const ts = parseInt(line.slice(12), 10);
        currentDate = new Date(ts * 1000);
        continue;
      }

      if (line.startsWith('\t')) {
        lines.push({
          lineNumber: currentLineNumber,
          hash: currentHash,
          author: currentAuthor,
          date: new Date(currentDate),
          content: line.slice(1),
        });
      }
    }

    return { file: filePath, lines };
  }

  async getFileHistory(filePath: string): Promise<GitCommitInfo[]> {
    const args = ['log', `--format=${LOG_FORMAT}`, '--numstat', '--follow', '--', filePath];

    if (this.config.maxCommits) {
      args.splice(1, 0, `-n`, `${this.config.maxCommits}`);
    }

    const { stdout } = await execFile('git', args, { cwd: this.config.repoPath });
    return this.parseLogOutput(stdout);
  }

  async getAuthorStats(): Promise<GitAuthorStats[]> {
    const commits = await this.parseLog();
    return this.computeAuthorStats(commits);
  }

  computeAuthorStats(commits: GitCommitInfo[]): GitAuthorStats[] {
    const statsMap = new Map<string, GitAuthorStats>();

    for (const commit of commits) {
      const key = commit.email;
      let stats = statsMap.get(key);
      if (!stats) {
        stats = {
          name: commit.author,
          email: commit.email,
          commitCount: 0,
          filesChanged: new Set<string>(),
          firstCommit: commit.date,
          lastCommit: commit.date,
        };
        statsMap.set(key, stats);
      }

      stats.commitCount++;
      for (const f of commit.files) {
        stats.filesChanged.add(f.path);
      }
      if (commit.date < stats.firstCommit) {
        stats.firstCommit = commit.date;
      }
      if (commit.date > stats.lastCommit) {
        stats.lastCommit = commit.date;
      }
    }

    return Array.from(statsMap.values());
  }

  private filterFiles(files: GitFileChange[]): GitFileChange[] {
    if (!this.config.excludePaths?.length) return files;
    return files.filter(
      (f) => !this.config.excludePaths!.some((ex) => f.path.startsWith(ex)),
    );
  }
}

// ── GitKnowledgeBuilder ─────────────────────────────────────────

export class GitKnowledgeBuilder {
  constructor(
    private parser: GitLogParser,
    private store: KnowledgeStore,
  ) {}

  async build(): Promise<BuildResult> {
    const commits = await this.parser.parseLog();
    const result: BuildResult = {
      entities: 0,
      relations: 0,
      authors: 0,
      files: 0,
      commits: 0,
      coChangeEdges: 0,
    };

    const authorSet = new Set<string>();
    const fileSet = new Set<string>();

    for (const commit of commits) {
      // Commit entity
      const commitEntity = this.makeEntity(
        `commit:${commit.hash}`,
        'task',
        commit.message,
        { hash: commit.hash, author: commit.author, date: commit.date.toISOString() },
        ['git', 'commit'],
      );
      await this.store.putEntity(commitEntity);
      result.commits++;
      result.entities++;

      // Author entity
      const authorId = `author:${commit.email}`;
      if (!authorSet.has(authorId)) {
        authorSet.add(authorId);
        const authorEntity = this.makeEntity(
          authorId,
          'pattern',
          commit.author,
          { email: commit.email },
          ['git', 'author'],
        );
        await this.store.putEntity(authorEntity);
        result.authors++;
        result.entities++;
      }

      // author --authored--> commit
      await this.store.addRelation(
        this.makeRelation(authorId, `commit:${commit.hash}`, 'related_to'),
      );
      result.relations++;

      // File entities and commit --modifies--> file
      for (const file of commit.files) {
        const fileId = `file:${file.path}`;
        if (!fileSet.has(fileId)) {
          fileSet.add(fileId);
          const fileEntity = this.makeEntity(
            fileId,
            'code',
            file.path,
            { directory: dirname(file.path) },
            ['git', 'file'],
          );
          await this.store.putEntity(fileEntity);
          result.files++;
          result.entities++;
        }

        await this.store.addRelation(
          this.makeRelation(`commit:${commit.hash}`, fileId, 'implements'),
        );
        result.relations++;
      }

      // Feature entity from commit message
      const feature = this.extractFeature(commit.message);
      if (feature) {
        const featureId = `feature:${feature.toLowerCase().replace(/\s+/g, '-')}`;
        const featureEntity = this.makeEntity(
          featureId,
          'requirement',
          feature,
          { source: 'commit-message' },
          ['git', 'feature'],
        );
        await this.store.putEntity(featureEntity);
        result.entities++;

        await this.store.addRelation(
          this.makeRelation(`commit:${commit.hash}`, featureId, 'implements'),
        );
        result.relations++;
      }
    }

    // Co-change edges
    const coChangeEdges = this.buildCoChangeGraph(commits);
    for (const edge of coChangeEdges) {
      const f1 = `file:${edge.file1}`;
      const f2 = `file:${edge.file2}`;
      await this.store.addRelation(
        this.makeRelation(f1, f2, 'depends_on', { coChangeCount: edge.count }),
      );
      result.relations++;
    }
    result.coChangeEdges = coChangeEdges.length;

    // Author collaboration
    const collaborations = this.buildAuthorCollaborations(commits);
    for (const [pair, count] of collaborations) {
      const [a1, a2] = pair.split('|');
      await this.store.addRelation(
        this.makeRelation(`author:${a1}`, `author:${a2}`, 'related_to', {
          collaborationCount: count,
        }),
      );
      result.relations++;
    }

    return result;
  }

  buildCoChangeGraph(commits: GitCommitInfo[], threshold = 2): CoChangeEdge[] {
    const pairMap = new Map<string, { count: number; commits: string[] }>();

    for (const commit of commits) {
      const paths = commit.files.map((f) => f.path).sort();
      for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) {
          const key = `${paths[i]}||${paths[j]}`;
          const existing = pairMap.get(key);
          if (existing) {
            existing.count++;
            existing.commits.push(commit.hash);
          } else {
            pairMap.set(key, { count: 1, commits: [commit.hash] });
          }
        }
      }
    }

    const edges: CoChangeEdge[] = [];
    for (const [key, data] of pairMap) {
      if (data.count >= threshold) {
        const [file1, file2] = key.split('||');
        edges.push({ file1, file2, count: data.count, commits: data.commits });
      }
    }

    return edges.sort((a, b) => b.count - a.count);
  }

  buildAuthorExpertise(commits: GitCommitInfo[]): AuthorExpertise[] {
    const authorFiles = new Map<string, Map<string, number>>();

    for (const commit of commits) {
      const authorKey = commit.email;
      let domainMap = authorFiles.get(authorKey);
      if (!domainMap) {
        domainMap = new Map();
        authorFiles.set(authorKey, domainMap);
      }

      for (const file of commit.files) {
        const domain = dirname(file.path) || '.';
        domainMap.set(domain, (domainMap.get(domain) ?? 0) + 1);
      }
    }

    const result: AuthorExpertise[] = [];
    for (const [author, domainMap] of authorFiles) {
      const totalChanges = Array.from(domainMap.values()).reduce((a, b) => a + b, 0);
      const domains = Array.from(domainMap.entries())
        .map(([path, changeCount]) => ({
          path,
          changeCount,
          percentage: totalChanges > 0 ? Math.round((changeCount / totalChanges) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.changeCount - a.changeCount);

      result.push({ author, domains });
    }

    return result;
  }

  private buildAuthorCollaborations(commits: GitCommitInfo[]): Map<string, number> {
    const fileAuthors = new Map<string, Set<string>>();
    for (const commit of commits) {
      for (const file of commit.files) {
        let authors = fileAuthors.get(file.path);
        if (!authors) {
          authors = new Set();
          fileAuthors.set(file.path, authors);
        }
        authors.add(commit.email);
      }
    }

    const collabMap = new Map<string, number>();
    for (const authors of fileAuthors.values()) {
      const authorList = Array.from(authors).sort();
      for (let i = 0; i < authorList.length; i++) {
        for (let j = i + 1; j < authorList.length; j++) {
          const key = `${authorList[i]}|${authorList[j]}`;
          collabMap.set(key, (collabMap.get(key) ?? 0) + 1);
        }
      }
    }

    return collabMap;
  }

  private extractFeature(message: string): string | null {
    const prefixMatch = message.match(/^(?:feat|feature|add|implement)\s*[:(]\s*(.+?)\s*\)?$/i);
    if (prefixMatch) return prefixMatch[1];

    const scopeMatch = message.match(/^(?:feat|feature)\(([^)]+)\):\s*(.+)$/i);
    if (scopeMatch) return scopeMatch[2].trim();

    return null;
  }

  private makeEntity(
    id: string,
    type: Entity['type'],
    name: string,
    properties: Record<string, unknown>,
    tags: string[],
  ): Entity {
    const now = new Date().toISOString();
    return { id, type, name, properties, tags, createdAt: now, updatedAt: now };
  }

  private makeRelation(
    source: string,
    target: string,
    type: Relation['type'],
    properties?: Record<string, unknown>,
  ): Relation {
    const id = `rel:${source}→${target}:${type}`;
    return { id, source, target, type, properties };
  }
}

// ── Factory Functions ───────────────────────────────────────────

export function createGitLogParser(config: GitKnowledgeConfig): GitLogParser {
  return new GitLogParser(config);
}

export function createGitKnowledgeBuilder(
  config: GitKnowledgeConfig,
  store: KnowledgeStore,
): GitKnowledgeBuilder {
  const parser = new GitLogParser(config);
  return new GitKnowledgeBuilder(parser, store);
}

export async function buildGitKnowledge(
  config: GitKnowledgeConfig,
  store: KnowledgeStore,
): Promise<BuildResult> {
  const builder = createGitKnowledgeBuilder(config, store);
  return builder.build();
}
