require('dotenv').config();

const express = require('express');
const { notifyNewOrder, notifyDeployReview } = require('./lib/discord');
const { generateLP } = require('./lib/lp-generator');
const { deployToVercel } = require('./lib/vercel-deploy');
const { sendDeliveryEmail } = require('./lib/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ヘルスチェック
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ヒアリングフォームWebhook
app.post('/webhook/form', async (req, res) => {
  const formData = req.body;
  console.log('=== 新規LP制作依頼受信 ===');
  console.log(`会社名: ${formData.companyName}`);
  console.log(`担当者: ${formData.contactName}`);
  console.log(`メール: ${formData.email}`);

  // すぐにレスポンスを返す（バックグラウンドで処理）
  res.json({ success: true, message: '受け付けました。処理を開始します。' });

  try {
    // Step 1: Discord通知
    await notifyNewOrder(formData);

    // Step 2: LP生成
    const html = await generateLP(formData);

    // Step 3: Vercelデプロイ
    const deployUrl = await deployToVercel(html, formData.companyName || 'lp');

    // Step 4: Discord承認通知
    await notifyDeployReview(deployUrl, formData);

    console.log('=== 承認待ち ===');
    console.log(`プレビュー: ${deployUrl}`);
    console.log('Discordで承認後、/webhook/approve を呼び出してください');

    // 承認データを保持（簡易的にメモリ保存）
    pendingApprovals.set(formData.email, { formData, deployUrl });
  } catch (err) {
    console.error('[エラー] LP制作フロー失敗:', err.message);
  }
});

// 承認データ（簡易インメモリストア）
const pendingApprovals = new Map();

// 承認エンドポイント
app.post('/webhook/approve', async (req, res) => {
  const { email } = req.body;

  const approval = pendingApprovals.get(email);
  if (!approval) {
    return res.status(404).json({ error: '該当する承認待ちデータが見つかりません' });
  }

  try {
    console.log(`=== 承認処理開始: ${email} ===`);

    // メール送信
    await sendDeliveryEmail(
      approval.formData.email,
      approval.formData.companyName,
      approval.deployUrl
    );

    pendingApprovals.delete(email);

    console.log('=== 納品完了 ===');
    res.json({ success: true, message: '納品メールを送信しました', deployUrl: approval.deployUrl });
  } catch (err) {
    console.error('[エラー] 承認処理失敗:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 承認待ち一覧
app.get('/pending', (_req, res) => {
  const list = Array.from(pendingApprovals.entries()).map(([email, data]) => ({
    email,
    companyName: data.formData.companyName,
    deployUrl: data.deployUrl,
  }));
  res.json(list);
});

app.listen(PORT, () => {
  console.log(`LP自動化サーバー起動: http://localhost:${PORT}`);
  console.log('エンドポイント:');
  console.log(`  POST /webhook/form    - ヒアリングフォーム受信`);
  console.log(`  POST /webhook/approve - 承認・メール送信`);
  console.log(`  GET  /pending         - 承認待ち一覧`);
  console.log(`  GET  /health          - ヘルスチェック`);
});
