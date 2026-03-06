const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function notifyNewOrder(formData) {
  console.log('[Discord] 新規注文を通知中...');

  const embed = {
    title: '新規LP制作依頼',
    color: 0x5865f2,
    fields: [
      { name: '会社名', value: formData.companyName || '未記入', inline: true },
      { name: '担当者名', value: formData.contactName || '未記入', inline: true },
      { name: 'メールアドレス', value: formData.email || '未記入' },
      { name: '業種', value: formData.industry || '未記入', inline: true },
      { name: 'ターゲット', value: formData.target || '未記入' },
      { name: 'LP目的', value: formData.purpose || '未記入' },
      { name: '訴求ポイント', value: formData.sellingPoints || '未記入' },
      { name: 'カラー・トーン', value: formData.colorTone || '未記入', inline: true },
      { name: '参考サイト', value: formData.referenceUrl || 'なし', inline: true },
      { name: '備考', value: formData.notes || 'なし' },
    ],
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    throw new Error(`Discord通知失敗: ${res.status} ${await res.text()}`);
  }

  console.log('[Discord] 通知完了');
}

async function notifyDeployReview(deployUrl, formData) {
  console.log('[Discord] デプロイURL通知 & 承認待ち...');

  const embed = {
    title: 'LP生成完了 - 確認お願いします',
    color: 0xfee75c,
    description: [
      `**クライアント:** ${formData.companyName} (${formData.contactName})`,
      `**プレビュー:** ${deployUrl}`,
      '',
      '上記URLを確認して、このメッセージに以下のリアクションをしてください:',
      '- :white_check_mark: 承認 → クライアントへメール送信',
      '- :x: 却下 → 再生成',
    ].join('\n'),
  };

  const res = await fetch(`${DISCORD_WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    throw new Error(`Discord承認通知失敗: ${res.status} ${await res.text()}`);
  }

  console.log('[Discord] 承認通知送信完了。手動承認を待ちます。');
  return await res.json();
}

module.exports = { notifyNewOrder, notifyDeployReview };
