# LP自動化 - プロジェクト状況

最終更新: 2026-03-07

## 実装状況

| ステップ | 状態 | 備考 |
|---------|------|------|
| Webhookサーバー | ✅ 完了 | server.js / Express |
| Discord Bot通知 | ✅ 完了 | フォーム受信時に通知 |
| LP生成 | ✅ 完了 | claude-haiku-4-5 / 約23秒 |
| Vercelデプロイ | ✅ 完了 | lp-[slug].mk-lab.tech |
| Discord承認ボタン | ✅ 完了 | ✅承認 / 🔄やり直し |
| Resendメール送信 | ✅ 完了 | mk-lab.tech Verified済み |

## インフラ・認証情報（場所）

- `.env` に全APIキー設定済み（gitignore）
- サーバー: murakaminomac-mini（murakamikaichi@100.70.121.123）
- 起動コマンド: `cd ~/Projects/lp-automation && node server.js`
- 外部公開: `ngrok http 3000`（URLは起動のたび変わる）

## 残課題

- [ ] ngrok固定URL化（Cloudflare Tunnel推奨・無料）
- [ ] pm2でサーバー常駐化（再起動後も自動起動）
- [ ] フォームのaction URLを固定URLに差し替え

## フロー図

```
クライアント
  ↓ フォーム送信（/form.html）
Webhookサーバー（server.js）
  ↓ Discord Bot通知
  ↓ Claude Haiku でLP生成
  ↓ Vercel API でデプロイ → lp-xxx.mk-lab.tech
  ↓ Discord承認ボタン送信
    ✅ 承認 → Resendでクライアントにメール
    🔄 やり直し → フロー終了
```
