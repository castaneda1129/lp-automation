const axios = require('axios');

/**
 * 生成したLPをVercel APIでデプロイする
 * @param {string} html - LP HTMLコンテンツ
 * @param {string} projectName - プロジェクト名（スラッグ）
 * @returns {string} デプロイURL
 */
async function deployToVercel(html, projectName) {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;

  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') // 先頭・末尾のハイフン除去
    .slice(0, 30) || 'site';

  const deploymentName = `lp-${slug}-${Date.now()}`;

  console.log(`🚀 Vercelデプロイ開始: ${deploymentName}`);

  const payload = {
    name: deploymentName,
    files: [
      {
        file: 'index.html',
        data: Buffer.from(html).toString('base64'),
        encoding: 'base64',
      },
    ],
    projectSettings: {
      framework: null,
    },
    target: 'production',
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const url = teamId
    ? `https://api.vercel.com/v13/deployments?teamId=${teamId}`
    : 'https://api.vercel.com/v13/deployments';

  const response = await axios.post(url, payload, { headers });
  const deployment = response.data;

  // デプロイ完了まで待つ
  const deployUrl = await waitForDeployment(deployment.id, token, teamId);
  console.log(`✅ Vercelデプロイ完了: ${deployUrl}`);
  return deployUrl;
}

/**
 * デプロイ完了までポーリング
 */
async function waitForDeployment(deploymentId, token, teamId) {
  const headers = { Authorization: `Bearer ${token}` };
  const maxAttempts = 30;

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const url = teamId
      ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${teamId}`
      : `https://api.vercel.com/v13/deployments/${deploymentId}`;

    const res = await axios.get(url, { headers });
    const { readyState, url: deployUrl } = res.data;

    console.log(`  デプロイ状態: ${readyState} (${i + 1}/${maxAttempts})`);

    if (readyState === 'READY') {
      return `https://${deployUrl}`;
    }
    if (readyState === 'ERROR') {
      throw new Error('Vercelデプロイ失敗');
    }
  }

  throw new Error('デプロイタイムアウト');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { deployToVercel };
