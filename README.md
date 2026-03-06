# LP制作自動化バックエンド

LP制作サービスの自動化フロー。ヒアリングフォーム → Claude APIでLP生成 → Vercelデプロイ → Discord承認 → クライアントへメール納品。

## セットアップ

```bash
npm install
cp .env.example .env
# .env に実際の値を設定
```

## 環境変数

| 変数 | 説明 |
|------|------|
| `PORT` | サーバーポート（デフォルト: 3000） |
| `ANTHROPIC_API_KEY` | Anthropic Claude APIキー |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL |
| `VERCEL_TOKEN` | Vercel APIトークン |
| `RESEND_API_KEY` | Resend APIキー |
| `MAIL_FROM` | 送信元メールアドレス |

## 起動

```bash
npm start
# または開発用（ファイル変更で自動リスタート）
npm run dev
```

## エンドポイント

### `POST /webhook/form`
ヒアリングフォームからのデータを受け取り、自動化フローを開始。

```json
{
  "companyName": "株式会社サンプル",
  "contactName": "山田太郎",
  "email": "yamada@example.com",
  "industry": "IT",
  "target": "中小企業の経営者",
  "purpose": "資料請求",
  "sellingPoints": "業界最安値、導入実績100社以上",
  "colorTone": "ブルー系、信頼感",
  "referenceUrl": "https://example.com",
  "notes": ""
}
```

### `POST /webhook/approve`
Discord確認後に承認。クライアントへ納品メールを送信。

```json
{
  "email": "yamada@example.com"
}
```

### `GET /pending`
承認待ち一覧を取得。

### `GET /health`
ヘルスチェック。

## フロー

1. ヒアリングフォーム送信 → `POST /webhook/form`
2. Discordに新規依頼通知
3. Claude APIでLP（HTML）を自動生成
4. Vercelにデプロイ
5. DiscordにプレビューURL送信（承認依頼）
6. 佐藤がDiscordで確認 → `POST /webhook/approve`
7. Resendでクライアントに納品メール送信
