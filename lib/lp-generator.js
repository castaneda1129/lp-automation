const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

async function generateLP(formData) {
  console.log('[LP生成] Claude APIでLP生成開始...');

  const prompt = `あなたはプロのWebデザイナー兼コーダーです。以下のヒアリング情報を元に、レスポンシブ対応のランディングページ(LP)をHTML1ファイルで生成してください。

## ヒアリング情報
- 会社名: ${formData.companyName || '未定'}
- 業種: ${formData.industry || '未定'}
- ターゲット: ${formData.target || '未定'}
- LP目的: ${formData.purpose || '未定'}
- 訴求ポイント: ${formData.sellingPoints || '未定'}
- カラー・トーン: ${formData.colorTone || '未定'}
- 参考サイト: ${formData.referenceUrl || 'なし'}
- 備考: ${formData.notes || 'なし'}

## 要件
- HTML, CSS, JavaScriptを1ファイルにまとめる
- モダンでプロフェッショナルなデザイン
- レスポンシブ対応（モバイルファースト）
- セクション構成: ヒーロー、特徴/強み、CTA、フッター（最低限）
- CSSはTailwind CDNまたはインラインスタイルを使用
- 日本語で記述
- 画像はplaceholder.comなどのプレースホルダーを使用
- CTAボタンはお問い合わせや資料請求など目的に合ったものを配置

HTMLコードのみを出力してください。説明文は不要です。\`\`\`html や \`\`\` で囲まないでください。`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const html = message.content[0].text;

  console.log(`[LP生成] 完了 (${html.length}文字)`);
  return html;
}

module.exports = { generateLP };
