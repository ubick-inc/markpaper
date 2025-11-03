# MarkPaper テストスイート

このディレクトリには、MarkPaperの各機能をテストするためのMarkdownファイルが含まれています。

## ディレクトリ構造

```
tests/
├── 01-basic-typography.md        # 基本タイポグラフィ
├── 02-basic-code-block.md        # コードブロック
├── 03-basic-table.md             # テーブル
├── 04-basic-blockquote.md        # 引用
├── 05-image-online.md            # オンライン画像
├── 06-image-local.md             # ローカル画像
├── 07-image-mixed.md             # 混在画像
├── 08-mermaid-flowchart.md       # Mermaidフローチャート
├── 09-mermaid-sequence.md        # Mermaidシーケンス図
├── 10-mermaid-class.md           # Mermaidクラス図
├── 11-mermaid-architecture.md    # Mermaidアーキテクチャ図
├── 12-page-break-h1.md           # H1改ページ
├── 13-page-break-avoid.md        # 改ページ回避
├── 14-page-numbers.md            # ページ番号とアウトライン
├── assets/                       # テスト用画像ファイル
├── e2e/                          # E2Eテスト
├── output/                       # PDF出力先（gitignore）
└── unit/                         # ユニットテスト
```

## テストの原則

### 1ページ原則
- 改ページテスト以外は、原則として1ページに収まるように設計
- PNG比較やビジュアルリグレッションテストを容易にするため

### テストケースの分離
- 各機能ごとに独立したMarkdownファイルを作成
- 機能の組み合わせテストも個別ファイルで管理
- ファイル名に番号を振ってテスト順序を明確化

## テスト実行方法

### 個別テスト

```bash
# 基本機能テスト
markpaper tests/01-basic-typography.md -o output/01-basic-typography.pdf
markpaper tests/02-basic-code-block.md -o output/02-basic-code-block.pdf
markpaper tests/03-basic-table.md -o output/03-basic-table.pdf
markpaper tests/04-basic-blockquote.md -o output/04-basic-blockquote.pdf

# 画像テスト
markpaper tests/05-image-online.md -o output/05-image-online.pdf
markpaper tests/06-image-local.md -o output/06-image-local.pdf
markpaper tests/07-image-mixed.md -o output/07-image-mixed.pdf

# Mermaidテスト
markpaper tests/08-mermaid-flowchart.md -o output/08-mermaid-flowchart.pdf
markpaper tests/09-mermaid-sequence.md -o output/09-mermaid-sequence.pdf
markpaper tests/10-mermaid-class.md -o output/10-mermaid-class.pdf
markpaper tests/11-mermaid-architecture.md -o output/11-mermaid-architecture.pdf

# 改ページテスト
markpaper tests/12-page-break-h1.md -o output/12-page-break-h1.pdf
markpaper tests/13-page-break-avoid.md -o output/13-page-break-avoid.pdf

# ページ番号とアウトライン
markpaper tests/14-page-numbers.md -o output/14-page-numbers.pdf --page-numbers
```

### 一括テスト（例）

```bash
# すべてのテストを実行
for file in tests/*.md; do
  filename=$(basename "$file" .md)
  markpaper "$file" -o "output/${filename}.pdf" --debug
done
```

## テストカテゴリ

### 基本機能 (01-04)
- **01-basic-typography.md**: 見出し、本文、リストなどのタイポグラフィ
- **02-basic-code-block.md**: コードブロックの表示とシンタックス
- **03-basic-table.md**: テーブルの表示とレイアウト
- **04-basic-blockquote.md**: 引用文とコードの組み合わせ

### 画像 (05-07)
- **05-image-online.md**: オンライン画像（サイズ指定あり/なし）
- **06-image-local.md**: ローカル画像（相対パス、サイズ指定）
- **07-image-mixed.md**: オンラインとローカルの混在

### Mermaid図 (08-11)
- **08-mermaid-flowchart.md**: フローチャート（スタイル付き）
- **09-mermaid-sequence.md**: シーケンス図
- **10-mermaid-class.md**: クラス図
- **11-mermaid-architecture.md**: アーキテクチャ図（Beta機能）

### 改ページ (12-13)
- **12-page-break-h1.md**: H1見出しでの改ページ（複数ページ）
- **13-page-break-avoid.md**: コードブロックとテーブルの改ページ回避

### ページ番号とアウトライン (14)
- **14-page-numbers.md**: ページ番号表示とPDFアウトライン（しおり/ブックマーク）のテスト

## Jest テストの実行

### E2Eテスト

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# 特定のテストファイルのみ実行
npm test tests/e2e/pdf-generation.test.ts

# カバレッジ付きで実行
npm run test:coverage
```

### CI環境

現在のCIマトリクス:
- **OS**: macOS (latest)
- **Node.js**: 22.x

将来的に他のOS/Nodeバージョンを追加予定:
- Ubuntu, Windows
- Node.js 18.x, 20.x

## 今後の拡張

### 予定されているテスト
- [ ] **ビジュアルリグレッションテスト**: PDFをPNGに変換して画像比較
- [ ] 日本語フォントテスト
- [ ] カスタムCSSテスト
- [ ] ページ設定テスト（サイズ、マージン）
- [ ] 複雑なレイアウトテスト
- [ ] パフォーマンステスト（大規模ドキュメント）

### ビジュアルリグレッションテスト計画
1. 生成されたPDFをPNGに変換
2. 基準画像（golden images）との画素単位の比較
3. 差分がある場合は差分画像を生成
4. 許容誤差範囲の設定（アンチエイリアシングなど）

## 注意事項

- Mermaidテストはpuppeteerが必要です（現在スキップ）
- オンライン画像テストはインターネット接続が必要です
- 改ページテストは実際のPDFで確認してください
- `tests/output/`ディレクトリはgitignoreされています
