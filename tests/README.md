# MarkPaper テストスイート

このディレクトリには、MarkPaperの各機能をテストするためのMarkdownファイルが含まれています。

## ディレクトリ構造

```
tests/
├── basic/           # 基本機能のテスト（タイポグラフィ、コード、テーブル、引用）
├── images/          # 画像処理のテスト（オンライン、ローカル、混在）
│   └── assets/      # テスト用画像ファイル
├── mermaid/         # Mermaid図のテスト（フローチャート、シーケンス、クラス図など）
└── page-breaks/     # 改ページ制御のテスト
```

## テストの原則

### 1ページ原則
- 改ページテスト以外は、原則として1ページに収まるように設計
- PNG比較やビジュアルリグレッションテストを容易にするため

### テストケースの分離
- 各機能ごとに独立したMarkdownファイルを作成
- 機能の組み合わせテストも個別ファイルで管理

## テスト実行方法

### 個別テスト

```bash
# 基本機能テスト
markpaper tests/basic/01-typography.md -o output/typography.pdf
markpaper tests/basic/02-code-block.md -o output/code-block.pdf
markpaper tests/basic/03-table.md -o output/table.pdf
markpaper tests/basic/04-blockquote.md -o output/blockquote.pdf

# 画像テスト
markpaper tests/images/01-online-image.md -o output/online-image.pdf
markpaper tests/images/02-local-image.md -o output/local-image.pdf
markpaper tests/images/03-mixed-images.md -o output/mixed-images.pdf

# Mermaidテスト
markpaper tests/mermaid/01-flowchart.md -o output/flowchart.pdf
markpaper tests/mermaid/02-sequence.md -o output/sequence.pdf
markpaper tests/mermaid/03-class.md -o output/class.pdf
markpaper tests/mermaid/04-architecture.md -o output/architecture.pdf

# 改ページテスト
markpaper tests/page-breaks/01-h1-page-break.md -o output/h1-page-break.pdf
markpaper tests/page-breaks/02-avoid-break.md -o output/avoid-break.pdf
```

### 一括テスト（例）

```bash
# すべての基本機能テストを実行
for file in tests/basic/*.md; do
  output="output/$(basename "$file" .md).pdf"
  markpaper "$file" -o "$output" --debug
done

# すべてのMermaidテストを実行
for file in tests/mermaid/*.md; do
  output="output/$(basename "$file" .md).pdf"
  markpaper "$file" -o "$output" --debug
done
```

## テストカテゴリ

### 基本機能 (basic/)
- **01-typography.md**: 見出し、本文、リストなどのタイポグラフィ
- **02-code-block.md**: コードブロックの表示とシンタックス
- **03-table.md**: テーブルの表示とレイアウト
- **04-blockquote.md**: 引用文とコードの組み合わせ

### 画像 (images/)
- **01-online-image.md**: オンライン画像（サイズ指定あり/なし）
- **02-local-image.md**: ローカル画像（相対パス、サイズ指定）
- **03-mixed-images.md**: オンラインとローカルの混在

### Mermaid図 (mermaid/)
- **01-flowchart.md**: フローチャート（スタイル付き）
- **02-sequence.md**: シーケンス図
- **03-class.md**: クラス図
- **04-architecture.md**: アーキテクチャ図（Beta機能）

### 改ページ (page-breaks/)
- **01-h1-page-break.md**: H1見出しでの改ページ（複数ページ）
- **02-avoid-break.md**: コードブロックとテーブルの改ページ回避

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
