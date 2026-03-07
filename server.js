require('dotenv').config();
const express = require('express');
const { notifyFormReceived, notifyApprovalRequest } = require('./lib/discord');
const { generateLP } = require('./lib/lp-generator');
const { deployToVercel } = require('./lib/vercel-deploy');
const { sendDeliveryEmail, sendResearchEmail, sendAcknowledgmentEmail, sendPaymentThanksEmail } = require('./lib/mailer');
const { requestResearch } = require('./lib/nakamura-research');
const { createToken, getToken, markTokenUsed } = require('./lib/revision-tokens');
const { createPaymentLink, popOrder } = require('./lib/stripe');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const path = require('path');

const app = express();

// ⚠️ Stripe Webhookは raw body が必要なので最初に定義
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
        console.log('📦 フォームデータ復元・Phase 2（LP生成）開始');
        runPhase2(formData).catch(err => console.error('Phase 2エラー:', err));
      }
    }
  }

  res.json({ received: true });
});

// 以降のルートは JSON パースを使う
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
  markTokenUsed(token);
  res.json({ status: 'received' });
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
 * 決済完了後リダイレクトページ
 */
app.get('/payment-complete', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>お支払い完了</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f7fa}div{text-align:center;padding:40px}h1{color:#0070f3}p{color:#555;line-height:1.7}</style></head><body><div><h1>✅ お支払いありがとうございます</h1><p>ご入金を確認しました。<br>LP制作を開始します。<br>完成次第メールでご連絡いたします（通常3〜5営業日）。</p></div></body></html>`);
});

/**
 * ヒアリングフォーム受信
 * POST /webhook/form
 */
app.post('/webhook/form', async (req, res) => {
  const data = req.body;
  console.log('📬 フォーム受信:', data);
  res.json({ status: 'received', message: 'ご依頼を受け付けました。市場調査後にメールをお送りします。' });
  runPhase1(data).catch(err => console.error('❌ Phase 1エラー:', err));
});

/**
 * Phase 1: 受付〜リサーチ〜決済メール送信
 * 決済完了を待って止まる
 */
async function runPhase1(data) {
  try {
    const clientEmail = data.email || data.contactEmail || data.contact;
    const businessName = data.businessName || data.companyName || data.serviceName;

    // Step 1: Discord通知 + 受付完了メール
    console.log('Phase1 Step 1: Discord通知・受付完了メール');
    await notifyFormReceived(data);
    if (clientEmail) {
      await sendAcknowledgmentEmail({ to: clientEmail, businessName })
        .catch(err => console.warn('⚠️ 受付完了メール失敗:', err.message));
    }

    // Step 2: 中村リサーチ
    console.log('Phase1 Step 2: 中村リサーチ');
    const researchResult = await requestResearch(data);

    // Step 3: 動的決済リンク生成（フォームデータをpending-ordersに保存）
    console.log('Phase1 Step 3: 決済リンク生成');
    let paymentUrl = process.env.STRIPE_PAYMENT_LINK_LP;
    try {
      const { url } = await createPaymentLink(data);
      paymentUrl = url;
    } catch (err) {
      console.warn('⚠️ 動的決済リンク生成失敗（固定リンクを使用）:', err.message);
    }

    // Step 4: リサーチ結果 + 決済リンクをメール送信
    if (clientEmail) {
      console.log('Phase1 Step 4: リサーチ・決済メール送信');
      await sendResearchEmail({
        to: clientEmail,
        businessName,
        businessType: data.businessType || data.industry || 'ビジネス',
        researchSummary: researchResult || '市場調査を完了しました。以下の方針でLP制作を進めます。',
        paymentUrl,
      }).catch(err => console.warn('⚠️ リサーチメール送信失敗:', err.message));
    }

    console.log('✅ Phase 1完了。決済完了を待機中...');
  } catch (err) {
    console.error('❌ Phase 1エラー:', err.message);
  }
}

/**
 * Phase 2: LP生成〜デプロイ〜納品
 * Stripe決済完了後に実行
 */
async function runPhase2(data) {
  try {
    const clientEmail = data.email || data.contactEmail || data.contact;
    const businessName = data.businessName || data.companyName || data.serviceName;

    // Step 0: 決済完了メール
    if (clientEmail) {
      await sendPaymentThanksEmail({ to: clientEmail, businessName })
        .catch(err => console.warn('⚠️ 決済完了メール失敗:', err.message));
    }

    // Step 1: LP生成
    console.log('Phase2 Step 1: LP生成');
    const html = await generateLP(data, data._researchResult || null);

    // Step 2: レビュー・CSS修正
    console.log('Phase2 Step 2: LP品質レビュー');
    const { reviewAndFixLP } = require('./lib/lp-reviewer');
    const finalHtml = await reviewAndFixLP(html, data);

    // Step 3: Vercelデプロイ
    console.log('Phase2 Step 3: Vercelデプロイ');
    const slug = data.slug || businessName || 'lp';
    const deployUrl = await deployToVercel(finalHtml, slug);

    // Step 4: Discord承認
    console.log('Phase2 Step 4: Discord承認待ち');
    const approved = await notifyApprovalRequest(deployUrl);
    if (!approved) {
      console.log('❌ 承認されませんでした。');
      return;
    }

    // Step 5: 修正トークン発行 + 納品メール
    const revisionToken = createToken(slug, deployUrl, clientEmail);
    const revisionUrl = `https://webhook.mk-lab.tech/revise/${revisionToken}`;
    console.log(`Phase2 Step 5: 納品メール送信 (修正URL: ${revisionUrl})`);
    await sendDeliveryEmail({
      to: clientEmail,
      companyName: businessName,
      serviceName: businessName,
      deployUrl,
      revisionUrl,
    });

    console.log('🎉 Phase 2完了！全フロー終了');
  } catch (err) {
    console.error('❌ Phase 2エラー:', err.message);
    try {
      const { getBot } = require('./lib/discord');
      const bot = getBot();
      const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      await channel.send(`❌ **LP生成エラー**\n\`\`\`${err.message}\`\`\``);
    } catch (_) {}
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 LP自動化サーバー起動: http://localhost:PORT}`);
});
