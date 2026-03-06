const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * LPデプロイ完了メールをクライアントに送る
 */
async function sendDeliveryEmail({ to, companyName, serviceName, deployUrl }) {
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
  <p>ご不明点やご要望がございましたら、お気軽にご返信ください。<br>
  変更は何度でも対応いたします（月額1万円プラン）。</p>
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

module.exports = { sendDeliveryEmail };
