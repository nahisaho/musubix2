# MUSUBIX2 アプリ開発ガイド ① — 要件定義からはじめる（グリーンフィールド）

このガイドは、新規アプリケーションを **要件定義から** MUSUBIX2 の SDD
（Specification Driven Development）ワークフローで開発する手順を、実際のコマンドと
出力とともに解説します。題材は **URL短縮サービス** です。

> このガイド内のコマンド出力は MUSUBIX2 `v0.5.83` で実際に実行して取得したものです。

---

## 0. MUSUBIX2 と SDD の考え方

MUSUBIX2 は「要件 → 設計 → コード → テスト」を**トレーサビリティを保ったまま**
自動生成する Neuro-Symbolic なコーディング支援システムです。中心にあるのが
**EARS 形式の要件**で、以下の 6 パターンに正規化されます。

| EARS パターン | 構文 | 例 |
|---------------|------|----|
| ubiquitous | THE system SHALL … | 常時成り立つ要件 |
| event-driven | WHEN …, THE system SHALL … | イベント駆動 |
| state-driven | WHILE …, THE system SHALL … | 状態駆動 |
| unwanted | IF …, THEN THE system SHALL … / THE system SHALL NOT … | エラー処理・禁止 |
| optional | WHERE …, THE system SHALL … | 任意機能 |
| complex | WHILE … WHEN …, THE system SHALL … | 複合 |

このパターンが、設計パターン検出・SMT 形式検証・コード雛形の構造を決定します。

---

## 1. インストールとプロジェクト初期化

```bash
npm install -g musubix2       # もしくは各コマンドを npx musubix2 … で実行
```

プロジェクトを初期化します。基本形は SDD の骨格（`steering/`・`storage/specs/`・
`musubix.config.json`）を生成します。

```bash
musubix init url-shortener --name "URLShortener"
```

```
✅ Initialized project "URLShortener" at url-shortener
  url-shortener/steering/product.ja.md
  …
```

生成される構造:

```
url-shortener/
├── steering/                       # プロジェクトメモリ（Article IV）
│   ├── product.ja.md               #   プロダクト概要
│   ├── structure.ja.md             #   構造
│   ├── tech.ja.md                  #   技術スタック
│   ├── project.yml
│   └── rules/constitution.md       #   9 憲法条項
├── storage/specs/
│   ├── requirements/               #   要件（.md を配置）
│   ├── designs/  plans/  reviews/
├── storage/tasks/tasks.md
└── musubix.config.json
```

> **冪等**: 再実行しても既存ファイルは上書きされません（編集済みの steering
> ドキュメントは保護されます）。テンプレートを初期化し直したい場合は `--force`。

### AI エージェント連携（任意）

`--platform`（`claude` / `copilot` / `both`）を付けると、上記に加えて
`CLAUDE.md`・`.mcp.json`（MCP サーバー：61 ツール）・`.claude/skills/`（8 つの
SDD スキル）がセットアップされ、Claude Code / GitHub Copilot から MUSUBIX2 を
使えるようになります。

```bash
musubix init url-shortener --platform claude --name "URLShortener"
```

---

## 2. 要件定義（EARS）

`storage/specs/requirements/requirements.md` に EARS 形式で要件を記述します。ID は
`REQ-<ドメイン>-<番号>`（ドメインコードは 2〜6 文字）とします。

```markdown
# URL短縮サービス 要件

## REQ-LINK-001: 短縮リンク作成
**要件**: WHEN a user submits a long URL, THE system SHALL create a short link.

## REQ-LINK-002: リダイレクト
**要件**: WHEN a visitor requests a short link, THE system SHALL redirect to the original URL.

## REQ-LINK-003: 有効期限内の解決
**要件**: WHILE a link is within its expiry window, THE system SHALL resolve the link.

## REQ-STAT-001: クリック計測
**要件**: WHEN a short link is visited, THE system SHALL record a click event.

## REQ-SEC-001: 悪意あるURLの拒否
**要件**: IF a submitted URL is on the blocklist, THEN THE system SHALL reject the request.

## REQ-SEC-002: IPアドレスの平文保存禁止
**要件**: THE system SHALL NOT store client IP addresses in plain text.
```

> **書式の柔軟性**: `**要件**:` マーカーは任意です。見出し直下に EARS 文を
> 直接書いても（`## REQ-LINK-001: 短縮リンク作成` の次行に `WHEN … SHALL …`）
> 同じように解析・検証されます。

### EARS 検証

```bash
musubix requirements analyze storage/specs/requirements/requirements.md
```

```
REQ-LINK-001: pattern=event-driven, confidence=1.00
REQ-LINK-002: pattern=event-driven, confidence=1.00
REQ-LINK-003: pattern=state-driven, confidence=1.00
REQ-STAT-001: pattern=event-driven, confidence=1.00
REQ-SEC-001: pattern=unwanted, confidence=1.00
REQ-SEC-002: pattern=unwanted, confidence=0.95
```

各要件の EARS パターンと信頼度が表示されます。信頼度が低い（< 0.5）要件は EARS
として曖昧なので書き直しましょう。対話的に要件を作りたい場合は
`musubix req:interview`（1問1答）や `musubix req:wizard` も使えます。

---

## 3. 設計生成（C4 / SOLID）

要件から設計成果物（`design.json`）を生成します。`--out` を付けると、後続の
codegen / design:verify / design:c4 に渡せる再利用可能な JSON になります。

```bash
musubix design generate storage/specs/requirements/requirements.md --out design.json
```

```
✅ Wrote design artifact: design.json (3 section(s))
```

MUSUBIX2 は **ドメイン（ID プレフィックス）ごとに要件を凝集**し、1 サービスに
まとめます。各セクションは EARS パターンから設計パターンを検出します。

| セクション | 検出パターン | コンポーネント（メソッド） |
|-----------|-------------|--------------------------|
| REQ-LINK | Observer, State | `LinkService(createShortLink / redirectOriginalUrl / resolveLink)` |
| REQ-STAT | Observer | `RecordClickEventService(recordClickEvent)` |
| REQ-SEC | Strategy | `SecService(rejectRequest / rejectStoreClientIpAddresses)` |

複数要件のドメイン（LINK, SEC）は 1 つの凝集サービス（`LinkService` / `SecService`、
ドメイン名由来）にまとまります。単一要件の REQ-STAT はタイトル由来ですが、タイトルが
日本語（非ASCII）のため、SHALL 句から導出した操作名にフォールバックして
`RecordClickEventService` になります。

### SOLID 検証

```bash
musubix design:verify design.json
```

```
✅ All SOLID principles satisfied
Score: 100/100
```

C4 図が欲しい場合は `musubix design:c4 design.json --level container` を実行します。

---

## 4. コード生成

設計からコード雛形を生成します。`--out` でファイルに書き出すと、そのまま
`test:gen` に渡せます。

```bash
musubix codegen generate design.json --out src/link.ts
```

生成される `LinkService`（抜粋）:

```typescript
export interface Link {
  // TODO: define the Link shape
}
export interface ShortLink {
  // TODO: define the ShortLink shape
}

// Implements: REQ-LINK-001, REQ-LINK-002, REQ-LINK-003
export interface ILinkService {
  createShortLink(longUrl: string): ShortLink;
  redirectOriginalUrl(): void;
  resolveLink(): Link;
}

export enum LinkServiceState {
  Idle = 'idle',
  Within = 'within',
}

export class LinkService implements ILinkService {
  private state: LinkServiceState = LinkServiceState.Idle;
  private readonly listeners: Array<(event: unknown) => void> = [];
  on(handler: (event: unknown) => void): void { this.listeners.push(handler); }
  createShortLink(longUrl: string): ShortLink { throw new Error('Not implemented'); }
  // …
}
```

生成コードには以下が **要件から自動で反映** されます。

- **トレーサビリティ コメント** `// Implements: REQ-LINK-001, …`（Article V）
- **戻り値型の推論**（`createShortLink(...): ShortLink`）と、未定義エンティティ型の
  プレースホルダ宣言（`interface ShortLink {}`）→ 生成物は `tsc --strict` を通ります
- **引数の推論**: 入力を表す句（「submits a long URL」）からパラメータを導出
  （`createShortLink(longUrl: string)`）
- **設計パターンの雛形**: Observer → `on/emit`、State → 状態 enum、
  Feature Toggle → `enabled` フラグ ガード
- **State enum の状態推論**: 「WHILE a link is **within** its expiry window」から
  `Within` を推論
- **interface 抽出（DIP）**: 複数操作を持つサービスは `ILinkService` を
  `implements`（単一メソッドのクラスは具象のまま — Article VIII: Anti-Abstraction）

あとは各メソッドの `throw new Error('Not implemented')` を実装していくだけです。

---

## 5. テスト生成

生成したソースからテスト雛形を作ります（公開メソッドごとに 1 テスト）。

```bash
musubix test:gen src/link.ts
```

`link.ts` に対して 9 個の `it(...)` ブロックが生成されます（`describe` は
サービス単位、各公開メソッドに `should work` テスト）。Article III（Test-First）に
沿って、この雛形の Red → Green → Blue を回します。

---

## 6. 形式検証（EARS → SMT）

要件の論理的な整合性を SMT（Satisfiability Modulo Theories）で検証します。z3 が
なければ mock ソルバーにフォールバックします。

```bash
musubix verify storage/specs/requirements/requirements.md
```

```
Formal verification of 6 requirement(s):
  ✓ REQ-LINK-001 [event-driven] → (assert (=> a_user_submits_a_long_url create_a_short_link))
  ✓ REQ-LINK-003 [state-driven] → (assert (=> a_link_is_within_its_expiry_window resolve_the_link))
  ✓ REQ-SEC-001 [unwanted]      → (assert (=> a_submitted_url_is_on_the_blocklist reject_the_request))
  ✓ REQ-SEC-002 [unwanted]      → (assert (not store_client_ip_addresses_in_plain_text))
✅ The 6 formalised requirement(s) are logically consistent (solver: mock-4.12.0).
```

EARS パターンごとに正しい意味論で SMT 化されます — IF-THEN は含意
`(=> 条件 動作)`、`SHALL NOT` は否定 `(not 動作)`、状態＋禁止も
`(=> 状態 (not 動作))`。矛盾する要件があると `inconsistent` として検出されます。

---

## 7. トレーサビリティ

生成コードには `// Implements: REQ-…` が入っているので、要件 ↔ コードの被覆率を
計測できます。

```bash
musubix trace matrix --specs storage/specs/requirements/requirements.md --src src
```

```
Requirements: 6, referenced in code: 6 (100%), source files: 1
```

特定要件を変更したときの影響範囲は**シンボル（クラス/関数）単位**で分析されます。

```bash
musubix trace impact REQ-LINK-001 --specs storage/specs/requirements/requirements.md --src src
```

```
Impact analysis for REQ-LINK-001:
  Level: medium
  Affected: 3 item(s) (1 symbol(s), 2 requirement(s))
```

`REQ-LINK-001` を変えると `LinkService` と、同じサービスを共有する
`REQ-LINK-002 / REQ-LINK-003` が影響を受ける、と分かります（同一ファイルでも別
クラスの要件は結合として報告されません）。CI で未参照要件を落としたい場合は
`musubix trace:verify --specs … --src … --strict`（未被覆で非ゼロ終了）を使います。

---

## 8. セキュリティ スキャン

```bash
musubix security src
```

```
Security scan: src (1 file(s))
Total findings: 0
```

生成された骨格はまだロジックが空なので検出はありません。実装を進める中で
危険なパターンが混入すると検出されます。例えば次のような TS を書くと:

```typescript
const sql = `SELECT * FROM users WHERE id = ${userId}`;
db.execute(sql);
```

```
  HIGH (1):
    - SQL injection — a dynamically-built string flows into a query
      (variable 'sql' built at line 1)
```

MUSUBIX2 の taint 解析は**変数をまたいだデータフロー**を追跡します — 動的に
組み立てた文字列（文字列連結・テンプレートリテラル）が `const`/`let` 変数を
経由してクエリ・シェル・`eval` などのシンクに到達する経路を検出します。
パラメータ化クエリ（`db.query(sql, [id])`）や無害なテンプレートリテラルは
誤検出しません。秘密情報も検出対象です。CI で使う場合は `--fail-on high` などで
重大度しきい値を超えたら失敗させます。

---

## 9. まとめ — 一気通貫のフロー

```bash
musubix init myapp --name myapp               # 0. 初期化（--platform で AI 連携も）
# storage/specs/requirements/requirements.md を EARS で記述
musubix requirements analyze storage/specs/requirements/requirements.md   # 1. 要件検証
musubix design generate  storage/specs/requirements/requirements.md --out design.json  # 2. 設計
musubix design:verify    design.json          #    SOLID 検証
musubix codegen generate design.json --out src/app.ts        # 3. コード
musubix test:gen         src/app.ts           # 4. テスト
musubix verify           storage/specs/requirements/requirements.md        # 5. 形式検証
musubix trace matrix     --specs storage/specs/requirements/requirements.md --src src  # 6. トレース
musubix security         src                  # 7. セキュリティ
```

要件を 1 箇所（`requirements.md`）で管理し、設計・コード・テスト・トレースを
そこから導出することで、**仕様と実装の乖離を構造的に防ぎます**。生成物は
「空クラス」ではなく、パターン・状態・インターフェース・トレースを備えた
**型安全な実装可能骨格**です。

既存コードベースの分析・リファクタリングには
[ガイド ②（CodeGraph）](./guide-refactoring-ja.md) を参照してください。
