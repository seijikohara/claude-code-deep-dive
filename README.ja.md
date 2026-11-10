# Claude Code Deep Dive

[English](README.md)

Claude Code **2.1.321** の全機能を解説するリファレンス用のスライド資料です。コマンド、設定、拡張ポイント、マルチエージェント機能、各プラットフォーム、エンタープライズ運用、実験的なオプションまで扱います。
記述はすべて、公式ドキュメント、changelog、インストール済みのバイナリでの実行結果に基づきます。

全章の事実確認が終わったら、<https://seijikohara.github.io/claude-code-deep-dive/> で公開します。

## 版

| 版       | 状況                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| 日本語版 | 執筆中（現時点で約 570 枚）                                                    |
| 英語版   | 準備中。サイトは英語を第一言語、日本語を `/ja/` 以下に置く構成になっています。 |

## 扱う内容

- Part 0: 導入
- Part I: 基礎の深掘り（エージェントループ、モデルと Effort、Fast mode、Advisor、コンテキスト管理、セッション、チェックポイント、メモリ）
- Part II: 操作（スラッシュコマンド全件、キーボードと入力、キーバインド、ステータスライン、出力スタイル、表示）
- Part III: 設定と安全（設定ファイル、設定キー、環境変数、組み込みツール、権限、パーミッションモード、Auto mode、サンドボックス、診断）
- Part IV: 拡張（Hooks、Skills、MCP、プラグインとマーケットプレイス、Mods、Channels、Artifacts）
- Part V: 並列化（サブエージェント、Agent View、Agent Teams、セッション間メッセージング、Dynamic Workflows、worktree、スケジュール実行）
- Part VI: 自動化（ヘッドレス実行、Agent SDK、CI/CD、コードレビュー）
- Part VII: プラットフォーム（Desktop、Web とクラウドセッション、Remote Control、IDE、Chrome、Slack、Claude Tag、Projects）
- Part VIII: エンタープライズ（インストール、認証、管理設定、クラウドプロバイダ、ゲートウェイ、監視とコスト）
- Part IX: まとめ（ステータス一覧、タイムライン、直近のリリース、改名と削除、ドキュメントと実機の食い違い）
- Part X: 全件付録（設定キー 249、環境変数 402、CLI フラグとサブコマンド、Hook イベント 33、組み込みツール 46）

## 確認の方法

- すべての内容スライドに出典を記載します。ドキュメントのページとアンカー、changelog のバージョン、実機で確かめた事実には `実機確認 2.1.321` を付けます。
- 一般提供前の機能には、Beta・Preview・Experimental・Undocumented・Deprecated・Removed のいずれかのステータスを付けます。
- ドキュメント・changelog・実機の記述が食い違う箇所では、両方の説を並べて示します。
- `tools/check.mjs` がヘッドレス Chrome で全スライドを表示し、はみ出し・枠内スクロール・出典の欠落を検出します。
- `tools/lint.mjs` が、識別子と調査資料の照合、個人情報の混入、付録の網羅、出典の有無を検査します。

## 開発

必要なもの: Node.js 26（`.nvmrc`）、pnpm 12（`package.json` の `packageManager`）。

```sh
pnpm install
pnpm dev          # http://localhost:4321/claude-code-deep-dive/ でローカル表示
pnpm build        # dist/ に静的サイトを出力
pnpm check        # 整形・lint・型検査・単体テスト
```

スライド用のツール:

```sh
pnpm deck:build                                   # 単体版 index.html と claude.ai Artifact 用の断片を出力
node tools/check.mjs --url=http://localhost:4321/claude-code-deep-dive/ja/deck/
node tools/lint.mjs --html dist/ja/deck/index.html --only=privacy,coverage,sources
```

識別子の照合（`--only=ids`）とデータ抽出（`tools/extract.mjs`）には、公式ドキュメントを写したローカルの調査資料（`CCDD_RESEARCH`）が必要です。調査資料はコミットしません。

## 構成

| パス                                      | 内容                                                                   |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `src/chapters/`                           | 日本語版スライドのソース（1 章 1 ファイル）                            |
| `src/deck.css`                            | reveal.js の `white` テーマに重ねるデザイン                            |
| `src/pages/`、`src/layouts/`、`src/i18n/` | Astro のページ（英語のトップ、日本語のトップ、日本語版スライド）       |
| `data/`                                   | 付録の表（名前、日本語の要約、ステータス、ドキュメントのアンカー）     |
| `tools/`                                  | スライドのレンダラー、単体ビルド、lint、レイアウト検査、データ用ツール |
| `docs/`                                   | 設計書、計画、執筆ガイド、共有の事実台帳                               |

## デプロイ

`.github/workflows/deploy.yml` が Astro でビルドし、GitHub Pages にデプロイします。
リポジトリ変数 `DEPLOY_PAGES` を `true` にするまで、デプロイは動きません。

## 免責

非公式のリファレンスです。Anthropic とは関係がなく、Anthropic の承認も受けていません。
