const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * フォームデータからLPのHTMLを生成する
 */
async function generateLP(data) {
  const prompt = `
あなたは日本トップクラスのWebデザイナー兼コピーライターです。
以下の情報をもとに、コンバージョン率の高いプロ品質のランディングページ（LP）のHTMLを1ファイルで作成してください。

## クライアント情報
- 会社名/サービス名: ${data.companyName || data.serviceName}
- 業種: ${data.businessType || '未入力'}
- ターゲット顧客: ${data.targetAudience || data.target}
- 主な訴求ポイント: ${data.mainMessage || data.appeal}
- 強み・特徴: ${data.strengths || '未入力'}
- 料金: ${data.price || '未入力'}
- エリア: ${data.location || '未入力'}
- CTA（行動喚起）: ${data.cta || '無料相談はこちら'}
- 担当者メール: ${data.contact || data.email}

## デザイン要件
- モダン・クリーン・信頼感のあるプロフェッショナルデザイン
- カラー：業種に合った配色（例：ジム→力強いダークカラー、医療→清潔感のある白×青）
- フォント：Noto Sans JP（Google Fonts）を使用
- スクロールアニメーション（Intersection Observer API）
- モバイルファーストのレスポンシブデザイン（スマホ優先）
- CTAボタンは目立つ色・大きめサイズ

## ページ構成（必須セクション）
1. **Hero** - 強いキャッチコピー + サブコピー + CTAボタン（グラデーション背景）
2. **課題提起** - ターゲットが抱える悩み・痛みを3〜4点
3. **解決策** - このサービスがどう解決するか
4. **特徴・強み** - 3〜4つのベネフィット（アイコン付きカード）
5. **料金・プラン** - 明確な料金提示
6. **お申し込みの流れ** - 3〜4ステップ
7. **よくある質問** - 3〜5問
8. **お問い合わせ/CTA** - フォームまたはボタン（id="contact"）
9. **フッター** - 会社名・コピーライト

## コピーライティング要件
- ターゲットの感情に訴えるキャッチコピー
- 具体的な数字・実績を積極的に使う
- ベネフィット（得られる結果）を前面に出す
- 読者が「自分ごと」と感じる言葉選び
- 行動を促す明確なCTA文言

## 画像・ビジュアル要件
- **絵文字・アイコンフォントは一切使わない**
- 代わりにUnsplash（https://images.unsplash.com）の高品質写真を使う
- Hero背景：業種に合った写真をUnsplashから使用（例：ジムなら筋トレ写真）
  - 例：https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80 （ジム）
  - 例：https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80 （不動産）
- 特徴・強みセクションのアイコン部分も写真またはSVGアイコン（シンプルな線画）を使う
- 写真はobject-fit: coverで適切にトリミング
- 写真にはdark overlayを重ねてテキストを読みやすくする

## 技術要件
- 完全なHTML（<!DOCTYPE html>から）1ファイル完結
- CSSはstyle タグ内に記述（外部ファイル不要）
- Google Fonts（Noto Sans JP）をhead内でimport
- スムーズスクロール（scroll-behavior: smooth）
- CTAボタンのhrefは "#contact" にする
- アニメーション：.fade-up クラスをIntersection Observerで制御

## レスポンシブ対応（必須・最重要）
**スマホファースト設計**：まずスマホ（375px）で完璧に表示されるCSSを書き、@media (min-width: 768px) でPCレイアウトに拡張する。PC基準で書いてmedia queryで縮小するアプローチは禁止。

### 基本ルール（全要素に適用）
- すべての要素にbox-sizing: border-boxを設定
- html, body に overflow-x: hidden と max-width: 100%を設定
- viewport meta tag必須：width=device-width, initial-scale=1.0

### デフォルト（スマホ375px基準）のCSS
- body: font-size: 16px; padding: 0; margin: 0;
- section: padding: 48px 20px;
- h1: font-size: 2rem; line-height: 1.3; word-break: keep-all;
- h2: font-size: 1.5rem; line-height: 1.3;
- p: font-size: 1rem; line-height: 1.7; word-break: keep-all;
- .container: width: 100%; padding: 0 20px; box-sizing: border-box;
- カードレイアウト: デフォルトは縦1列（flex-direction: column）
- ボタン: width: 100%; max-width: 320px; display: block; margin: 0 auto;
- 画像: width: 100%; max-width: 100%; height: auto;
- Hero: min-height: 100svh; padding: 80px 20px;

### @media (min-width: 768px) でPCに拡張
- h1: font-size: 3.5rem;
- section: padding: 80px 40px;
- .container: max-width: 1100px; margin: 0 auto;
- カード: flex-direction: row; flex-wrap: wrap;

HTMLのみを返してください。説明文・コメントは不要です。
`;

  console.log('🤖 Claude APIでLP生成中...');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  let html = message.content[0].text;
  // マークダウンのコードブロック記号を除去
  html = html.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim();

  // レスポンシブ強制修正CSS注入
  const responsiveFix = `
<style>
/* ===== RESPONSIVE FIX (auto-injected) ===== */
*, *::before, *::after { box-sizing: border-box; }
html, body { max-width: 100%; overflow-x: hidden; }
img, video, iframe { max-width: 100%; height: auto; }
h1, h2, h3 {
  word-break: keep-all;
  overflow-wrap: break-word;
  line-height: 1.3;
}
h1 { font-size: clamp(1.6rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.3rem, 4vw, 2.5rem); }
p { word-break: keep-all; overflow-wrap: break-word; }
section, div { max-width: 100%; }
@media (max-width: 767px) {
  body { padding: 0 !important; overflow-x: hidden !important; }
  section { padding-left: 20px !important; padding-right: 20px !important; }
  .container, [class*="container"], [class*="wrapper"], [class*="content"] {
    padding-left: 20px !important;
    padding-right: 20px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }
  [class*="hero"], [class*="Hero"] {
    padding-left: 20px !important;
    padding-right: 20px !important;
    text-align: center !important;
  }
  [class*="hero"] h1, [class*="Hero"] h1 {
    font-size: clamp(1.5rem, 6vw, 2rem) !important;
    padding: 0 !important;
    width: 100% !important;
  }
  [class*="hero"] p, [class*="Hero"] p {
    font-size: 0.9rem !important;
    max-width: 100% !important;
    padding: 0 !important;
    white-space: normal !important;
  }
  p { max-width: 100% !important; white-space: normal !important; }
  table { display: none !important; }
  li { word-break: keep-all !important; overflow-wrap: break-word !important; }

  /* ステップ・フロー系のレイアウト修正 */
  [class*="step"], [class*="flow"], [class*="process"] {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important;
    gap: 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  [class*="step"] > *:last-child,
  [class*="flow"] > *:last-child,
  [class*="process"] > *:last-child {
    flex: 1 !important;
    min-width: 0 !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
  }
  [class*="step"] h3, [class*="flow"] h3, [class*="process"] h3,
  [class*="step"] h4, [class*="flow"] h4, [class*="process"] h4 {
    font-size: 1rem !important;
    overflow-wrap: break-word !important;
    word-break: keep-all !important;
  }
}
/* ===== END RESPONSIVE FIX ===== */
</style>`;

  // </head>の直前に注入
  html = html.replace('</head>', `${responsiveFix}\n</head>`);

  console.log('✅ LP生成完了');
  return html;
}

module.exports = { generateLP };
