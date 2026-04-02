/**
 * Test Placement Validation — DES-CG-003
 * Validates that source files have corresponding test files.
 */

export interface TestPlacementRule {
  sourcePattern: string; // glob-like pattern for source files, e.g. "src/**/*.ts"
  testPattern: string; // pattern for expected test location, e.g. "tests/{name}.test.ts"
  required: boolean;
}

export interface MissingTest {
  sourcePath: string;
  expectedTestPath: string;
}

export interface TestPlacementReport {
  totalSources: number;
  coveredSources: number;
  missingTests: MissingTest[];
  orphanedTests: string[];
  coveragePercent: number;
}

export class TestPlacementValidator {
  /**
   * Validate test placement given lists of source and test files.
   * This is a pure function - file discovery is the caller's responsibility.
   */
  validate(
    sourceFiles: string[],
    testFiles: string[],
    rules: TestPlacementRule[],
  ): TestPlacementReport {
    const missingTests: MissingTest[] = [];
    const matchedTests = new Set<string>();

    for (const source of sourceFiles) {
      let hasTest = false;
      for (const rule of rules) {
        if (!this.matchesPattern(source, rule.sourcePattern)) {
          continue;
        }

        const expectedTest = this.deriveTestPath(source, rule);
        // Check if any test file matches
        const found = testFiles.find((t) => this.matchesTestPath(t, expectedTest));
        if (found) {
          hasTest = true;
          matchedTests.add(found);
        } else if (rule.required) {
          missingTests.push({ sourcePath: source, expectedTestPath: expectedTest });
        }
      }
      if (hasTest) {
        // Already counted
      }
    }

    const orphanedTests = testFiles.filter((t) => !matchedTests.has(t));
    const coveredSources = sourceFiles.length - missingTests.length;

    return {
      totalSources: sourceFiles.length,
      coveredSources,
      missingTests,
      orphanedTests,
      coveragePercent:
        sourceFiles.length > 0 ? Math.round((coveredSources / sourceFiles.length) * 100) : 100,
    };
  }

  // Simple glob-like matching: supports ** and *
  private matchesPattern(path: string, pattern: string): boolean {
    const regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars
      .replace(/\*\*\//g, '(.*/)?') // **/ matches zero or more directories
      .replace(/\*\*/g, '.*') // standalone ** matches anything
      .replace(/\*/g, '[^/]*'); // * matches within single segment
    return new RegExp(`^${regex}$`).test(path);
  }

  // Derive expected test path from source path and rule
  private deriveTestPath(sourcePath: string, rule: TestPlacementRule): string {
    // Extract the filename without extension
    const parts = sourcePath.split('/');
    const fileName = parts[parts.length - 1];
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');

    // Replace {name} placeholder in test pattern
    return rule.testPattern.replace('{name}', nameWithoutExt);
  }

  // Check if a test file path matches an expected test path pattern
  private matchesTestPath(testPath: string, expectedPath: string): boolean {
    // Direct match or ends-with match
    return testPath === expectedPath || testPath.endsWith(expectedPath);
  }
}

export function createTestPlacementValidator(): TestPlacementValidator {
  return new TestPlacementValidator();
}
