const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const footer = `<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#aaa;font-size:11px;margin:0">MK-LAB LP制作サービス</p>`;

// マークダウンをメール用HTMLに変換
function mdToHtml(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h4 style="margin:16px 0 4px;color:#0070f3;font-size:0.9rem;font-weight:700;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:20px 0 6px;color:#1a1a2e;font-size:1rem;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 style="margin:20px 0 6px;color:#1a1a2e;">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0;line-height:1.7;">$1</li>')
    .replace(/(<li[^>]*>[\s\S]*?<\/li>(\n|$))+/g, s => `<ul style="padding-left:20px;margin:8px 0">${s}</ul>`)
    .replace(/\n{2,}/g, '</p><p style="margin:8px 0;line-height:1.7;">')
    .replace(/\n/g, '<br>');
}

/**
 * 受付完了メール
 */
async function sendAcknowledgmentEmail({ to, businessName }) {
  console.log(`📧 受付完了メール送信中: ${to}`);
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【受付完了】${businessName} のLP制作をお受けしました`,
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#0070f3;padding:24px 28px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;color:#fff;font-size:1.3rem">お申し込みを受け付けました</h2>
  </div>
  <div style="border:1px solid #e8eaf0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
    <p>${businessName} ご担当者様</p>
    <p style="line-height:1.7">LP制作のお申し込みありがとうございます。<br>
    現在、<strong>お客様の業界・競合・ターゲット心理の市場調査</strong>を行っています。</p>
    <div style="background:#f0f7ff;border-left:4px solid #0070f3;padding:16px 20px;margin:24px 0;border-radius:4px">
      <p style="margin:0 0 8px;font-weight:700">📋 これからの流れ</p>
      <ol style="margin:0;padding-left:20px;line-height:2.2">
        <li>業界・競合LP・キャッチコピーの市場調査 <span style="color:#0070f3;font-weight:700">← 現在ここ</span></li>
        <li>調査結果と制作方針をメールでご連絡</li>
        <li>制作費のお支払い（100,000円）</li>
        <li>LP制作・公開（3〜5営業日）</li>
      </ol>
    </div>
    <p style="line-height:1.7;color:#555">市場調査が完了次第、別途メールをお送りします。<br>しばらくお待ちください。</p>
    ${footer}
  </div>
</body></html>`,
  });
  if (error) throw new Error(`受付完了メール送信失敗: ${error.message}`);
  console.log(`✅ 受付完了メール送信完了`);
}

/**
 * リサーチ結果 + 決済リンクメール
 */
async function sendResearchEmail({ to, businessName, businessType, researchSummary, paymentUrl }) {
  console.log(`📧 リサーチメール送信中: ${to}`);

  const researchHtml = mdToHtml(researchSummary || '市場調査を完了しました。');

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【市場調査レポート】${businessName} の制作方針をご確認ください`,
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#0070f3;padding:24px 28px;border-radius:12px 12px 0 0">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:0.75rem">MK-LAB LP制作サービス</p>
    <h2 style="margin:0;color:#fff;font-size:1.3rem">📊 市場調査レポートが完成しました</h2>
  </div>
  <div style="border:1px solid #e8eaf0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
    <p>${businessName} ご担当者様</p>
    <p style="line-height:1.7"><strong>${businessType}</strong>の市場・競合・ターゲット心理を調査しました。<br>
    以下の方針でLPを制作します。</p>

    <div style="background:#f8f9ff;border-radius:10px;padding:20px 24px;margin:20px 0">
      <p style="margin:0 0 12px;font-size:0.75rem;color:#999;letter-spacing:0.5px;text-transform:uppercase">調査レポート</p>
      <div style="font-size:0.875rem;line-height:1.8">
        <p style="margin:0;line-height:1.8">${researchHtml}</p>
      </div>
    </div>

    <p style="line-height:1.7;color:#555">上記の方針でLP制作を進めます。<br>
    よろしければ下記より制作費のお支払いをお願いします。<br>
    <strong style="color:#333">お支払い後すぐに制作を開始します。</strong></p>

    <div style="text-align:center;margin:32px 0">
      <a href="${paymentUrl}" style="display:inline-block;background:linear-gradient(135deg,#0070f3,#0050c8);color:#fff;padding:18px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:1.05rem;box-shadow:0 4px 12px rgba(0,112,243,0.3)">
        LP制作を依頼する（100,000円）
      </a>
      <p style="color:#999;font-size:12px;margin-top:10px">クレジットカード対応 · SSL暗号化通信</p>
    </div>

    <p style="color:#777;font-size:0.875rem">ご不明な点はこのメールにご返信ください。</p>
    ${footer}
  </div>
</body></html>`,
  });
  if (error) throw new Error(`リサーチメール送信失敗: ${error.message}`);
  console.log(`✅ リサーチメール送信完了: ${data.id}`);
  return data;
}

/**
 * 決済完了・LP制作開始メール
 */
async function sendPaymentThanksEmail({ to, businessName }) {
  console.log(`📧 決済完了メール送信中: ${to}`);
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【ご入金確認】${businessName} のLP制作を開始します`,
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:linear-gradient(135deg,#00b09b,#0070f3);padding:24px 28px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;color:#fff;font-size:1.3rem">✅ ご入金を確認しました</h2>
  </div>
  <div style="border:1px solid #e8eaf0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
    <p>${businessName} ご担当者様</p>
    <p style="line-height:1.7">お支払いありがとうございます。<br>
    ただいま <strong>LP制作を開始しました。</strong></p>
    <div style="background:#f0fff8;border-left:4px solid #00b09b;padding:16px 20px;margin:24px 0;border-radius:4px">
      <p style="margin:0 0 8px;font-weight:700;color:#00805a">⏱ 制作スケジュール</p>
      <p style="margin:0;line-height:1.8;color:#555">
        制作完了まで通常 <strong>3〜5営業日</strong>です。<br>
        完成次第、プレビューURLをメールでお知らせします。
      </p>
    </div>
    <p style="line-height:1.7;color:#555">ご不明な点はこのメールにご返信ください。</p>
    ${footer}
  </div>
</body></html>`,
  });
  if (error) throw new Error(`決済完了メール送信失敗: ${error.message}`);
  console.log(`✅ 決済完了メール送信完了`);
}

/**
 * LP納品メール
 */
async function sendDeliveryEmail({ to, companyName, serviceName, deployUrl, revisionUrl }) {
  console.log(`📧 メール送信中: ${to}`);
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【LP完成】${serviceName} のランディングページが完成しました`,
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#0070f3;padding:24px 28px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;color:#fff;font-size:1.3rem">🎉 LPが完成しました！</h2>
  </div>
  <div style="border:1px solid #e8eaf0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
    <p>${companyName} ご担当者様</p>
    <p style="line-height:1.7">「${serviceName}」のランディングページが完成し、公開されました。</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${deployUrl}" style="display:inline-block;background:#0070f3;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:1rem">
        LPを確認する →
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="font-weight:700;margin:0 0 8px">✏️ 修正がございましたら</p>
    <p style="margin:0 0 16px;color:#555;line-height:1.7">1回限りの無料修正フォームをご用意しました。<br>変更したい箇所をご記入ください。</p>
    ${revisionUrl ? `<p><a href="${revisionUrl}" style="display:inline-block;background:#f5f5f5;color:#333;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;border:1px solid #ddd">修正依頼フォームを開く</a></p>
    <p style="color:#999;font-size:12px">※このURLは1回のみ有効です</p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
    <p style="color:#555;font-size:0.875rem;line-height:1.7">継続的な更新・修正は <strong>月額1万円の修正し放題プラン</strong> もご用意しています。</p>
    ${footer}
  </div>
</body></html>`,
  });
  if (error) throw new Error(`メール送信失敗: ${error.message}`);
  console.log(`✅ メール送信完了: ${data.id}`);
  return data;
}

/**
 * イメージLP提示 + 詳細フォームURL送付メール
 */
async function sendDetailsFormEmail({ to, businessName, previewUrl, detailsUrl }) {
  console.log(`📧 詳細フォームメール送信中: ${to}`);
  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【イメージLP完成】${businessName} の詳細内容をご入力ください`,
    html: `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#0070f3;padding:24px 28px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;color:#fff;font-size:1.3rem">🎨 イメージLPが完成しました</h2>
  </div>
  <div style="border:1px solid #e8eaf0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
    <p>${businessName} ご担当者様</p>
    <p style="line-height:1.7">ご依頼の内容をもとに、<strong>イメージLP</strong>を作成しました。<br>
    まずは全体のデザインと構成をご確認ください。</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${previewUrl}" style="display:inline-block;background:#f5f5f5;color:#333;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;border:1px solid #ddd">
        イメージLPを確認する →
      </a>
    </div>

    <div style="background:#fff8e8;border-left:4px solid #f0a500;padding:16px 20px;margin:24px 0;border-radius:4px">
      <p style="margin:0 0 8px;font-weight:700;color:#a06800">📝 次のステップ</p>
      <p style="margin:0;line-height:1.8;color:#555;font-size:0.9rem">
        イメージLPをご確認いただき、下記のフォームから<strong>実際の情報</strong>をご入力ください。<br>
        料金・実績・お客様の声・FAQなど、セクションごとに入力できます。<br>
        入力いただいた内容で<strong>本番LPを制作</strong>します。
      </p>
    </div>

    <div style="text-align:center;margin:32px 0">
      <a href="${detailsUrl}" style="display:inline-block;background:linear-gradient(135deg,#0070f3,#0050c8);color:#fff;padding:18px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:1.05rem;box-shadow:0 4px 12px rgba(0,112,243,0.3)">
        詳細内容を入力する →
      </a>
      <p style="color:#999;font-size:12px;margin-top:10px">入力は約10〜15分で完了します</p>
    </div>

    <p style="color:#777;font-size:0.875rem;line-height:1.7">ご不明な点はこのメールにご返信ください。</p>
    ${footer}
  </div>
</body></html>`,
  });
  if (error) throw new Error(`詳細フォームメール送信失敗: ${error.message}`);
  console.log(`✅ 詳細フォームメール送信完了`);
}

module.exports = { sendDeliveryEmail, sendResearchEmail, sendAcknowledgmentEmail, sendPaymentThanksEmail, sendDetailsFormEmail };
