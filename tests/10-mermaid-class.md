# クラス図テスト

## ドキュメント変換システム

```mermaid
classDiagram
    class User {
        +String name
        +String email
        +login()
        +logout()
    }

    class Document {
        +String title
        +String content
        +save()
        +export()
    }

    class PDF {
        +generate()
        +optimize()
    }

    User --> Document : creates
    Document --> PDF : converts to
```
