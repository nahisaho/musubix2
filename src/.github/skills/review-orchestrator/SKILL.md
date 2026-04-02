---
name: review-orchestrator
description: >
  複数AIモデル(opus-4.6/gpt-5.4)による交互レビューでSDD成果物の品質を保証。
  Qiita記事(AI Scrum Team)に着想を得た交互レビューパターンで、
  requirements / design / plan アーティファクトの合意チェックと実装許可判定を行う。
license: MIT
version: "1.0.0"
triggers:
  - レビューオーケストレーション
  - 交互レビュー
  - cross-model review
  - 合意チェック
  - consensus
  - 実装許可
  - review pipeline
  - アーティファクトレビュー
---

# Review Orchestrator

Qiita 記事（AI Scrum Team）に着想を得た、複数 AI モデルによる交互レビューパターンで
SDD 成果物の品質を保証するスキル。
opus-4.6 と gpt-5.4 が交互にレビューし、両モデルの合意を以て実装フェーズへの遷移を許可する。

## 前提条件

- `steering/` を参照済みであること（Article VI: プロジェクトメモリ）
- レビュー対象アーティファクトが `references/musubix2/` に存在すること
- `@musubix2/agent-orchestrator` パッケージの `ReviewOrchestrator` クラスが利用可能であること

## 目的

複数 AI モデルの視点を組み合わせることで、単一モデルでは見落としやすい問題を検出する。
各モデルの得意分野（論理的厳密性 vs 実用性・網羅性）を相補的に活用し、
SDD アーティファクトの品質を最大化する。

## レビュープロセス

### Phase 1: 交互レビュー

```
WHEN アーティファクトのレビューが要求される:
1. Model A (Claude Opus 4.6) がアーティファクトをレビュー
2. 発見された問題を Model B (GPT-5.4) に渡してレビュー
3. Model B の指摘を Model A に渡して再レビュー
4. エラーが 0 になるまで交互に繰り返す（最大 5 ラウンド）
5. 各ラウンドの ReviewResult を記録
```

### Phase 2: 最終合意チェック

```
WHEN 交互レビューでエラーが 0 になった場合:
1. 両モデルが同時（並列）にアーティファクトをレビュー
2. 両方が PASS した場合のみ、そのアーティファクトを「承認済み」とする
3. どちらかが FAIL の場合、Phase 1 に戻る
```

### Phase 3: 実装許可判定

```
WHEN 全アーティファクトの合意チェックが完了した場合:
1. requirements (REQ-*) が承認済みか確認
2. design (DES-*) が承認済みか確認
3. plan (PLAN-*) が承認済みか確認
4. 全て承認済みの場合 canProceedToImplementation() = true
5. 未承認がある場合、不足アーティファクトを報告
```

## 対象アーティファクト

| 種別 | ID 形式 | ファイル例 |
|------|---------|-----------|
| Requirements | REQ-* | `references/musubix2/REQ-MUSUBIX2-001.md` |
| Design | DES-* | `references/musubix2/DES-MUSUBIX2-001.md` |
| Plan | PLAN-* | `references/musubix2/PLAN-MUSUBIX2-001.md` |

## レビュー基準

### Requirements（要件定義書）

- [ ] 全要件が EARS 形式（6パターン）に準拠
- [ ] 各要件に受入基準がチェックリスト形式で存在
- [ ] 一意な ID（REQ-XXX-NNN）が付与されている
- [ ] トレーサビリティフィールド（DES 参照）が存在
- [ ] パッケージフィールドが存在

### Design（設計書）

- [ ] SOLID 原則に準拠した設計
- [ ] DES-ID が対応する REQ-ID にトレース可能
- [ ] 型定義が実装と整合している
- [ ] Mermaid 図（クラス図・シーケンス図）が含まれる
- [ ] 4層アーキテクチャ（Domain/Application/Infrastructure/Interface）に準拠

### Plan（実装計画）

- [ ] タスク間の依存関係が明示されている
- [ ] DES カバレッジが 100%（全 DES に対応タスクが存在）
- [ ] フェーズ順序が SDD ワークフローに準拠
- [ ] 各タスクに見積もりと担当パッケージが記載

## コマンド例

```
@review-orchestrator requirements をレビュー
@review-orchestrator design をレビュー
@review-orchestrator plan をレビュー
@review-orchestrator 全パイプラインレビュー
@review-orchestrator 合意チェックを実行
@review-orchestrator 実装に進めるか確認
```

## 使用するパッケージ

`@musubix2/agent-orchestrator` パッケージの `ReviewOrchestrator` クラスを使用する。

```typescript
import { ReviewOrchestrator } from '@musubix2/agent-orchestrator';

const orchestrator = new ReviewOrchestrator();

// 単一アーティファクトのレビュー
const result = await orchestrator.reviewArtifact('requirements', content);

// パイプラインレビュー（全アーティファクト）
const pipeline = await orchestrator.runPipelineReview({
  requirements: reqContent,
  design: desContent,
  plan: planContent,
});

// 実装許可判定
const canProceed = orchestrator.canProceedToImplementation();
```

## 品質ゲート

- [ ] 交互レビューでエラー 0 を達成
- [ ] 両モデルの最終合意チェックが PASS
- [ ] 全アーティファクト（requirements, design, plan）が承認済み
- [ ] レビュー結果が構造化された ReviewResult として記録済み

## 制約

1. **自動修正は行わない**: 問題点の指摘と修正提案のみを行う。実際の修正はユーザーまたは担当スキルが実施する。
2. **最大5ラウンド制限**: 交互レビューが 5 ラウンドで合意に至らない場合は人間の介入を要求する。無限ループを防止。
3. **品質ゲート bypass 禁止**: レビュー結果を無視して実装フェーズに遷移してはならない。
4. **レビュー結果の永続化**: 全レビュー結果を ReviewResult 形式で記録し、トレーサビリティを維持する。

## Gotchas

1. **モデル応答のばらつき**: 同じアーティファクトでもモデルの応答が異なる場合がある。合意チェックで一貫性を担保する。
2. **ラウンド数と品質のトレードオフ**: ラウンド数が多いほど品質は上がるが、時間コストも増加する。5 ラウンド制限はこのバランスを取るもの。
3. **Phase 遷移との連携**: review-orchestrator の承認は PhaseController の遷移条件に組み込まれる。review-orchestrator 単体では Phase を遷移させない。
