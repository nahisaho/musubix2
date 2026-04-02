/**
 * @musubix2/security — Security Scanning & Compliance
 *
 * Static analysis security scanners, compliance checking,
 * secret detection, and vulnerability assessment.
 *
 * @see DES-COD-003 — セキュリティスキャン
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type VulnerabilityType =
  | 'injection'
  | 'xss'
  | 'secret-leak'
  | 'insecure-dependency'
  | 'prompt-injection'
  | 'path-traversal'
  | 'insecure-crypto'
  | 'hardcoded-credential'
  | 'taint-flow'
  | 'compliance-violation';

export interface CodeLocation {
  file: string;
  line: number;
  column?: number;
  endLine?: number;
  snippet?: string;
}

export interface SecurityFinding {
  type: VulnerabilityType;
  severity: Severity;
  location: CodeLocation;
  description: string;
  suggestion: string;
  cweId?: string;
  confidence: number; // 0.0 - 1.0
}

export interface SecurityPolicy {
  id: string;
  name: string;
  rules: SecurityRule[];
}

export interface SecurityRule {
  id: string;
  name: string;
  pattern: string; // regex pattern to detect
  severity: Severity;
  type: VulnerabilityType;
  description: string;
  suggestion: string;
  cweId?: string;
}

export interface ComplianceViolation {
  ruleId: string;
  policyId: string;
  finding: SecurityFinding;
}

export interface ComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  checkedPolicies: string[];
  scanTime: number;
}

export interface ScanResult {
  findings: SecurityFinding[];
  scannedFiles: number;
  scanTime: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLineNumber(code: string, index: number): number {
  return code.substring(0, index).split('\n').length;
}

function getSnippet(code: string, lineNumber: number): string {
  const lines = code.split('\n');
  return lines[lineNumber - 1]?.trim() ?? '';
}

interface DetectorPattern {
  regex: RegExp;
  severity: Severity;
  type: VulnerabilityType;
  description: string;
  suggestion: string;
  cweId?: string;
  confidence: number;
}

function runPatterns(
  patterns: DetectorPattern[],
  code: string,
  filePath: string,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const p of patterns) {
    const regex = new RegExp(p.regex.source, p.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      const line = getLineNumber(code, match.index);
      findings.push({
        type: p.type,
        severity: p.severity,
        location: {
          file: filePath,
          line,
          snippet: getSnippet(code, line),
        },
        description: p.description,
        suggestion: p.suggestion,
        cweId: p.cweId,
        confidence: p.confidence,
      });
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// SecretDetector
// ---------------------------------------------------------------------------

export class SecretDetector {
  private readonly patterns: DetectorPattern[] = [
    {
      regex: /AKIA[0-9A-Z]{16}/g,
      severity: 'critical',
      type: 'secret-leak',
      description: 'AWS access key detected',
      suggestion: 'Remove the AWS key and use environment variables or a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.95,
    },
    {
      regex: /-----BEGIN[A-Z ]*PRIVATE KEY-----/g,
      severity: 'critical',
      type: 'secret-leak',
      description: 'Private key detected',
      suggestion: 'Remove the private key from source code and store it in a secrets manager',
      cweId: 'CWE-321',
      confidence: 0.99,
    },
    {
      regex: /password\s*=\s*['"][^'"]+['"]/g,
      severity: 'high',
      type: 'hardcoded-credential',
      description: 'Hardcoded password assignment detected',
      suggestion: 'Use environment variables or a secrets manager instead of hardcoded passwords',
      cweId: 'CWE-798',
      confidence: 0.8,
    },
    {
      regex: /eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+/g,
      severity: 'high',
      type: 'secret-leak',
      description: 'JWT token detected in source code',
      suggestion: 'Remove the JWT token and load it from a secure configuration source',
      cweId: 'CWE-798',
      confidence: 0.85,
    },
    {
      regex: /['"][A-Za-z0-9]{32,}['"]/g,
      severity: 'medium',
      type: 'secret-leak',
      description: 'Potential API key or secret detected (long random string)',
      suggestion: 'Verify whether this is a secret and move it to environment variables if so',
      cweId: 'CWE-798',
      confidence: 0.6,
    },
  ];

  scan(code: string, filePath: string): SecurityFinding[] {
    return runPatterns(this.patterns, code, filePath);
  }
}

// ---------------------------------------------------------------------------
// TaintAnalyzer
// ---------------------------------------------------------------------------

export class TaintAnalyzer {
  private readonly patterns: DetectorPattern[] = [
    {
      regex: /\beval\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of eval() detected — potential code injection',
      suggestion:
        'Replace eval() with a safer alternative such as JSON.parse() or a sandboxed interpreter',
      cweId: 'CWE-95',
      confidence: 0.9,
    },
    {
      regex: /\.innerHTML\s*=/g,
      severity: 'high',
      type: 'xss',
      description: 'Direct innerHTML assignment — potential XSS vulnerability',
      suggestion: 'Use textContent or a sanitization library before setting innerHTML',
      cweId: 'CWE-79',
      confidence: 0.85,
    },
    {
      regex: /document\.write\s*\(/g,
      severity: 'high',
      type: 'xss',
      description: 'Use of document.write() — potential XSS vulnerability',
      suggestion: 'Use DOM manipulation methods instead of document.write()',
      cweId: 'CWE-79',
      confidence: 0.85,
    },
    {
      regex: /\bexec\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of exec() detected — potential command injection',
      suggestion: 'Use parameterized commands or a safe execution wrapper',
      cweId: 'CWE-78',
      confidence: 0.8,
    },
    {
      regex: /\bFunction\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of Function() constructor — potential code injection',
      suggestion: 'Avoid dynamic code generation with Function(); use safer alternatives',
      cweId: 'CWE-95',
      confidence: 0.85,
    },
    {
      regex: /query\s*\(.*\+.*\)/g,
      severity: 'high',
      type: 'injection',
      description: 'Potential SQL injection — string concatenation in query call',
      suggestion: 'Use parameterized queries instead of string concatenation',
      cweId: 'CWE-89',
      confidence: 0.75,
    },
    {
      regex: /query\s*\(\s*`[^`]*\$\{/g,
      severity: 'high',
      type: 'injection',
      description: 'Potential SQL injection — unsanitized template literal in query',
      suggestion: 'Use parameterized queries instead of template literals',
      cweId: 'CWE-89',
      confidence: 0.75,
    },
  ];

  analyze(code: string, filePath: string): SecurityFinding[] {
    return runPatterns(this.patterns, code, filePath);
  }
}

// ---------------------------------------------------------------------------
// DependencyScanner
// ---------------------------------------------------------------------------

export class DependencyScanner {
  private readonly patterns: DetectorPattern[] = [
    {
      regex: /require\s*\(\s*['"]child_process['"]\s*\)/g,
      severity: 'high',
      type: 'insecure-dependency',
      description: 'Import of child_process via require — potential command injection vector',
      suggestion: 'Ensure child_process usage is validated and sandboxed',
      cweId: 'CWE-78',
      confidence: 0.7,
    },
    {
      regex: /import\s+.*\s+from\s+['"]child_process['"]/g,
      severity: 'high',
      type: 'insecure-dependency',
      description: 'Import of child_process — potential command injection vector',
      suggestion: 'Ensure child_process usage is validated and sandboxed',
      cweId: 'CWE-78',
      confidence: 0.7,
    },
    {
      regex: /\bfs\.\w+Sync\s*\(/g,
      severity: 'medium',
      type: 'path-traversal',
      description: 'Synchronous fs operation without apparent validation',
      suggestion:
        'Validate file paths against a whitelist and use path.resolve() to prevent traversal',
      cweId: 'CWE-22',
      confidence: 0.5,
    },
  ];

  scan(code: string, filePath: string): SecurityFinding[] {
    return runPatterns(this.patterns, code, filePath);
  }
}

// ---------------------------------------------------------------------------
// ComplianceChecker
// ---------------------------------------------------------------------------

export class ComplianceChecker {
  check(code: string, filePath: string, policies: SecurityPolicy[]): ComplianceResult {
    const start = Date.now();
    const violations: ComplianceViolation[] = [];
    const checkedPolicies: string[] = [];

    for (const policy of policies) {
      checkedPolicies.push(policy.id);
      for (const rule of policy.rules) {
        const regex = new RegExp(rule.pattern, 'g');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(code)) !== null) {
          const line = getLineNumber(code, match.index);
          violations.push({
            ruleId: rule.id,
            policyId: policy.id,
            finding: {
              type: rule.type,
              severity: rule.severity,
              location: {
                file: filePath,
                line,
                snippet: getSnippet(code, line),
              },
              description: rule.description,
              suggestion: rule.suggestion,
              cweId: rule.cweId,
              confidence: 1.0,
            },
          });
        }
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
      checkedPolicies,
      scanTime: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// SecurityScanner (façade)
// ---------------------------------------------------------------------------

export interface Detector {
  scan?: (code: string, filePath: string) => SecurityFinding[];
  analyze?: (code: string, filePath: string) => SecurityFinding[];
}

export class SecurityScanner {
  private readonly detectors: Detector[];

  constructor(options?: {
    detectors?: Array<{ scan: (code: string, filePath: string) => SecurityFinding[] }>;
  }) {
    this.detectors = options?.detectors ?? [
      new SecretDetector(),
      new TaintAnalyzer(),
      new DependencyScanner(),
    ];
  }

  scan(code: string, filePath: string): ScanResult {
    const start = Date.now();
    const findings: SecurityFinding[] = [];

    for (const detector of this.detectors) {
      if (typeof detector.scan === 'function') {
        findings.push(...detector.scan(code, filePath));
      }
      if (typeof (detector as TaintAnalyzer).analyze === 'function') {
        findings.push(...(detector as TaintAnalyzer).analyze(code, filePath));
      }
    }

    return {
      findings,
      scannedFiles: 1,
      scanTime: Date.now() - start,
    };
  }

  scanWithCompliance(
    code: string,
    filePath: string,
    policies: SecurityPolicy[],
  ): { scan: ScanResult; compliance: ComplianceResult } {
    const scanResult = this.scan(code, filePath);
    const checker = new ComplianceChecker();
    const compliance = checker.check(code, filePath, policies);
    return { scan: scanResult, compliance };
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

export function createSecurityScanner(): SecurityScanner {
  return new SecurityScanner();
}

export function createComplianceChecker(): ComplianceChecker {
  return new ComplianceChecker();
}

export function createSecretDetector(): SecretDetector {
  return new SecretDetector();
}
