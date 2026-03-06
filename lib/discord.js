const axios = require('axios');

/**
 * Discord通知を送る
 */
async function notify(webhookUrl, message) {
  await axios.post(webhookUrl, { content: message });
}

/**
 * フォーム受信通知
 */
async function notifyFormReceived(data) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const msg = [
    '📬 **新しいLP依頼が届きました！**',
    '',
    `**会社名:** ${data.companyName || '未入力'}`,
    `**担当者:** ${data.contactName || '未入力'}`,
    `**メール:** ${data.email || '未入力'}`,
    `**サービス名:** ${data.serviceName || '未入力'}`,
    `**ターゲット:** ${data.targetAudience || '未入力'}`,
    `**訴求ポイント:** ${data.mainMessage || '未入力'}`,
    '',
    '⚙️ LP生成を開始します...',
  ].join('\n');

  await notify(webhookUrl, msg);
}

/**
 * LP生成完了・承認依頼通知
 */
async function notifyApprovalRequest(deployUrl) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const msg = [
    '✅ **LP生成・デプロイ完了！承認をお願いします**',
    '',
    `🔗 **プレビューURL:** ${deployUrl}`,
    '',
    '承認する場合は `approve`、やり直す場合は `reject` と返信してください。',
  ].join('\n');

  await notify(webhookUrl, msg);
  return waitForApproval();
}

/**
 * 承認待ち（シンプルなポーリング実装 - 実運用ではDiscord Botに置き換え推奨）
 * ここでは5分間待って、環境変数 APPROVAL_STATUS をチェックする簡易版
 */
async function waitForApproval() {
  console.log('⏳ Discord承認待ち... (APPROVAL_STATUS env or 5min timeout)');
  const timeout = 5 * 60 * 1000; // 5分
  const interval = 10 * 1000; // 10秒ごと
  const start = Date.now();

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      const status = process.env.APPROVAL_STATUS;
      if (status === 'approve') {
        clearInterval(timer);
        resolve(true);
      } else if (status === 'reject') {
        clearInterval(timer);
        resolve(false);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        console.log('⏰ 承認タイムアウト（5分）');
        resolve(false);
      }
    }, interval);
  });
}

module.exports = { notify, notifyFormReceived, notifyApprovalRequest };
