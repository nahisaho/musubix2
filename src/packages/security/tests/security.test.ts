import { describe, it, expect } from 'vitest';
import {
  SecretDetector,
  TaintAnalyzer,
  TaintDataflowAnalyzer,
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

  // v0.5.13 — precision fixes surfaced by scanning Moodle.
  it('does not flag long low-entropy i18n string keys as secrets', () => {
    // A 34-char all-lowercase identifier (Moodle lang key), not a secret.
    const code = "get_string('verifyagedigitalconsentnotpossible', 'error');";
    const findings = detector.scan(code, 'login.php');
    expect(findings.filter((f) => f.type === 'secret-leak')).toHaveLength(0);
  });

  it('does not flag hash-type format markers as hardcoded passwords', () => {
    // Moodle LDAP: $extpassword = '{MD5}' . base64_encode(...) — {MD5} is a marker.
    const code = "$extpassword = '{MD5}' . base64_encode(pack('H*', md5($extpassword)));";
    const findings = detector.scan(code, 'ldap/auth.php');
    expect(findings.filter((f) => f.type === 'hardcoded-credential')).toHaveLength(0);
  });

  it('still flags a genuine high-entropy mixed-class secret string', () => {
    const code = "const apiKey = 'aB3xR9zK1mN7qP2wL5tY8uV4cD6eF0gH';";
    const findings = detector.scan(code, 'config.ts');
    expect(findings.some((f) => f.type === 'secret-leak')).toBe(true);
  });

  // v0.5.35 — precision fixes surfaced by scanning Django.
  it('does not flag a character-set alphabet constant as a secret', () => {
    const code = 'RANDOM_STRING_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"';
    const findings = detector.scan(code, 'crypto.py');
    expect(findings.filter((f) => f.type === 'secret-leak')).toHaveLength(0);
  });

  it('does not flag a long CamelCase identifier string as a secret', () => {
    // A C-API symbol name (no digits) — not a secret.
    const code = 'std_call("GDALGetRasterColorInterpretation")';
    const findings = detector.scan(code, 'raster.py');
    expect(findings.filter((f) => f.type === 'secret-leak')).toHaveLength(0);
  });

  it('does not flag a SQL/format-template as a hardcoded password', () => {
    const code = 'set_password = \'ALTER USER %(user)s IDENTIFIED BY "%(password)s"\'';
    const findings = detector.scan(code, 'creation.py');
    expect(findings.filter((f) => f.type === 'hardcoded-credential')).toHaveLength(0);
  });

  it('does not flag Ruby-interpolated or variable password values', () => {
    const rb = "where(\"password = '#{password}'\")"; // #{...} interpolation
    expect(detector.scan(rb, 'base.rb').filter((f) => f.type === 'hardcoded-credential')).toHaveLength(0);
    const php = "'password' => '--password='.$connection['password']";
    expect(detector.scan(php, 'db.php').filter((f) => f.type === 'hardcoded-credential')).toHaveLength(0);
  });

  it('does not flag SHA-256/hash checksums as secrets', () => {
    const code = 'sha256 "64811cb24e77cac3057d6c40b63ac9becf9082eedd54ca411b475b755d334882"';
    const findings = detector.scan(code, 'formula.rb');
    expect(findings.filter((f) => f.type === 'secret-leak')).toHaveLength(0);
  });

  // v0.5.36 — recall: provider token formats and connection-string credentials.
  // Tokens are assembled at runtime so no literal secret exists in source (which
  // would otherwise trip GitHub push protection); the scanner sees the full value.
  it('detects provider token formats (GitHub/Slack/Stripe/Google)', () => {
    const f = (n: number) => 'a1B2c3'.repeat(Math.ceil(n / 6)).slice(0, n);
    const cases: Array<[string, string]> = [
      ['GitHub', `const t = "ghp_${f(36)}";`],
      ['Slack', `const t = "xoxb-000000000000-000000000000-${f(24)}";`],
      ['Stripe', `const t = "sk_live_${f(24)}";`],
      ['Google', `const t = "AIza${f(35)}";`],
    ];
    for (const [name, code] of cases) {
      const findings = detector.scan(code, 'config.js');
      expect(findings.some((x) => x.description.includes(name)), name).toBe(true);
    }
  });

  it('detects credentials embedded in a connection URL', () => {
    const pw = 'S3cret' + 'P4ss'; // assembled — no literal credential in source
    const findings = detector.scan(`DB_URL = "postgres://admin:${pw}@db.example.com/prod"`, 'settings.py');
    expect(findings.some((x) => x.type === 'hardcoded-credential')).toBe(true);
    // …but not a placeholder example URL.
    const doc = 'DB_URL = "postgres://user:password@localhost/db"';
    expect(detector.scan(doc, 'README.md').filter((x) => x.type === 'hardcoded-credential')).toHaveLength(0);
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

  // v0.5.35: precision fixes found by dogfooding the scanner on Django.
  it('does not flag method calls or definitions named eval/exec', () => {
    const code = [
      'x.eval(context)', // method call
      'def eval(self, ctx):', // Python method definition
      'result = re.exec(pattern)', // method call
    ].join('\n');
    const findings = analyzer.analyze(code, 'smartif.py');
    expect(findings.filter((f) => f.type === 'injection')).toHaveLength(0);
  });

  it('still flags a bare builtin eval()/exec()', () => {
    expect(analyzer.analyze('return eval(code, {}, {})', 'q.py').length).toBeGreaterThan(0);
    expect(analyzer.analyze('exec(user_code)', 'shell.py').length).toBeGreaterThan(0);
  });

  it('does not flag static/empty innerHTML assignments', () => {
    expect(analyzer.analyze('box.innerHTML = "";', 'ui.js')).toHaveLength(0);
    expect(analyzer.analyze("el.innerHTML = '<b>ok</b>';", 'ui.js')).toHaveLength(0);
    // but a dynamic assignment is still flagged
    expect(analyzer.analyze('el.innerHTML = userInput;', 'ui.js').length).toBeGreaterThan(0);
  });

  // v0.5.36 — recall: command injection, deserialization, weak crypto.
  it('detects command-injection sinks', () => {
    expect(analyzer.analyze('os.system("rm -rf " + x)', 'a.py').length).toBeGreaterThan(0);
    expect(analyzer.analyze('subprocess.run(cmd, shell=True)', 'a.py').length).toBeGreaterThan(0);
    expect(analyzer.analyze("shell_exec($_GET['c'])", 'a.php').length).toBeGreaterThan(0);
    expect(analyzer.analyze('Runtime.getRuntime().exec(cmd)', 'A.java').length).toBeGreaterThan(0);
  });

  it('detects f-string / concatenation SQL building', () => {
    expect(analyzer.analyze('cursor.execute(f"SELECT * FROM t WHERE n={n}")', 'db.py').length).toBeGreaterThan(0);
    expect(analyzer.analyze('db.query("SELECT " + cols)', 'db.js').length).toBeGreaterThan(0);
  });

  it('flags deserialization and weak crypto at low severity', () => {
    const pickle = analyzer.analyze('data = pickle.loads(buf)', 'a.py');
    expect(pickle.length).toBeGreaterThan(0);
    expect(pickle[0]!.severity).toBe('low');
    expect(analyzer.analyze('$x = unserialize($blob);', 'a.php').length).toBeGreaterThan(0);
    const md5 = analyzer.analyze('h = hashlib.md5(pw).hexdigest()', 'a.py');
    expect(md5.length).toBeGreaterThan(0);
    expect(md5[0]!.severity).toBe('low');
  });

  it('ignores injection patterns inside comments and string literals', () => {
    // PHPDoc block comment mentioning eval/exec — not real code.
    const doc = '/**\n * @method static mixed eval(string $script)\n */';
    expect(analyzer.analyze(doc, 'Redis.php')).toHaveLength(0);
    // eval inside a string literal — not a call.
    expect(analyzer.analyze("str_contains($t, 'eval()\\'d code')", 'Once.php')).toHaveLength(0);
    // # comment in Python — not real code.
    expect(analyzer.analyze('# be careful with eval(x)', 'a.py')).toHaveLength(0);
    // a real eval on a code line is still flagged.
    expect(analyzer.analyze('eval(var_export($v, true))', 'Cache.php').length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TaintDataflowAnalyzer (v0.5.37)
// ---------------------------------------------------------------------------

describe('TaintDataflowAnalyzer', () => {
  const df = new TaintDataflowAnalyzer();

  it('flags a .format() string flowing through a variable into a query', () => {
    const code = 'query = "SELECT * FROM u WHERE n = \'{}\'".format(name)\ncursor.execute(query)\n';
    const findings = df.analyze(code, 'a.py');
    expect(findings.some((f) => f.type === 'injection' && f.cweId === 'CWE-89')).toBe(true);
    expect(findings[0]!.description).toMatch(/built at line 1/);
  });

  it('flags an f-string and a concatenation reaching sinks', () => {
    expect(df.analyze('sql = f"DELETE FROM t WHERE id={uid}"\ncursor.execute(sql)', 'a.py').length).toBeGreaterThan(0);
    expect(df.analyze('cmd = "ls " + d\nos.system(cmd)', 'a.py').length).toBeGreaterThan(0);
    expect(df.analyze('$c = "ping " . $_GET["h"];\nsystem($c);', 'a.php').length).toBeGreaterThan(0);
  });

  it('does not flag parameterized queries or argument lists (safe forms)', () => {
    // Constant SQL + params bound separately.
    expect(df.analyze('sql = "SELECT * FROM t WHERE id = %s"\ncursor.execute(sql, [uid])', 'a.py')).toHaveLength(0);
    // Argument vector (list) to subprocess is safe.
    expect(df.analyze('args = [exe] + ["-W%s" % o for o in opts]\nsubprocess.run(args)', 'a.py')).toHaveLength(0);
    // No dynamic construction at all.
    expect(df.analyze('x = 1\ncursor.execute(x)', 'a.py')).toHaveLength(0);
  });

  it('does not flag values passed through a sanitizer', () => {
    // shlex.quote / int() / escapeshellarg sanitize the dynamic part.
    expect(df.analyze('cmd = "ls " + shlex.quote(d)\nos.system(cmd)', 'a.py')).toHaveLength(0);
    expect(df.analyze('q = "… WHERE id = %d" % int(uid)\ncursor.execute(q)', 'a.py')).toHaveLength(0);
    expect(df.analyze('$c = "ping " . escapeshellarg($h);\nsystem($c);', 'a.php')).toHaveLength(0);
    // …but the unsanitized sibling is still flagged.
    expect(df.analyze('cmd = "ls " + d\nos.system(cmd)', 'a.py').length).toBeGreaterThan(0);
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
