const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_FROM = process.env.MAIL_FROM || 'noreply@example.com';

async function sendDeliveryEmail(to, companyName, deployUrl) {
  console.log(`[メール] ${to} へ納品メール送信中...`);

  const { data, error } = await resend.emails.send({
    from: MAIL_FROM,
    to,
    subject: `【LP納品】${companyName}様 ランディングページが完成しました`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>${companyName}様</h2>
        <p>お世話になっております。</p>
        <p>ご依頼いただいたランディングページが完成いたしました。</p>
        <p>以下のURLからご確認ください：</p>
        <p style="margin: 24px 0;">
          <a href="${deployUrl}" style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
            LPを確認する
          </a>
        </p>
        <p>修正やご要望がございましたらお気軽にご連絡ください。</p>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 14px;">LP制作サービス</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`メール送信失敗: ${error.message}`);
  }

  console.log(`[メール] 送信完了 (ID: ${data.id})`);
  return data;
}

module.exports = { sendDeliveryEmail };
