require('dotenv').config();
const express = require('express');
const { notifyFormReceived, notifyApprovalRequest } = require('./lib/discord');
const { generateLP } = require('./lib/lp-generator');
const { deployToVercel } = require('./lib/vercel-deploy');
const { sendDeliveryEmail } = require('./lib/mailer');

const path = require('path');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'lp-automation' });
});

/**
 * ヒアリングフォーム受信 Webhook
 * POST /webhook/form
 */
app.post('/webhook/form', async (req, res) => {
  const data = req.body;
  console.log('📬 フォーム受信:', data);

  // すぐにレスポンスを返す
  res.json({ status: 'received', message: 'LP生成を開始します。完成次第メールでお知らせします。' });

  // 非同期でフロー実行
  runAutomationFlow(data).catch((err) => {
    console.error('❌ フローエラー:', err);
  });
});

/**
 * メイン自動化フロー
 */
async function runAutomationFlow(data) {
  try {
    // Step 1: Discord通知
    console.log('Step 1: Discord通知');
    await notifyFormReceived(data);

    // Step 2: LP生成
    console.log('Step 2: LP生成');
    const html = await generateLP(data);

    // Step 2.5: LP品質レビュー＆自動修正
    console.log('Step 2.5: LP品質レビュー');
    const { reviewAndFixLP } = require('./lib/lp-reviewer');
    const finalHtml = await reviewAndFixLP(html, data);

    // Step 3: Vercelデプロイ
    console.log('Step 3: Vercelデプロイ');
    const deployUrl = await deployToVercel(finalHtml, data.serviceName || 'lp');

    // Step 4: Discord承認フロー
    console.log('Step 4: Discord承認待ち');
    const approved = await notifyApprovalRequest(deployUrl);

    if (!approved) {
      console.log('❌ 承認されませんでした。フロー終了。');
      return;
    }

    // Step 5: クライアントにメール送信
    console.log('Step 5: メール送信');
    await sendDeliveryEmail({
      to: data.email,
      companyName: data.companyName,
      serviceName: data.serviceName,
      deployUrl,
    });

    console.log('🎉 全フロー完了！');
  } catch (err) {
    console.error('❌ フローエラー:', err.message);
    // Discordにエラー通知
    const { getBot } = require('./lib/discord');
    try {
      const bot = getBot();
      const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      await channel.send(`❌ **LP自動化フローでエラーが発生しました**\n\`\`\`${err.message}\`\`\``);
    } catch (_) {}
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LP自動化サーバー起動: http://localhost:${PORT}`);
});
