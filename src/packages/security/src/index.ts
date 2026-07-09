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
  /** Optional post-match filter; when it returns false the match is ignored. */
  validate?: (matchText: string) => boolean;
}

/** Shannon entropy (bits per character) of a string. */
function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * Heuristic to distinguish a real high-entropy secret from a long but
 * non-random string (identifiers, i18n string keys, dictionary words).
 * Requires a mix of character classes AND sufficient entropy, so an
 * all-lowercase token like `verifyagedigitalconsentnotpossible` is not flagged.
 */
/** True if `s` contains a long run of consecutive characters (abcdef, 012345). */
function hasSequentialRun(s: string, len = 6): boolean {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1) + 1) {
      if (++run >= len) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

export function isLikelySecret(raw: string): boolean {
  const s = raw.replace(/^['"]|['"]$/g, '');
  // Real keys/tokens mix letters AND digits. Requiring a digit rejects long
  // CamelCase/snake_case identifier strings (e.g. C-API symbol names like
  // "GDALGetRasterColorInterpretation") that are not secrets.
  if (!/[0-9]/.test(s) || !/[a-zA-Z]/.test(s)) return false;
  if (shannonEntropy(s) < 3.0) return false;
  // Character-set / alphabet constants (e.g. RANDOM_STRING_CHARS = "abc…XYZ0-9")
  // have high entropy but are not secrets — they contain long sequential runs.
  if (hasSequentialRun(s)) return false;
  // Pure lowercase-hex strings of a hash length (MD5/SHA-1/256/512) are almost
  // always integrity checksums (package formulas, lockfiles), not secrets.
  if (/^[0-9a-f]{32}$|^[0-9a-f]{40}$|^[0-9a-f]{64}$|^[0-9a-f]{128}$/.test(s)) return false;
  return true;
}

/**
 * Reject `password = '...'` matches whose literal is a hash/format marker
 * (`{MD5}`, `{SHA}`, …) or an empty/placeholder value — these are not
 * hardcoded credentials.
 */
export function isNotFormatMarker(matchText: string): boolean {
  const lit = matchText.match(/['"]([^'"]*)['"]\s*$/)?.[1] ?? '';
  if (/^\{[^}]*\}$/.test(lit)) return false; // {MD5}, {SHA}, {CRYPT}, ...
  if (lit.trim().length < 3) return false; // empty / trivial placeholders
  // Format/template strings with placeholders are not literal passwords, e.g.
  // `ALTER USER %(user)s IDENTIFIED BY "%(password)s"` or `pwd={0}` / `${pw}`.
  if (/%\(?\w*\)?[sd]|%[sd]|\$\{[^}]*\}|#\{[^}]*\}|\{\d*\}|:\w+\b/.test(lit)) return false;
  // CLI-flag fragments like `--password=` (value comes from a variable).
  if (/^--?[\w-]+=?$/.test(lit.trim())) return false;
  // Variable interpolation / concatenation (`$connection[…]`, `.$var`) — the
  // regex spanned a concatenation, so the value is not a literal password.
  if (/\$\w|\.\$/.test(lit)) return false;
  return true;
}

/**
 * Reject connection-string matches whose password is an obvious placeholder or
 * interpolated variable (`user:password@`, `user:${PW}@`, `x:<pass>@`).
 */
export function isNotUrlPlaceholder(matchText: string): boolean {
  const pass = matchText.match(/:\/\/[^:@/]+:([^:@/]+)@/)?.[1] ?? '';
  if (/^(pass(word)?|secret|changeme|example|xxx+|\*+|test)$/i.test(pass)) return false;
  if (/[$#]\{|<|%s|:\w+$/.test(pass)) return false; // ${..}, #{..}, <pass>, %s
  return true;
}

/**
 * Blank out comments and string-literal interiors while preserving byte offsets
 * and line breaks, so injection patterns (eval/exec/innerHTML/…) don't match
 * inside a docblock (`* @method … eval()`) or a string literal (`'eval()'`).
 * Line numbers of real matches are unaffected because length is preserved.
 * `#` is only treated as a comment for languages that use it.
 */
export function blankNonCode(code: string, hashComments: boolean): string {
  const out = code.split('');
  const n = code.length;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  while (i < n) {
    const c = code[i];
    const next = i + 1 < n ? code[i + 1] : '';
    if (c === '/' && next === '/') {
      let j = i; while (j < n && code[j] !== '\n') j++; blank(i, j); i = j; continue;
    }
    if (hashComments && c === '#') {
      let j = i; while (j < n && code[j] !== '\n') j++; blank(i, j); i = j; continue;
    }
    if (c === '/' && next === '*') {
      let j = i + 2; while (j < n && !(code[j] === '*' && code[j + 1] === '/')) j++;
      j = Math.min(j + 2, n); blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < n && code[j] !== q) { if (code[j] === '\\') j++; j++; }
      blank(i + 1, j); // keep the quotes, blank the interior
      i = j + 1; continue;
    }
    i++;
  }
  return out.join('');
}

function runPatterns(
  patterns: DetectorPattern[],
  code: string,
  filePath: string,
  snippetSource: string = code,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  for (const p of patterns) {
    const regex = new RegExp(p.regex.source, p.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
      if (p.validate && !p.validate(match[0])) continue;
      const line = getLineNumber(code, match.index);
      findings.push({
        type: p.type,
        severity: p.severity,
        location: {
          file: filePath,
          line,
          snippet: getSnippet(snippetSource, line),
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
      // Ignore format markers like `{MD5}` / `{SHA}` and empty/placeholder
      // literals — a variable named *password* concatenated with a hash-type
      // prefix is not a hardcoded credential.
      validate: isNotFormatMarker,
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
      // GitHub personal access / OAuth / server / refresh tokens.
      regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
      severity: 'critical',
      type: 'secret-leak',
      description: 'GitHub token detected',
      suggestion: 'Revoke the token and load it from a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.95,
    },
    {
      // Slack tokens (bot/user/app/refresh/legacy).
      regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
      severity: 'critical',
      type: 'secret-leak',
      description: 'Slack token detected',
      suggestion: 'Revoke the token and load it from a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.9,
    },
    {
      // Stripe / similar `sk_live_` / `rk_live_` secret keys.
      regex: /\b[sr]k_live_[A-Za-z0-9]{16,}\b/g,
      severity: 'critical',
      type: 'secret-leak',
      description: 'Stripe live secret key detected',
      suggestion: 'Revoke the key and load it from a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.95,
    },
    {
      // Google API key.
      regex: /\bAIza[A-Za-z0-9_\-]{35}\b/g,
      severity: 'high',
      type: 'secret-leak',
      description: 'Google API key detected',
      suggestion: 'Restrict/revoke the key and load it from a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.9,
    },
    {
      // Credentials embedded in a connection URL: scheme://user:pass@host.
      regex: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:'"@/]+:[^\s:'"@/]+@[^\s'"/]+/g,
      severity: 'high',
      type: 'hardcoded-credential',
      description: 'Credentials in a connection string / URL detected',
      suggestion: 'Move the username/password out of the URL into a secrets manager',
      cweId: 'CWE-798',
      confidence: 0.75,
      validate: isNotUrlPlaceholder,
    },
    {
      regex: /['"][A-Za-z0-9]{32,}['"]/g,
      severity: 'medium',
      type: 'secret-leak',
      description: 'Potential API key or secret detected (long random string)',
      suggestion: 'Verify whether this is a secret and move it to environment variables if so',
      cweId: 'CWE-798',
      confidence: 0.6,
      // Only flag genuinely high-entropy, mixed-class strings — not long
      // identifiers or i18n string keys (which are all-lowercase words).
      validate: isLikelySecret,
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
      // Bare builtin eval( only — not member access `x.eval` / `x->eval` /
      // `X::eval` (method calls, e.g. Redis `->eval`), nor `def`/`function`
      // definitions of one's own eval.
      regex: /(?<![.\w>:])(?<!\bdef\s)(?<!\bfunction\s)(?<!\bfn\s)eval\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of eval() detected — potential code injection',
      suggestion:
        'Replace eval() with a safer alternative such as JSON.parse() or a sandboxed interpreter',
      cweId: 'CWE-95',
      confidence: 0.9,
    },
    {
      // Flag dynamic assignments only — `innerHTML = "static"` / `= ''` (clearing
      // or a constant) is not an XSS sink; a variable/expression RHS is.
      regex: /\.innerHTML\s*=\s*[^\s'"=]/g,
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
      // Bare exec( only — not member access `re.exec` / `$schedule->exec` /
      // `X::exec` (method calls) nor `def exec(...)` definitions.
      regex: /(?<![.\w>:])(?<!\bdef\s)(?<!\bfunction\s)(?<!\bfn\s)exec\s*\(/g,
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
    // --- Command injection ---------------------------------------------------
    {
      regex: /\bos\.system\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of os.system() — potential command injection',
      suggestion: 'Use subprocess with an argument list and shell=False',
      cweId: 'CWE-78',
      confidence: 0.85,
    },
    {
      regex: /\bsubprocess\.\w+\([^)]*shell\s*=\s*True/g,
      severity: 'high',
      type: 'injection',
      description: 'subprocess call with shell=True — potential command injection',
      suggestion: 'Pass an argument list and use shell=False',
      cweId: 'CWE-78',
      confidence: 0.8,
    },
    {
      regex: /(?<![.\w>:])(?:shell_exec|passthru|proc_open|popen)\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Use of a shell-execution function — potential command injection',
      suggestion: 'Avoid shell execution of untrusted input; use safe APIs with argument arrays',
      cweId: 'CWE-78',
      confidence: 0.8,
    },
    {
      regex: /(?<![.\w>:])(?<!\bdef\s)(?<!\bfunction\s)system\s*\(/g,
      severity: 'high',
      type: 'injection',
      description: 'Use of system() — potential command injection',
      suggestion: 'Avoid passing untrusted input to system(); use safe execution APIs',
      cweId: 'CWE-78',
      confidence: 0.65,
    },
    {
      regex: /Runtime\.getRuntime\(\)\s*\.\s*exec\s*\(/g,
      severity: 'critical',
      type: 'injection',
      description: 'Runtime.exec() — potential command injection',
      suggestion: 'Use ProcessBuilder with an argument list and validate inputs',
      cweId: 'CWE-78',
      confidence: 0.8,
    },
    // --- SQL injection (formatting/concatenation in DB calls) ----------------
    {
      regex: /\b(?:execute|query|raw|prepare|executemany)\s*\(\s*f['"]/g,
      severity: 'high',
      type: 'injection',
      description: 'Potential SQL injection — f-string in a database call',
      suggestion: 'Use parameterized queries; never build SQL with f-strings',
      cweId: 'CWE-89',
      confidence: 0.75,
    },
    {
      regex: /\b(?:execute|query|raw|prepare)\s*\([^)]*\.format\s*\(/g,
      severity: 'high',
      type: 'injection',
      description: 'Potential SQL injection — .format() building a query',
      suggestion: 'Use parameterized queries instead of str.format()',
      cweId: 'CWE-89',
      confidence: 0.7,
    },
    {
      regex: /\b(?:execute|query|raw)\s*\([^)]*\+/g,
      severity: 'high',
      type: 'injection',
      description: 'Potential SQL injection — string concatenation in a query call',
      suggestion: 'Use parameterized queries instead of string concatenation',
      cweId: 'CWE-89',
      confidence: 0.7,
    },
    // --- Insecure deserialization -------------------------------------------
    // --- Insecure deserialization (low severity: real but commonly intentional
    // in framework internals; triage with --fail-on) ------------------------
    {
      regex: /\bpickle\.loads?\s*\(/g,
      severity: 'low',
      type: 'injection',
      description: 'Insecure deserialization — pickle.load(s) (unsafe on untrusted data)',
      suggestion: 'Never unpickle untrusted data; use a safe format such as JSON',
      cweId: 'CWE-502',
      confidence: 0.6,
    },
    {
      regex: /\byaml\.load\s*\(/g,
      severity: 'low',
      type: 'injection',
      description: 'Insecure deserialization — yaml.load() without SafeLoader',
      suggestion: 'Use yaml.safe_load() instead of yaml.load()',
      cweId: 'CWE-502',
      confidence: 0.6,
    },
    {
      regex: /(?<![.\w>:])unserialize\s*\(/g,
      severity: 'low',
      type: 'injection',
      description: 'Insecure deserialization — unserialize() (unsafe on untrusted data)',
      suggestion: 'Avoid unserialize() on untrusted input; use JSON',
      cweId: 'CWE-502',
      confidence: 0.6,
    },
    // --- Weak cryptography (low: often used for non-security checksums) -------
    {
      regex: /\bhashlib\.(?:md5|sha1)\s*\(|createHash\s*\(\s*['"](?:md5|sha1)['"]/g,
      severity: 'low',
      type: 'injection',
      description: 'Weak cryptographic hash (MD5/SHA-1) detected',
      suggestion: 'Use SHA-256+ (or bcrypt/argon2 for passwords) instead of MD5/SHA-1',
      cweId: 'CWE-327',
      confidence: 0.5,
    },
  ];

  analyze(code: string, filePath: string): SecurityFinding[] {
    // Injection patterns describe *code*, so ignore matches inside comments and
    // string literals (e.g. `* @method … eval()`, `'eval()\'d code'`).
    const hashComments = /\.(py|rb|sh|php|pl|yaml|yml|r)$/i.test(filePath);
    return runPatterns(this.patterns, blankNonCode(code, hashComments), filePath, code);
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
