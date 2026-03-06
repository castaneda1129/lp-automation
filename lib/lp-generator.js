const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * フォームデータからLPのHTMLを生成する
 */
async function generateLP(data) {
  const prompt = `
あなたはプロのWebデザイナー兼コピーライターです。
以下の情報をもとに、高品質なランディングページ（LP）のHTMLを1ファイルで作成してください。

## クライアント情報
- 会社名: ${data.companyName}
- サービス名: ${data.serviceName}
- ターゲット顧客: ${data.targetAudience}
- 主な訴求ポイント: ${data.mainMessage}
- 強み・特徴: ${data.strengths || '未入力'}
- CTA（行動喚起）: ${data.cta || '無料相談はこちら'}
- 担当者メール: ${data.email}

## 要件
- 完全なHTML（<!DOCTYPE html>から始まる1ファイル）
- インラインCSSでスタイリング（外部ファイル不要）
- モバイルファーストのレスポンシブデザイン
- ファーストビュー、特徴セクション、CTAボタン、フッターを含む
- プロフェッショナルで信頼感のあるデザイン
- 日本語コンテンツ
- CTAボタンのhrefは "#contact" にする

HTMLのみを返してください。説明文は不要です。
`;

  console.log('🤖 Claude APIでLP生成中...');
  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const html = message.content[0].text;
  console.log('✅ LP生成完了');
  return html;
}

module.exports = { generateLP };
