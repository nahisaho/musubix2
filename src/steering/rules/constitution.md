# MUSUBIX2 憲法 (Constitution)

Version: 1.0
Status: Immutable
Enforcement: Mandatory via constitution-enforcer skill

---

## 前文

本憲法は MUSUBIX2 プロジェクトにおけるすべての開発活動を統治する不変のルールを定める。
いかなる変更要求もこれらの条項を覆すことはできない。

---

## Article I — ライブラリファースト (CONST-001)

すべてのパッケージは独立したライブラリとして利用可能でなければならない。
`src/index.ts` を唯一の公開エントリポイントとし、外部依存を最小化する。

## Article II — CLI インターフェース (CONST-002)

すべての機能は CLI コマンドとして公開されなければならない。
`npx musubix <command>` 形式で実行可能であること。

## Article III — テストファースト (CONST-003)

実装コードの前にテストを書かなければならない（Red→Green→Blue）。
カバレッジ閾値 80% を下回るコードはマージできない。

## Article IV — EARS 形式 (CONST-004)

すべての要件は EARS（Easy Approach to Requirements Syntax）形式で記述されなければならない。
6パターン: UBIQUITOUS, EVENT-DRIVEN, STATE-DRIVEN, UNWANTED, OPTIONAL, COMPLEX。

## Article V — トレーサビリティ (CONST-005)

要件 ↔ 設計 ↔ コード ↔ テスト間の 100% トレーサビリティを維持しなければならない。
すべてのコードとテストに EARS 要件 ID をリンクすること。

## Article VI — プロジェクトメモリ (CONST-006)

`steering/` ディレクトリを唯一の信頼できるプロジェクト情報源とする。
すべての開発活動の前に `steering/` を参照すること。

## Article VII — デザインパターン文書化 (CONST-007)

デザインパターンを使用する場合、その選定理由と適用方法を文書化すること。

## Article VIII — ADR 記録 (CONST-008)

重要な設計決定は ADR（Architecture Decision Record）として記録しなければならない。
ステータスライフサイクル: proposed → accepted → deprecated → superseded。

## Article IX — 品質ゲート (CONST-009)

SDD フェーズ遷移時に品質ゲートを通過しなければならない。
ゲートを通過しないフェーズ遷移はブロックされる。
