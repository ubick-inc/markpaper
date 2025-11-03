# アーキテクチャ図テスト

## システムアーキテクチャ（Beta機能）

```mermaid
architecture-beta
    service api(logos:aws-api-gateway)[API Gateway]
    service web(logos:react)[Web Frontend]
    service auth(logos:auth0)[認証サービス]
    service db[(logos:postgresql)[Database]]

    web:L -- R:api
    api:L -- R:auth
    api:B -- T:db
```
