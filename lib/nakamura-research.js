const { execSync } = require('child_process');

/**
 * 中村エージェント（Machine 3）に業界リサーチを依頼する
 * @param {object} data - フォームデータ
 * @returns {string} リサーチ結果（Markdown）
 */
async function requestResearch(data) {
  const businessType = data.businessType || 'ビジネス';
  const targetAudience = data.targetAudience || data.target || '一般ユーザー';
  const businessName = data.businessName || data.companyName || data.serviceName;

  const prompt = `以下の業種・サービスのLP制作に向けて、市場リサーチをお願いします。

## 対象サービス
- サービス名: ${businessName}
- 業種: ${businessType}
- ターゲット: ${targetAudience}

## 調査内容
1. **競合LP分析**：この業種の代表的なLPのコピー・構成の特徴（3〜5社）
2. **刺さるキャッチコピー**：ターゲットの感情に刺さるフレーズ例（5〜8個）
3. **訴求の核心**：このターゲットが最も恐れていること・最も望んでいること
4. **高CVのLP構成**：この業種で成果が出ているページ構成パターン
5. **差別化のヒント**：競合との差別化に使えるポイント

## アウトプット形式
簡潔なMarkdown（全体で600〜800文字程度）。LP制作者がすぐ使えるよう具体的に。`;

  console.log('🔬 中村リサーチ開始:', businessType);

  try {
    const result = execSync(
      `/opt/homebrew/bin/ssh -o ConnectTimeout=10 kaichi@100.65.2.126 "/opt/homebrew/bin/node /opt/homebrew/bin/openclaw agent --agent nakamura --local -m '${prompt.replace(/'/g, "'\\''")}' 2>&1"`,
      {
        timeout: 120000, // 2分
        maxBuffer: 1024 * 1024 * 5,
        shell: '/bin/zsh',
      }
    );
    const research = result.toString().trim();
    console.log('✅ 中村リサーチ完了（文字数:', research.length, ')');
    return research;
  } catch (err) {
    console.warn('⚠️ 中村リサーチ失敗（フロー継続）:', err.message);
    return null; // 失敗してもフロー継続
  }
}

module.exports = { requestResearch };
