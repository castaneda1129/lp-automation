const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PENDING_FILE = path.join(__dirname, '../data/pending-orders.json');

function loadPending() {
  if (!fs.existsSync(PENDING_FILE)) {
    fs.mkdirSync(path.dirname(PENDING_FILE), { recursive: true });
    fs.writeFileSync(PENDING_FILE, '{}');
  }
  return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
}

function savePending(data) {
  fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2));
}

/**
 * フォームデータを一時保存し、クライアント専用の決済リンクを生成する
 */
async function createPaymentLink(formData) {
  const orderId = crypto.randomBytes(12).toString('hex');

  // フォームデータを一時保存
  const pending = loadPending();
  pending[orderId] = { ...formData, createdAt: new Date().toISOString() };
  savePending(pending);

  // Stripe Payment Linkを動的生成（メタデータにorderIdを埋め込む）
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `LP制作：${formData.businessName || formData.companyName || formData.serviceName}`,
            description: `${formData.businessType || 'LP'}のランディングページ制作・公開まで一式`,
          },
          unit_amount: 100000, // 10万円
        },
        quantity: 1,
      },
    ],
    metadata: { orderId },
    after_completion: {
      type: 'redirect',
      redirect: { url: `https://webhook.mk-lab.tech/payment-complete?order=${orderId}` },
    },
  });

  console.log(`💳 決済リンク生成: ${paymentLink.url} (orderId: ${orderId})`);
  return { url: paymentLink.url, orderId };
}

/**
 * orderIdからフォームデータを取得して削除
 */
function popOrder(orderId) {
  const pending = loadPending();
  const data = pending[orderId];
  if (data) {
    delete pending[orderId];
    savePending(pending);
  }
  return data || null;
}

module.exports = { createPaymentLink, popOrder };
