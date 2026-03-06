# LP制作自動化フロー 仕様書

## 概要
LP制作サービスの自動化バックエンド。
- LP制作：10万円 / 変更し放題：1万円/月 / 粗利98%

## 自動化フロー
1. ヒアリングフォーム送信（6ステップHTML）
2. Node.js Webhookサーバー受信
3. 佐藤（Discord）に通知
4. LP生成（Claude API）
5. Vercelデプロイ
6. Discord承認フロー
7. Resendメールでクライアントに送信

## 実装するもの

### 1. Node.js Webhookサーバー（Express）
- `server.js` - メインサーバー
- ヒアリングフォームのPOSTを受け取る
- 環境変数: PORT, DISCORD_WEBHOOK_URL, ANTHROPIC_API_KEY, VERCEL_TOKEN, RESEND_API_KEY

### 2. Discord通知
- Webhook経由でDiscordチャンネルに通知
- フォーム内容をまとめて送信

### 3. LP生成（Claude API）
- `lib/lp-generator.js`
- Anthropic Claude APIでHTMLのLPを生成
- フォーム内容をプロンプトに組み込む

### 4. Vercelデプロイ
- `lib/vercel-deploy.js`
- Vercel APIで生成したLPをデプロイ
- デプロイURLを返す

### 5. Discord承認フロー
- デプロイURLをDiscordに送信
- 承認/拒否のメッセージを待つ（シンプルなポーリングでOK）

### 6. Resendメール送信
- `lib/mailer.js`
- 承認後にクライアントへメール送信
- LPのURLを含む

## ファイル構成
```
lp-automation/
├── server.js          # メインWebhookサーバー
├── lib/
│   ├── lp-generator.js    # Claude API LP生成
│   ├── vercel-deploy.js   # Vercelデプロイ
│   ├── discord.js         # Discord通知・承認
│   └── mailer.js          # Resendメール送信
├── .env.example       # 環境変数サンプル
├── package.json
└── README.md
```

## 注意
- 環境変数は.env.exampleに定義し、実際の値は.envに（gitignore）
- エラーハンドリングをしっかり
- 各ステップでconsole.logでわかりやすいログを出す
