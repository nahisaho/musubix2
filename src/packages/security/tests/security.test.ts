import { describe, it, expect } from 'vitest';
import {
  SecretDetector,
  TaintAnalyzer,
  DependencyScanner,
  ComplianceChecker,
  SecurityScanner,
  createSecurityScanner,
  createComplianceChecker,
  createSecretDetector,
  type SecurityPolicy,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// DES-COD-003: SecretDetector
// ---------------------------------------------------------------------------

describe('DES-COD-003: SecretDetector', () => {
  const detector = new SecretDetector();

  it('detects AWS access key patterns', () => {
    const code = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const findings = detector.scan(code, 'config.ts');
    const aws = findings.find((f) => f.description.includes('AWS'));
    expect(aws).toBeDefined();
    expect(aws!.severity).toBe('critical');
    expect(aws!.type).toBe('secret-leak');
  });

  it('detects private key blocks', () => {
    const code = '-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBA...';
    const findings = detector.scan(code, 'key.pem');
    expect(findings.some((f) => f.description.includes('Private key'))).toBe(true);
  });

  it('detects hardcoded password assignments', () => {
    const code = 'const password = "sup3rS3cret!";';
    const findings = detector.scan(code, 'auth.ts');
    expect(findings.some((f) => f.type === 'hardcoded-credential')).toBe(true);
  });

  it('detects JWT tokens', () => {
    const code = 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0";';
    const findings = detector.scan(code, 'auth.ts');
    expect(findings.some((f) => f.description.includes('JWT'))).toBe(true);
  });

  it('returns empty findings for clean code', () => {
    const code = 'const x = 1;\nconst y = x + 2;\n';
    const findings = detector.scan(code, 'clean.ts');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DES-COD-003: TaintAnalyzer
// ---------------------------------------------------------------------------

describe('DES-COD-003: TaintAnalyzer', () => {
  const analyzer = new TaintAnalyzer();

  it('detects eval() usage', () => {
    const code = 'const result = eval("2+2");';
    const findings = analyzer.analyze(code, 'app.ts');
    expect(findings.some((f) => f.description.includes('eval()'))).toBe(true);
    expect(findings[0]!.severity).toBe('critical');
  });

  it('detects innerHTML assignment', () => {
    const code = 'element.innerHTML = userInput;';
    const findings = analyzer.analyze(code, 'ui.ts');
    expect(findings.some((f) => f.type === 'xss')).toBe(true);
  });

  it('detects SQL injection via string concatenation in query', () => {
    const code = 'db.query("SELECT * FROM users WHERE id=" + userId)';
    const findings = analyzer.analyze(code, 'db.ts');
    expect(findings.some((f) => f.type === 'injection')).toBe(true);
  });

  it('returns empty findings for clean code', () => {
    const code = 'const sum = (a: number, b: number) => a + b;\n';
    const findings = analyzer.analyze(code, 'utils.ts');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DES-COD-003: DependencyScanner
// ---------------------------------------------------------------------------

describe('DES-COD-003: DependencyScanner', () => {
  const scanner = new DependencyScanner();

  it('detects child_process require', () => {
    const code = "const cp = require('child_process');";
    const findings = scanner.scan(code, 'run.ts');
    expect(findings.some((f) => f.type === 'insecure-dependency')).toBe(true);
  });

  it('detects child_process import', () => {
    const code = "import { exec } from 'child_process';";
    const findings = scanner.scan(code, 'run.ts');
    expect(findings.some((f) => f.type === 'insecure-dependency')).toBe(true);
  });

  it('returns empty for clean imports', () => {
    const code = "import { readFile } from 'fs/promises';";
    const findings = scanner.scan(code, 'io.ts');
    expect(findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DES-COD-003: ComplianceChecker
// ---------------------------------------------------------------------------

describe('DES-COD-003: ComplianceChecker', () => {
  const checker = new ComplianceChecker();

  const policy: SecurityPolicy = {
    id: 'POL-001',
    name: 'No console.log',
    rules: [
      {
        id: 'RULE-001',
        name: 'Forbid console.log',
        pattern: 'console\\.log\\s*\\(',
        severity: 'low',
        type: 'compliance-violation',
        description: 'console.log is forbidden in production code',
        suggestion: 'Use a structured logger instead',
      },
    ],
  };

  it('returns compliant for clean code', () => {
    const result = checker.check('const x = 1;', 'clean.ts', [policy]);
    expect(result.compliant).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.checkedPolicies).toContain('POL-001');
  });

  it('detects violations matching policy rules', () => {
    const code = 'console.log("debug info");';
    const result = checker.check(code, 'app.ts', [policy]);
    expect(result.compliant).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]!.policyId).toBe('POL-001');
    expect(result.violations[0]!.ruleId).toBe('RULE-001');
  });
});

// ---------------------------------------------------------------------------
// DES-COD-003: SecurityScanner
// ---------------------------------------------------------------------------

describe('DES-COD-003: SecurityScanner', () => {
  it('runs all detectors and aggregates findings', () => {
    const scanner = new SecurityScanner();
    const code = [
      'const key = "AKIAIOSFODNN7EXAMPLE";',
      'const result = eval(key);',
      "const cp = require('child_process');",
    ].join('\n');
    const result = scanner.scan(code, 'bad.ts');
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    expect(result.scannedFiles).toBe(1);
    expect(typeof result.scanTime).toBe('number');
  });

  it('scanWithCompliance combines scan and compliance results', () => {
    const scanner = new SecurityScanner();
    const policy: SecurityPolicy = {
      id: 'POL-002',
      name: 'No eval',
      rules: [
        {
          id: 'RULE-002',
          name: 'Forbid eval',
          pattern: '\\beval\\s*\\(',
          severity: 'critical',
          type: 'injection',
          description: 'eval() is forbidden',
          suggestion: 'Do not use eval()',
        },
      ],
    };
    const code = 'eval("alert(1)");';
    const { scan, compliance } = scanner.scanWithCompliance(code, 'evil.ts', [policy]);
    expect(scan.findings.length).toBeGreaterThan(0);
    expect(compliance.compliant).toBe(false);
    expect(compliance.violations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// DES-COD-003: Factory functions
// ---------------------------------------------------------------------------

describe('DES-COD-003: Factory functions', () => {
  it('createSecurityScanner returns a SecurityScanner', () => {
    const scanner = createSecurityScanner();
    expect(scanner).toBeInstanceOf(SecurityScanner);
  });

  it('createComplianceChecker returns a ComplianceChecker', () => {
    const checker = createComplianceChecker();
    expect(checker).toBeInstanceOf(ComplianceChecker);
  });

  it('createSecretDetector returns a SecretDetector', () => {
    const detector = createSecretDetector();
    expect(detector).toBeInstanceOf(SecretDetector);
  });
});
