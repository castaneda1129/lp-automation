const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * LPデプロイ完了メールをクライアントに送る
 */
async function sendDeliveryEmail({ to, companyName, serviceName, deployUrl, revisionUrl }) {
  console.log(`📧 メール送信中: ${to}`);

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【LP完成のお知らせ】${serviceName} のランディングページが完成しました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>ランディングページが完成しました 🎉</h2>
  <p>${companyName} 担当者様</p>
  <p>「${serviceName}」のランディングページが完成し、公開されました。</p>
  <p>
    <a href="${deployUrl}" style="
      display: inline-block;
      background: #0070f3;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
    ">LPを確認する</a>
  </p>
  <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
  <h3 style="margin: 0 0 8px;">修正がございましたら</h3>
  <p style="margin: 0 0 16px; color: #555;">1回限りの修正依頼フォームをご用意しました。<br>LPをご確認いただき、変更したい箇所をこちらからご連絡ください。</p>
  ${revisionUrl ? `
  <p>
    <a href="${revisionUrl}" style="
      display: inline-block;
      background: #f5f5f5;
      color: #333;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
      border: 1px solid #ddd;
    ">修正依頼フォームを開く</a>
  </p>
  <p style="color:#999; font-size:12px;">※このURLは1回のみ有効です。</p>
  ` : ''}
  <hr style="border:none; border-top:1px solid #eee; margin: 24px 0;">
  <p>継続的な修正・更新は月額1万円の修正し放題プランもご用意しています。</p>
  <hr>
  <p style="color: #666; font-size: 12px;">このメールは自動送信されています。</p>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`メール送信失敗: ${error.message}`);
  }

  console.log(`✅ メール送信完了: ${data.id}`);
  return data;
}

/**
 * リサーチ結果と制作方向性をクライアントにメールで送る
 */
async function sendResearchEmail({ to, businessName, businessType, researchSummary }) {
  console.log(`📧 リサーチメール送信中: ${to}`);

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to,
    subject: `【制作方針のご確認】${businessName} のLP制作を開始します`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #0070f3;">LP制作を開始します</h2>
  <p>${businessName} ご担当者様</p>
  <p>ご依頼ありがとうございます。<br>
  ${businessType}の市場リサーチを行い、以下の方針でLP制作を進めます。</p>

  <div style="background: #f5f5f5; border-left: 4px solid #0070f3; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
    <h3 style="margin-top: 0;">制作方針・市場分析</h3>
    <div style="white-space: pre-wrap; line-height: 1.7;">${researchSummary}</div>
  </div>

  <p>上記の方向性でLP制作を開始します。<br>
  完成次第、プレビューURLをお送りします（通常3〜5営業日）。</p>
  <p>ご不明点やご要望がございましたら、このメールにご返信ください。</p>
  <hr>
  <p style="color: #999; font-size: 12px;">MK-LAB LP制作サービス</p>
</body>
</html>
    `,
  });

  if (error) {
    throw new Error(`リサーチメール送信失敗: ${error.message}`);
  }

  console.log(`✅ リサーチメール送信完了: ${data.id}`);
  return data;
}

module.exports = { sendDeliveryEmail, sendResearchEmail };
