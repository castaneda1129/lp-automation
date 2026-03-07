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
  /* フロー全体のコンテナを縦1列に */
  [class*="flow-steps"], [class*="steps-container"], [class*="process-list"] {
    display: flex !important;
    flex-direction: column !important;
    gap: 24px !important;
    width: 100% !important;
  }
  /* flow-step / step-item など横並びレイアウトのテキスト部分 */
  .flow-step, [class*="flow-step"], [class*="step-item"] {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    gap: 12px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .flow-step > div:last-child,
  [class*="flow-step"] > div:last-child,
  [class*="step-item"] > div:last-child,
  [class*="step-content"], .step-content {
    flex: 1 1 0% !important;
    min-width: 0 !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
    width: 0 !important;
  }
  .step-number, [class*="step-number"] {
    flex-shrink: 0 !important;
    width: 44px !important;
    height: 44px !important;
    font-size: 1.1rem !important;
  }
  [class*="step-content"] h3, .step-content h3,
  [class*="step-content"] h4, .step-content h4,
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

  /* flow-stepsコンテナを強制縦1列 */
  .flow-steps, [class*="flow-steps"], [class*="steps-wrap"] {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
  }
  /* flow-stepは横並び（番号＋テキスト）を維持しつつテキスト幅を確保 */
  .flow-step {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    gap: 12px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .flow-step .step-number {
    flex-shrink: 0 !important;
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
  }
  .flow-step .step-content {
    display: block !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
  }
  .flow-step .step-content h3,
  .flow-step .step-content h4 {
    display: block !important;
    width: 100% !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
    white-space: normal !important;
    margin-bottom: 4px !important;
  }
  .flow-step .step-content p {
    display: block !important;
    width: 100% !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
    white-space: normal !important;
  }

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

  // CSS注入のみで対応（Sonnetによる再生成はレイアウト破壊リスクあり）
  console.log('  ✅ CSS注入完了（Sonnetチェックはスキップ）');

  return currentHtml;
}

module.exports = { reviewAndFixLP };
