const axios = require('axios');

/**
 * 生成したLPをVercel APIでデプロイし、カスタムドメインを割り当てる
 * @param {string} html - LP HTMLコンテンツ
 * @param {string} projectName - プロジェクト名（スラッグ）
 * @returns {string} カスタムドメインURL
 */
async function deployToVercel(html, projectName) {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const baseDomain = process.env.LP_BASE_DOMAIN || 'mk-lab.tech';

  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30) || 'site';

  const projectSlug = `lp-${slug}`;
  const customDomain = `${projectSlug}.${baseDomain}`;

  console.log(`🚀 Vercelデプロイ開始: ${projectSlug}`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  // デプロイ作成
  const payload = {
    name: projectSlug,
    files: [
      {
        file: 'index.html',
        data: Buffer.from(html).toString('base64'),
        encoding: 'base64',
      },
    ],
    projectSettings: { framework: null },
    target: 'production',
  };

  const response = await axios.post(
    `https://api.vercel.com/v13/deployments${teamQuery}`,
    payload,
    { headers }
  );
  const deployment = response.data;

  // デプロイ完了まで待つ
  await waitForDeployment(deployment.id, token, teamId);

  // カスタムドメインを割り当て
  await assignDomain(projectSlug, customDomain, token, teamId);

  const url = `https://${customDomain}`;
  console.log(`✅ Vercelデプロイ完了: ${url}`);
  return url;
}

/**
 * プロジェクトにカスタムドメインを割り当てる
 */
async function assignDomain(projectSlug, domain, token, teamId) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  try {
    await axios.post(
      `https://api.vercel.com/v10/projects/${projectSlug}/domains${teamQuery}`,
      { name: domain },
      { headers }
    );
    console.log(`🌐 カスタムドメイン割り当て: ${domain}`);
  } catch (e) {
    // すでに割り当て済みの場合はスキップ
    if (e.response?.data?.error?.code === 'domain_already_in_use') {
      console.log(`🌐 ドメイン既存: ${domain}`);
    } else {
      console.warn(`⚠️ ドメイン割り当て失敗: ${e.response?.data?.error?.message || e.message}`);
    }
  }
}

/**
 * デプロイ完了までポーリング
 */
async function waitForDeployment(deploymentId, token, teamId) {
  const headers = { Authorization: `Bearer ${token}` };
  const maxAttempts = 30;
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const res = await axios.get(
      `https://api.vercel.com/v13/deployments/${deploymentId}${teamQuery}`,
      { headers }
    );
    const { readyState } = res.data;

    console.log(`  デプロイ状態: ${readyState} (${i + 1}/${maxAttempts})`);

    if (readyState === 'READY') return;
    if (readyState === 'ERROR') throw new Error('Vercelデプロイ失敗');
  }

  throw new Error('デプロイタイムアウト');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { deployToVercel };
