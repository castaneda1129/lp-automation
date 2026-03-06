const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_API = 'https://api.vercel.com';

async function deployToVercel(html, projectName) {
  console.log(`[Vercel] デプロイ開始: ${projectName}`);

  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const deployPayload = {
    name: `lp-${slug}`,
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
  };

  const res = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(deployPayload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Vercelデプロイ失敗: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  const deployUrl = `https://${data.url}`;

  console.log(`[Vercel] デプロイ完了: ${deployUrl}`);
  return deployUrl;
}

module.exports = { deployToVercel };
