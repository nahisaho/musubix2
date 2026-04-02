# MUSUBIX2 実装タスク分割計画

## 概要

DES-MUSUBIX2-001 v1.5（69 DES仕様）に基づき、25パッケージのTypeScript monorepoを段階的に実装する。
依存グラフのトポロジカルソート順に、8フェーズで構築する。

## フェーズ構成

### Phase 0: プロジェクト基盤
> 全パッケージの前提となるmonorepo基盤とツール設定

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P0-01 | monorepo初期化（npm workspaces, tsconfig.base.json, vitest, eslint） | DES-PKG-001, DES-INF-001, DES-ARC-001 | `musubix` (root) | なし |
| P0-02 | Vitest共通設定 + テストヘルパー/fixtures基盤 | DES-GOV-002 | root/testing/ | P0-01 |
| P0-03 | CI/CDワークフロー（GitHub Actions） | DES-INF-001 | .github/ | P0-01 |
| P0-04 | Dockerfile + docker-compose | DES-INF-002 | docker/ | P0-01 |
| P0-05 | steering/ ディレクトリ構造（constitution, rules, project.yml） | DES-GOV-001, DES-KNW-003 | root/steering/ | P0-01 |
| P0-06 | 仮想プロジェクト基盤（16プロジェクト、steering/specs/tasks を含む完全なSDD成果物） | DES-INF-003 | virtual-projects/ | P0-01 |

### Phase 1: Core層
> 全パッケージが依存する基盤パッケージ群

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P1-01 | @nahisaho/musubix-core: エラー処理（ActionableError, GracefulDegradation, CircuitBreaker） | DES-ARC-004 | core | P0-01 |
| P1-02 | @nahisaho/musubix-core: ログ・監査（Logger, AuditLogger, ErrorFormatter） | DES-ARC-004 | core | P1-01 |
| P1-03 | @nahisaho/musubix-core: 設定管理（ConfigLoader, musubix.config.json） | DES-ARC-004 | core | P1-01 |
| P1-04 | @nahisaho/musubix-core: リポジトリ抽象（IRepository, ISearchableRepository, IPaginatedRepository） | DES-ARC-004 | core | P1-01 |
| P1-05 | @nahisaho/musubix-core: ファクトリパターン（createInMemoryRepository等） | DES-ARC-002 | core | P1-04 |
| P1-06 | @nahisaho/musubix-core: CLI基盤（Commander.js, registerXCommand, ExitCode） | DES-ARC-003 | core/cli | P1-01 |
| P1-07 | @nahisaho/musubix-core: REPL Engine（readline, tab completion, history, session, formatter） | DES-CLI-001 | core/cli | P1-06 |
| P1-08 | @nahisaho/musubix-core: EARS Validator（EARSPattern分類, 信頼度スコア） | DES-REQ-001 | core/requirements | P1-01 |
| P1-09 | @nahisaho/musubix-core: 推論説明生成（ReasoningChainRecorder, ExplanationGenerator） | DES-EXP-001 | core/explanation | P1-01 |
| P1-10 | @nahisaho/musubi: Musubiラッパー | DES-PKG-001 | musubi | P1-01 |

### Phase 2: Knowledge / SDD層
> 知識グラフ、意思決定、ポリシー、オントロジー

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P2-01 | @musubix/knowledge: FileKnowledgeStore, Entity/Relation, DFS traversal | DES-KNW-001 | knowledge | P1-01 |
| P2-02 | @musubix/decisions: ADR管理（ADRManager, create/list/get/accept/deprecate/search/index, ADRFilter） | DES-DES-003 | decisions | P1-01 |
| P2-03 | @musubix/policy: PolicyEngine, NonNegotiablesEngine, 9 constitutionPolicies | DES-KNW-002, DES-GOV-001 | policy | P2-01 |
| P2-04 | @musubix/policy: BalanceRuleEngine (90/10), ComplianceChecker | DES-KNW-002, DES-GOV-001 | policy | P2-03 |
| P2-05 | @nahisaho/musubix-sdd-ontology: OntologyModule, OntologyLoader, OntologyValidator | DES-INT-003 | sdd-ontology | P1-01 |
| P2-06 | @nahisaho/musubix-ontology-mcp: N3Store, RuleEngine, ConsistencyValidator, PrivacyGuard | DES-INT-002 | ontology-mcp | P2-05 |

### Phase 3: Analysis / Verification層
> コード解析、データフロー、セキュリティ、形式検証（Phase 2と並列実行可）

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P3-01 | @nahisaho/musubix-codegraph: ASTParser, GraphEngine, 3 StorageAdapters（16言語, regex fallback） | DES-CG-001 | codegraph | P1-01 |
| P3-02 | @nahisaho/musubix-codegraph: GraphRAGSearch | DES-CG-001 | codegraph | P3-01 |
| P3-03 | @nahisaho/musubix-codegraph: TestPlacementValidator, TestPlacementReport | DES-CG-003 | codegraph/validator | P3-01 |
| P3-04 | @nahisaho/musubix-dfg: DataFlowAnalyzer, DFGNode/Edge, CFGNode | DES-CG-002 | dfg | P1-01 |
| P3-05 | @nahisaho/musubix-formal-verify: EarsToSmtConverter, Z3Adapter (WASM+process) | DES-FV-001 | formal-verify | P1-01 |
| P3-06 | @nahisaho/musubix-lean: LeanIntegration, LeanEnvironmentDetector, HybridVerifier | DES-FV-002 | lean | P1-01 |
| P3-07 | @nahisaho/musubix-security: ComplianceChecker, SecurityFinding | DES-COD-003 | security | P1-01, P3-05 |

### Phase 4: SDD Workflow層
> ワークフローエンジン、要件・設計・コード生成パイプライン

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P4-01 | @nahisaho/musubix-workflow-engine: PhaseController, StateTracker | DES-SDD-001, DES-SDD-002a/b/c | workflow-engine | P1-01 |
| P4-02 | @nahisaho/musubix-workflow-engine: QualityGateRunner, ExtendedQualityGateRunner | DES-SDD-003 | workflow-engine | P4-01 |
| P4-03 | @nahisaho/musubix-workflow-engine: タスク分解・ファイルベースCLI（TaskInfo, TaskDocumentConfig） | DES-SDD-004 | workflow-engine, core | P4-01 |
| P4-04 | core: プロジェクト初期化（InitOptions, ProjectInitializer, .github/skills/） | DES-SDD-005 | core/cli | P4-01 |
| P4-05 | core: 要件分析（RequirementsValidator, MarkdownEARSParser, TraceabilityValidator） | DES-REQ-002 | core/validators | P1-08 |
| P4-06 | core: 対話的要件作成（RequirementWizard, AcceptanceCriteriaGenerator） | DES-REQ-003 | core/requirements | P1-01 |
| P4-07 | core: 設計文書生成（DesignGenerator, SOLIDValidator） | DES-DES-001 | core/design | P1-01, P2-02 |
| P4-08 | core: C4ダイアグラム生成（C4Element, C4Relationship） | DES-DES-002 | core/design | P4-07 |
| P4-09 | core: 設計検証（PatternDetector） | DES-DES-004 | core/design | P4-07 |
| P4-10 | core: コード生成（CodeGenerator, TemplateType） | DES-COD-001 | core/codegen | P1-08 |
| P4-11 | core: 静的解析（StaticAnalyzer, QualityMetricsCalculator） | DES-COD-002 | core/codegen | P3-01 |
| P4-12 | core: ドメインスキャフォールド（ScaffoldGenerator, 3モード） | DES-COD-004 | core/codegen | P4-10 |
| P4-13 | core: テスト生成（UnitTestGenerator, CoverageReporter, EARS ID linkage） | DES-COD-005 | core/codegen | P4-10 |
| P4-14 | core: ステータス遷移分析（StatusTransitionGenerator） | DES-COD-006 | core/codegen | P4-10 |
| P4-15 | core: トレーサビリティ管理（TraceabilityManager, TraceLink） | DES-TRC-001 | core/traceability | P1-01 |
| P4-16 | core: トレーサビリティマトリクス（MatrixGenerator, GapInfo） | DES-TRC-002 | core/traceability | P4-15 |
| P4-17 | core: トレーサビリティ検証・同期（ImpactAnalyzer, TraceSyncService） | DES-TRC-003 | core/traceability | P4-15 |
| P4-18 | core/policy: Test-First Policy（Red-Green-Blue cycle, CoverageGateConfig） | DES-GOV-002 | policy, workflow-engine | P2-03, P4-02 |
| P4-19 | core: ニューロシンボリック統合（SemanticCodeFilterPipeline, HallucinationDetector, ResultBlender等） | DES-INT-001 | core/symbolic | P1-01 |
| P4-20 | core: 自己学習エンジン（LearningEngine, PatternExtractor, PatternCache, FeedbackCollector） | DES-LRN-001 | core/learning | P1-01 |

### Phase 5: Agent層 + MCPサーバー
> エージェントオーケストレーション、エキスパート委譲、スキル管理、MCPサーバー

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P5-01 | @nahisaho/musubix-agent-orchestrator: AgentTask, SubagentDispatcher, SubagentSpec | DES-AGT-001 | agent-orchestrator | P1-01 |
| P5-02 | @nahisaho/musubix-agent-orchestrator: WorkstreamManager, ParallelExecutor, ResultAggregator | DES-AGT-001 | agent-orchestrator | P5-01 |
| P5-03 | @nahisaho/musubix-expert-delegation: Expert, SemanticRouter, TriggerPattern | DES-AGT-002 | expert-delegation | P1-01, P3-05, P2-06 |
| P5-04 | @nahisaho/musubix-expert-delegation: DelegationEngine (7 experts) | DES-AGT-002 | expert-delegation | P5-03 |
| P5-05 | @nahisaho/musubix-workflow-engine: AGT-003 re-exports + skill-workflow-bridge | DES-AGT-003 | workflow-engine | P4-01, P5-01 |
| P5-06 | @nahisaho/musubix-skill-manager: Skill, SkillMetadata, SkillRegistry, SkillManager | DES-AGT-004 | skill-manager | P1-01 |
| P5-07 | @nahisaho/musubix-skill-manager: SkillExecutor, SkillContext, SkillResult | DES-AGT-004 | skill-manager | P5-06 |
| P5-08 | @nahisaho/musubix-assistant-axis: DriftAnalyzer, DomainClassifier, IdentityManager | DES-AGT-005 | assistant-axis | P1-01 |
| P5-09 | @nahisaho/musubix-mcp-server: MCPServer, ToolDefinition, ToolHandler, 105+ツール登録, Claude Code/Copilot/Cursor向けプラットフォームアダプタ | DES-MCP-001 | mcp-server | P2-02, P2-03, P3-01, P5-08 |

### Phase 6: スキルハーネス層
> ハーネス最適化 Agent Skills（DES-SKL-001〜006）

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P6-01 | SkillRuntimeContract, SkillInput, SkillExecutionOptions, SkillMetrics, SkillError | DES-SKL-001 | skill-manager | P5-07 |
| P6-02 | SkillParameter, SkillIOSchema, SkillSchemaValidator, Zod統合 | DES-SKL-002 | skill-manager | P6-01 |
| P6-03 | SkillTestHarness, MockProvider, ファクトリヘルパー, Vitest統合 | DES-SKL-003 | skill-manager, workflow-engine | P6-01, P4-02 |
| P6-04 | SkillRouter, CapabilityMatcher, EnhancedSubagentDispatcher | DES-SKL-004 | agent-orchestrator, expert-delegation, skill-manager | P5-02, P5-04, P6-01 |
| P6-05 | SkillToMCPBridge, SkillToolConverter, 自動同期FileWatcher | DES-SKL-005 | mcp-server, skill-manager | P6-02, P5-09 |
| P6-06 | SkillDependencyResolver, SkillVersionManager | DES-SKL-006 | skill-manager | P6-01 |

### Phase 7: Learning / Research / Integration層
> 学習システム、ディープリサーチ、横断的関心事、統合

| タスクID | タスク | DES | パッケージ | 依存 |
|----------|--------|-----|-----------|------|
| P7-01 | @nahisaho/musubix-neural-search: NeuralSearchEngine, IEmbeddingModel | DES-LRN-004 | neural-search | P1-01 |
| P7-02 | @nahisaho/musubix-wake-sleep: WakePhase, SleepPhase, CycleManager | DES-LRN-002 | wake-sleep | P1-01 |
| P7-03 | @nahisaho/musubix-library-learner: LibraryLearner, EGraphEngine | DES-LRN-003 | library-learner | P1-01 |
| P7-04 | @nahisaho/musubix-synthesis: SynthesisEngine, DSLBuilder, VersionSpaceManager | DES-LRN-005 | synthesis | P7-01 |
| P7-05 | @nahisaho/musubix-pattern-mcp: ASTPatternExtractor, PatternLibrary, PatternMCPServer | DES-LRN-006 | pattern-mcp | P1-01 |
| P7-06 | core: RealtimeLearningEngine, 学習統合ダッシュボード | DES-LRN-001 | core/learning | P4-20, P7-01, P7-02 |
| P7-07 | @nahisaho/musubix-deep-research: ResearchEngine, KnowledgeAccumulator, SecurityFilter | DES-RSC-001 | deep-research | P2-01, P5-02, P5-04, P7-01, P4-01 |
| P7-08 | core: ドメインサポート（DomainDetector, ComponentInference, 62ドメイン） | DES-DOM-001 | core/codegen, sdd-ontology | P1-01, P2-05 |
| P7-09 | core: パフォーマンス最適化（LazyLoader, PerformanceCache, MemoryMonitor, Benchmark） | DES-PER-001 | core/perf | P1-01 |
| P7-10 | core: ファイル監視（FileWatcher, TaskScheduler, LintRunner/TestRunner/SecurityRunner） | DES-MON-001 | core/watch | P1-01 |
| P7-11 | core/workflow-engine: 品質ゲートレポート（QualityGateReporter, GateSummary） | DES-MON-002 | scripts, workflow-engine | P4-02 |
| P7-12 | musubix: CLIエントリポイント統合 | DES-PKG-001 | musubix | 全Phase |
| P7-13 | 統合テスト（パッケージ間結合テスト、E2Eテスト） | — | root/tests | 全Phase |

## 依存グラフ要約

```
Phase 0 (基盤) → Phase 1 (Core) → Phase 2 (Knowledge/SDD) ─┐
                                  → Phase 3 (Analysis/Verify)─┤ 並列可
                                                              ↓
                                  Phase 4 (Workflow/Generation)
                                           ↓
                                  Phase 5 (Agent + MCP)
                                           ↓
                                  Phase 6 (Skill Harness)
                                           ↓
                                  Phase 7 (Learning/Research/Integration)
```

Phase 2 と Phase 3 は並列実行可能。Phase 4 以降は順序依存。
MCPサーバーは Phase 5 の P5-09 として配置し、P6-05 → P5-09 の依存を明確化する。

## 実装方針

- **テストファースト**: 各タスクは Red→Green→Blue サイクルで実装
- **パッケージ単位**: 1パッケージずつ domain → application → infrastructure → interface の順で構築
- **CLI契約**: 各パッケージの interface/cli/ に Commander.js コマンドを実装し、DES の CLI契約に準拠
- **品質ゲート**: Phase完了時に Vitest カバレッジ 80%以上を確認

## 統計

| 項目 | 数 |
|------|-----|
| フェーズ数 | 8 (Phase 0〜7) |
| 総タスク数 | 77 |
| 対応DES数 | 69（全DES網羅） |
| パッケージ数 | 25 |

## DESトレーサビリティ

全69 DES仕様のタスクマッピング:

| DES ID | タスクID |
|--------|---------|
| DES-ARC-001 | P0-01 |
| DES-ARC-002 | P1-05 |
| DES-ARC-003 | P1-06 |
| DES-ARC-004 | P1-01〜P1-04 |
| DES-SDD-001, 002a/b/c | P4-01 |
| DES-SDD-003 | P4-02 |
| DES-SDD-004 | P4-03 |
| DES-SDD-005 | P4-04 |
| DES-REQ-001 | P1-08 |
| DES-REQ-002 | P4-05 |
| DES-REQ-003 | P4-06 |
| DES-DES-001 | P4-07 |
| DES-DES-002 | P4-08 |
| DES-DES-003 | P2-02 |
| DES-DES-004 | P4-09 |
| DES-COD-001 | P4-10 |
| DES-COD-002 | P4-11 |
| DES-COD-003 | P3-07 |
| DES-COD-004 | P4-12 |
| DES-COD-005 | P4-13 |
| DES-COD-006 | P4-14 |
| DES-TRC-001 | P4-15 |
| DES-TRC-002 | P4-16 |
| DES-TRC-003 | P4-17 |
| DES-KNW-001 | P2-01 |
| DES-KNW-002 | P2-03, P2-04 |
| DES-KNW-003 | P0-05 |
| DES-INT-001 | P4-19 |
| DES-INT-002 | P2-06 |
| DES-INT-003 | P2-05 |
| DES-FV-001 | P3-05 |
| DES-FV-002 | P3-06 |
| DES-CG-001 | P3-01, P3-02 |
| DES-CG-002 | P3-04 |
| DES-CG-003 | P3-03 |
| DES-LRN-001 | P4-20, P7-06 |
| DES-LRN-002 | P7-02 |
| DES-LRN-003 | P7-03 |
| DES-LRN-004 | P7-01 |
| DES-LRN-005 | P7-04 |
| DES-LRN-006 | P7-05 |
| DES-AGT-001 | P5-01, P5-02 |
| DES-AGT-002 | P5-03, P5-04 |
| DES-AGT-003 | P5-05 |
| DES-AGT-004 | P5-06, P5-07 |
| DES-AGT-005 | P5-08 |
| DES-MCP-001 | P5-09 |
| DES-RSC-001 | P7-07 |
| DES-GOV-001 | P0-05, P2-03, P2-04 |
| DES-GOV-002 | P0-02, P4-18 |
| DES-EXP-001 | P1-09 |
| DES-DOM-001 | P7-08 |
| DES-PER-001 | P7-09 |
| DES-INF-001 | P0-01, P0-03 |
| DES-INF-002 | P0-04 |
| DES-INF-003 | P0-06 |
| DES-MON-001 | P7-10 |
| DES-MON-002 | P7-11 |
| DES-CLI-001 | P1-07 |
| DES-PKG-001 | P0-01, P1-10, P7-12 |
| DES-SKL-001 | P6-01 |
| DES-SKL-002 | P6-02 |
| DES-SKL-003 | P6-03 |
| DES-SKL-004 | P6-04 |
| DES-SKL-005 | P6-05 |
| DES-SKL-006 | P6-06 |
