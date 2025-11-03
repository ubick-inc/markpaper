# 改ページ回避テスト

## コードブロックの改ページ回避

以下のコードブロックは途中で改ページされないようにセクション化されています。

```typescript
// この長いコードブロックは
// 途中で改ページされません
function longFunction() {
  const data = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
    { id: 4, name: "Item 4" },
    { id: 5, name: "Item 5" },
  ];

  return data.map(item => ({
    ...item,
    processed: true
  }));
}
```

## テーブルの改ページ回避

このテーブルも途中で改ページされません。

| 列1 | 列2 | 列3 | 列4 |
|-----|-----|-----|-----|
| A1 | B1 | C1 | D1 |
| A2 | B2 | C2 | D2 |
| A3 | B3 | C3 | D3 |
| A4 | B4 | C4 | D4 |
| A5 | B5 | C5 | D5 |
