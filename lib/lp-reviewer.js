const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * 生成されたHTMLに確実なレスポンシブCSSを強制注入する
 * プロンプトベースの修正は品質が不安定なため、確実なCSSを直接注入する方式
 */
function injectResponsiveCSS(html) {
  const fix = `
<style id="responsive-fix">
/* ===== MOBILE-FIRST RESPONSIVE FIX ===== */
*, *::before, *::after {
  box-sizing: border-box !important;
}
html {
  overflow-x: hidden !important;
}
body {
  overflow-x: hidden !important;
  max-width: 100vw !important;
}
img, video, iframe, svg {
  max-width: 100% !important;
  height: auto !important;
}
@media (max-width: 767px) {
  /* テキストのはみ出し防止 */
  h1, h2, h3, h4, h5, h6 {
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
    hyphens: auto !important;
  }
  h1 { font-size: clamp(1.5rem, 5.5vw, 2rem) !important; line-height: 1.3 !important; }
  h2 { font-size: clamp(1.2rem, 4.5vw, 1.6rem) !important; line-height: 1.3 !important; }
  h3 { font-size: clamp(1rem, 4vw, 1.3rem) !important; }
  p, li, span, td, th {
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
    max-width: 100% !important;
  }

  /* コンテナ系の幅修正 */
  div, section, article, main, header, footer, nav {
    max-width: 100% !important;
  }

  /* Flexboxのはみ出し修正 */
  [style*="display: flex"], [style*="display:flex"],
  [class*="flex"], [class*="row"], [class*="grid"] {
    flex-wrap: wrap !important;
  }
  [class*="flex"] > *, [class*="row"] > *, [class*="grid"] > * {
    min-width: 0 !important;
    max-width: 100% !important;
  }

  /* ステップ・フロー系：番号+テキストのレイアウト */
  [class*="step"], [class*="flow"], [class*="process"] {
    width: 100% !important;
    box-sizing: border-box !important;
  }
  [class*="step-content"], [class*="step"] > div:last-child,
  [class*="flow"] > div:last-child {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
  }
  [class*="step"] h3, [class*="step"] h4,
  [class*="flow"] h3, [class*="flow"] h4 {
    font-size: 1rem !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
  }

  /* セクションのpadding */
  section, [class*="section"] {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }
  [class*="container"], [class*="wrapper"], [class*="inner"] {
    padding-left: 20px !important;
    padding-right: 20px !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* テーブルは非表示 */
  table { display: none !important; }

  /* ボタン */
  a[class*="btn"], a[class*="button"], button,
  [class*="cta"] a, [class*="cta"] button {
    display: block !important;
    width: 100% !important;
    max-width: 320px !important;
    margin-left: auto !important;
    margin-right: auto !important;
    text-align: center !important;
    word-break: keep-all !important;
  }
}
/* ===== END RESPONSIVE FIX ===== */
</style>`;

  // </head>の直前に注入
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${fix}\n</head>`);
  } else {
    html = fix + html;
  }

  // マークダウンコードブロック除去
  html = html.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

  return html;
}

/**
 * LP品質レビュー＆修正
 * CSS強制注入 + Claude Sonnetによる最終HTML品質チェック
 */
async function reviewAndFixLP(html, data, maxRetries = 2) {
  // Step 1: 確実なCSSを強制注入
  let currentHtml = injectResponsiveCSS(html);
  console.log('  ✅ レスポンシブCSS注入完了');

  // Step 2: SonnetによるHTML品質チェック（1回のみ）
  console.log('  Sonnetによる最終品質チェック...');
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: `以下のHTMLをスマホ（375px幅）で完璧に表示されるよう最終チェックしてください。

特に以下を確認・修正してください：
1. ステップ番号（丸アイコン）の横にテキストが並ぶレイアウトで、テキストがはみ出していないか
   → ステップのテキスト部分に flex:1; min-width:0; overflow-wrap:break-word を確認
2. Heroセクションのh1テキストがはみ出していないか
3. 全体的に横スクロールが発生しないか

修正が必要な場合は完全なHTMLを返してください。
問題なければ元のHTMLをそのまま返してください。

HTMLのみ返してください（説明不要）。

HTML:
${currentHtml}`,
        },
      ],
    });

    const result = message.content[0].text
      .replace(/^```html\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    if (result.includes('<!DOCTYPE') || result.includes('<html')) {
      currentHtml = result;
      // 注入済みCSSが消えた場合は再注入
      if (!currentHtml.includes('responsive-fix')) {
        currentHtml = injectResponsiveCSS(currentHtml);
      }
      console.log('  ✅ Sonnet品質チェック・修正完了');
    }
  } catch (e) {
    console.log('  ⚠️ Sonnetチェックスキップ:', e.message);
  }

  return currentHtml;
}

module.exports = { reviewAndFixLP };
