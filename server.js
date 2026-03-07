require('dotenv').config();
const express = require('express');
const { notifyFormReceived, notifyApprovalRequest } = require('./lib/discord');
const { generateLP } = require('./lib/lp-generator');
const { deployToVercel } = require('./lib/vercel-deploy');
const { sendDeliveryEmail, sendResearchEmail } = require('./lib/mailer');
const { requestResearch } = require('./lib/nakamura-research');
const { createToken, getToken, markTokenUsed } = require('./lib/revision-tokens');
const { createPaymentLink, popOrder } = require('./lib/stripe');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
 * Stripe Webhook（決済完了検知）
 * POST /webhook/stripe
 */
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe Webhook署名エラー:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;
    console.log(`💳 決済完了: orderId=${orderId}`);

    if (orderId) {
      const formData = popOrder(orderId);
      if (formData) {
        console.log('📦 フォームデータ復元・LP生成開始');
        runAutomationFlow(formData).catch(err => console.error('フローエラー:', err));
      }
    }
  }

  res.json({ received: true });
});

/**
 * 決済完了後リダイレクトページ
 * GET /payment-complete
 */
app.get('/payment-complete', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>お支払い完了</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa}div{text-align:center;padding:40px}h1{color:#0070f3}p{color:#555;line-height:1.7}</style></head><body><div><h1>✅ お支払いありがとうございます</h1><p>ご入金を確認しました。<br>LP制作を開始します。<br>完成次第メールでご連絡いたします（通常3〜5営業日）。</p></div></body></html>`);
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

    // Step 2.5: 動的決済リンク生成 & リサーチメール送信
    const clientEmail = data.email || data.contactEmail || data.contact;
    let paymentUrl = process.env.STRIPE_PAYMENT_LINK_LP; // フォールバック
    try {
      const { url } = await createPaymentLink(data);
      paymentUrl = url;
    } catch (err) {
      console.warn('⚠️ 動的決済リンク生成失敗（固定リンクを使用）:', err.message);
    }

    if (researchResult && clientEmail) {
      console.log('Step 2.5: リサーチメール送信');
      await sendResearchEmail({
        to: clientEmail,
        businessName: data.businessName || data.companyName || data.serviceName,
        businessType: data.businessType || 'ビジネス',
        researchSummary: researchResult,
        paymentUrl,
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
