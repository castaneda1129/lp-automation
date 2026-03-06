# LP自動化フロー

LP制作サービスのバックエンド自動化。

## フロー

```
フォーム送信 → Webhook受信 → Discord通知 → LP生成(Claude) → Vercelデプロイ → Discord承認 → メール送信
```

## セットアップ

```bash
npm install
cp .env.example .env
# .envを編集して各APIキーを設定
npm start
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `PORT` | サーバーポート（デフォルト3000） |
| `ANTHROPIC_API_KEY` | Claude API キー |
| `DISCORD_WEBHOOK_URL` | Discord通知用WebhookURL |
| `VERCEL_TOKEN` | Vercel APIトークン |
| `VERCEL_TEAM_ID` | VercelチームID（任意） |
| `RESEND_API_KEY` | Resend APIキー |
| `FROM_EMAIL` | 送信元メールアドレス |

## エンドポイント

- `GET /` — ヘルスチェック
- `POST /webhook/form` — ヒアリングフォーム受信

## フォームデータ形式

```json
{
  "companyName": "株式会社〇〇",
  "contactName": "山田太郎",
  "email": "yamada@example.com",
  "serviceName": "〇〇サービス",
  "targetAudience": "30代〜40代の経営者",
  "mainMessage": "コスト削減と業務効率化を同時に実現",
  "strengths": "導入実績500社、サポート体制充実",
  "cta": "無料デモを試す"
}
```

## Discord承認

デプロイ後、Discordに承認依頼が届きます。  
承認する場合は環境変数 `APPROVAL_STATUS=approve` を設定してサーバーを再起動してください。  
（本番運用ではDiscord Botに置き換え推奨）
