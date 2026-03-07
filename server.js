require('dotenv').config();
const express = require('express');
const { notifyFormReceived, notifyApprovalRequest } = require('./lib/discord');
const { generateLP } = require('./lib/lp-generator');
const { deployToVercel } = require('./lib/vercel-deploy');
const { sendDeliveryEmail, sendResearchEmail } = require('./lib/mailer');
const { requestResearch } = require('./lib/nakamura-research');
const { createToken, getToken, markTokenUsed } = require('./lib/revision-tokens');

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
 * 修正フォーム表示
 * GET /revise/:token
 */
app.get('/revise/:token', (req, res) => {
  const { token } = req.params;
  const info = getToken(token);
  if (!info) return res.status(404).send('このURLは無効です。');

  const template = require('fs').readFileSync(
    require('path').join(__dirname, 'public/revise-template.html'), 'utf8'
  );
  const html = template
    .replace('{{TOKEN}}', token)
    .replace('{{DEPLOY_URL}}', info.deployUrl || '')
    .replace('{{IS_USED}}', info.expired ? 'true' : 'false');
  res.send(html);
});

/**
 * 修正依頼受付
 * POST /webhook/revise
 */
app.post('/webhook/revise', async (req, res) => {
  const { token, sections, detail, reference } = req.body;
  const info = getToken(token);

  if (!info) return res.status(404).json({ message: 'このURLは無効です。' });
  if (info.expired) return res.status(410).json({ message: 'このフォームは使用済みです。' });

  // トークンを使用済みに
  markTokenUsed(token);

  res.json({ status: 'received' });

  // Discord通知
  try {
    const { getBot } = require('./lib/discord');
    const bot = getBot();
    const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    await channel.send(
      `✏️ **修正依頼が届きました**\n` +
      `🔗 LP: ${info.deployUrl}\n` +
      `📌 セクション: ${sections.join(', ')}\n` +
      `📝 内容:\n${detail}` +
      (reference ? `\n🔗 参考: ${reference}` : '')
    );
  } catch (err) {
    console.error('Discord通知失敗:', err.message);
  }
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

    // Step 2: 中村リサーチ
    console.log('Step 2: 中村リサーチ');
    const researchResult = await requestResearch(data);

    // Step 2.5: リサーチ結果をクライアントにメール（決済リンク付き）
    const clientEmail = data.email || data.contactEmail || data.contact;
    if (researchResult && clientEmail) {
      console.log('Step 2.5: リサーチメール送信');
      await sendResearchEmail({
        to: clientEmail,
        businessName: data.businessName || data.companyName || data.serviceName,
        businessType: data.businessType || 'ビジネス',
        researchSummary: researchResult,
        paymentUrl: process.env.STRIPE_PAYMENT_LINK_LP,
      }).catch(err => console.warn('⚠️ リサーチメール送信失敗（フロー継続）:', err.message));
    }

    // Step 3: LP生成（リサーチ結果を注入）
    console.log('Step 3: LP生成');
    const html = await generateLP(data, researchResult);

    // Step 2.5: LP品質レビュー＆自動修正
    console.log('Step 2.5: LP品質レビュー');
    const { reviewAndFixLP } = require('./lib/lp-reviewer');
    const finalHtml = await reviewAndFixLP(html, data);

    // Step 3: Vercelデプロイ
    console.log('Step 3: Vercelデプロイ');
    const deployUrl = await deployToVercel(finalHtml, data.slug || data.serviceName || data.businessName || 'lp');

    // Step 4: Discord承認フロー
    console.log('Step 4: Discord承認待ち');
    const approved = await notifyApprovalRequest(deployUrl);

    if (!approved) {
      console.log('❌ 承認されませんでした。フロー終了。');
      return;
    }

    // Step 5: 修正トークン発行
    const slug = data.slug || data.businessName || 'lp';
    const revisionToken = createToken(slug, deployUrl, clientEmail);
    const revisionUrl = `https://webhook.mk-lab.tech/revise/${revisionToken}`;
    console.log(`📝 修正フォームURL: ${revisionUrl}`);

    // Step 6: クライアントにメール送信
    console.log('Step 6: メール送信');
    await sendDeliveryEmail({
      to: clientEmail,
      companyName: data.companyName || data.businessName,
      serviceName: data.serviceName || data.businessName,
      deployUrl,
      revisionUrl,
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
