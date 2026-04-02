/**
 * Shared test helpers for MUSUBIX2
 *
 * テストファースト (Article III) を支援するヘルパー群。
 * 全パッケージのテストで共通利用する。
 */

import { vi, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * 一時ディレクトリを作成し、テスト終了後に自動クリーンアップする。
 */
export async function createTempDir(prefix = 'musubix2-test-'): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const path = await mkdtemp(join(tmpdir(), prefix));
  return {
    path,
    cleanup: async () => {
      await rm(path, { recursive: true, force: true });
    },
  };
}

/**
 * SkillTestHarness — スキルのユニットテスト用ハーネス。
 * 外部依存をモック注入してテストを分離する。
 */
export interface MockContext {
  cwd: string;
  env: Record<string, string>;
  fs: {
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    mkdir: ReturnType<typeof vi.fn>;
  };
}

export function createMockContext(overrides: Partial<MockContext> = {}): MockContext {
  return {
    cwd: overrides.cwd ?? '/tmp/test',
    env: overrides.env ?? {},
    fs: {
      readFile: overrides.fs?.readFile ?? vi.fn().mockResolvedValue(''),
      writeFile: overrides.fs?.writeFile ?? vi.fn().mockResolvedValue(undefined),
      exists: overrides.fs?.exists ?? vi.fn().mockResolvedValue(false),
      mkdir: overrides.fs?.mkdir ?? vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * EARS 要件 ID がテスト名に含まれているか検証するカスタムマッチャー。
 */
export function expectEarsLinked(testName: string): void {
  const earsPattern = /REQ-[A-Z]{3}-\d{3}/;
  expect(testName).toMatch(earsPattern);
}

/**
 * テスト結果を REQ ID でグループ化するユーティリティ。
 */
export function groupByReqId(
  results: Array<{ name: string; passed: boolean }>,
): Record<string, Array<{ name: string; passed: boolean }>> {
  const grouped: Record<string, Array<{ name: string; passed: boolean }>> = {};
  const reqPattern = /REQ-[A-Z]{3}-\d{3}/g;

  for (const result of results) {
    const matches = result.name.match(reqPattern);
    if (matches) {
      for (const reqId of matches) {
        if (!grouped[reqId]) {
          grouped[reqId] = [];
        }
        grouped[reqId].push(result);
      }
    }
  }

  return grouped;
}
