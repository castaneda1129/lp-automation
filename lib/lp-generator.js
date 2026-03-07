const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * フォームデータからLPのHTMLを生成する
 */
async function generateLP(data, researchResult = null) {
  const researchSection = researchResult ? `
## 市場リサーチ結果（中村調査・必ず反映すること）
${researchResult}

上記リサーチ結果を必ずコピーライティングとLP構成に反映してください。特にキャッチコピーと訴求軸は調査結果を優先してください。
` : '';

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

## ページ構成（必須セクション・順番厳守）
1. **Hero** - 恐怖×希望の強いキャッチコピー + サブコピー + CTAボタン（グラデーション背景・Unsplash写真）
2. **課題提起（共感）** - ターゲットが抱える悩み・痛みを言語化。「また今年も…」「一人では続かない…」等、自分ごとに感じさせる
3. **解決策提示** - なぜこのサービスで解決できるか
4. **実績・ビフォーアフター** - 具体的な数字（-◯kg・◯ヶ月・参加者◯名等）と成果を前面に
5. **お客様の声** - 具体的なエピソード付きの証言2〜3件（顔写真はUnsplash人物写真）
6. **特徴・強み** - 3〜4つのベネフィット（SVGアイコン付きカード）
7. **料金・プラン** - 明確な料金提示
8. **お申し込みの流れ** - 3〜4ステップ
9. **よくある質問** - 3〜5問（不安・反論を先回りして解消）
10. **お問い合わせ/CTA** - ボタン（id="contact"）＋「今月残り◯枠」等の緊急性
11. **フッター** - 会社名・コピーライト

## コピーライティング要件（高CVのための必須ルール）
- **Heroキャッチ**：恐怖（現状維持の痛み）×希望（得られる未来）の組み合わせ
  - 例ジム：「また来年も、同じ言い訳をしますか？」「一人では5%しか続かない。だから、プロがいる。」
  - 例セミナー：「老後2,000万円問題。あなたの準備は、できていますか？」
- **数字を必ず使う**：「3ヶ月で-10kg」「累計3,000名」「満足度98%」等
- **ベネフィット優先**：機能ではなく得られる結果・感情変化を訴求
- **先着・限定・緊急性**：「今月残り◯枠」「先着◯名限定」をCTA周辺に必ず配置
- **FAQ**：「勧誘されませんか？」「続けられますか？」等、購買をためらわせる不安を先回り解消

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

## 「お申し込みの流れ」セクション HTML構造（必須・厳守）
以下の構造を**必ず**使うこと。クラス名も変えないこと：

\`\`\`html
<section class="flow-section">
  <div class="container">
    <h2>お申し込みの流れ</h2>
    <div class="flow-list">
      <div class="flow-item">
        <div class="flow-number">1</div>
        <div class="flow-content">
          <h3>ステップタイトル</h3>
          <p>説明文</p>
        </div>
      </div>
      <!-- 繰り返し -->
    </div>
  </div>
</section>
\`\`\`

.flow-item のCSS（必須）:
\`\`\`css
.flow-list { display: flex; flex-direction: column; gap: 24px; }
.flow-item { display: flex; flex-direction: row; align-items: flex-start; gap: 16px; }
.flow-number { flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; }
.flow-content { flex: 1; min-width: 0; }
.flow-content h3 { font-size: 1rem; word-break: keep-all; margin: 0 0 8px; }
.flow-content p { font-size: 0.9rem; line-height: 1.6; margin: 0; }
\`\`\`

${researchSection}HTMLのみを返してください。説明文・コメントは不要です。
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

  /* 全要素に横書き強制（縦書き防止） */
  * { writing-mode: horizontal-tb !important; }

  /* ステップ・フロー系：CSS Gridで確実に2カラム化 */
  /* 番号 | タイトル+説明文 の構造に強制 */
  .flow-item,
  [class*="step-item"], [class*="flow-item"], [class*="process-item"] {
    display: grid !important;
    grid-template-columns: 56px 1fr !important;
    grid-template-rows: auto !important;
    gap: 8px 16px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    align-items: start !important;
  }
  /* 番号丸：1列目、全行スパン */
  .flow-item > *:first-child,
  [class*="step-item"] > *:first-child,
  [class*="flow-item"] > *:first-child {
    grid-column: 1 !important;
    grid-row: 1 / span 10 !important;
    flex-shrink: 0 !important;
    align-self: start !important;
  }
  /* 2番目以降の子（タイトル・説明文）：2列目に縦積み */
  .flow-item > *:nth-child(n+2),
  [class*="step-item"] > *:nth-child(n+2),
  [class*="flow-item"] > *:nth-child(n+2) {
    grid-column: 2 !important;
    min-width: 0 !important;
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
