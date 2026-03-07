const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const REVIEW_PROMPT = `あなたはスマホ表示のCSS品質レビュアーです。
以下のHTMLのCSSを審査し、スマホ（375px幅）で表示した際の問題を検出・修正してください。

## チェック観点
1. スマホ（375px）ではみ出すCSS（overflow、固定幅 例: width: 500pxなど）がないか
2. テキストが画面幅を超えるもの（white-space: nowrap、長い固定幅）がないか
3. flexboxのアイテムにmin-width: 0が設定されているか（テキストはみ出し防止）
4. ステップ/フロー系のレイアウトが横並び（flex-direction: row）のままでテキストがはみ出していないか（スマホではcolumnにすべき）

## 回答形式（JSON）
問題なし: {"status": "ok"}
問題あり: {"status": "fixed", "html": "修正済みHTML全文"}

HTMLは以下です:
`;

/**
 * LP品質レビュー＆自動修正
 * Claude Haikuでコスト効率よくCSS品質をチェックし、問題があれば修正する
 */
async function reviewAndFixLP(html, data, maxRetries = 3) {
  let currentHtml = html;

  for (let i = 0; i < maxRetries; i++) {
    console.log(`  レビュー ${i + 1}/${maxRetries} 回目...`);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: REVIEW_PROMPT + currentHtml,
        },
      ],
    });

    const responseText = message.content[0].text;

    // JSONを抽出（コードブロックで囲まれている場合も対応）
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('  レビュー結果のJSON解析失敗、スキップ');
        break;
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('  レビュー結果のJSON解析失敗、スキップ');
      break;
    }

    if (parsed.status === 'ok') {
      console.log('  問題なし');
      return currentHtml;
    }

    if (parsed.status === 'fixed' && parsed.html) {
      console.log('  問題を検出・修正しました');
      currentHtml = parsed.html;
      // 次のループで再レビュー
    } else {
      console.log('  不明なレスポンス、スキップ');
      break;
    }
  }

  return currentHtml;
}

module.exports = { reviewAndFixLP };
