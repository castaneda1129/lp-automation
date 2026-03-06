const {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Events,
} = require('discord.js');
const axios = require('axios');

let botClient = null;

/**
 * Discord Botを初期化する
 */
function getBot() {
  if (botClient) return botClient;

  botClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  botClient.login(process.env.DISCORD_BOT_TOKEN);

  return botClient;
}

/**
 * フォーム受信通知（Webhookで簡易通知）
 */
async function notifyFormReceived(data) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const msg = [
    '📬 **新しいLP依頼が届きました！**',
    '',
    `**会社名:** ${data.companyName || '未入力'}`,
    `**担当者:** ${data.contactName || '未入力'}`,
    `**メール:** ${data.email || '未入力'}`,
    `**サービス名:** ${data.serviceName || '未入力'}`,
    `**ターゲット:** ${data.targetAudience || '未入力'}`,
    `**訴求ポイント:** ${data.mainMessage || '未入力'}`,
    '',
    '⚙️ LP生成・デプロイを開始します...',
  ].join('\n');

  await axios.post(webhookUrl, { content: msg });
}

/**
 * LP完成通知 + 承認ボタン送信
 * @returns {Promise<boolean>} true=承認, false=拒否
 */
async function notifyApprovalRequest(deployUrl) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const bot = getBot();

  await new Promise((resolve) => {
    if (bot.isReady()) return resolve();
    bot.once(Events.ClientReady, resolve);
  });

  const channel = await bot.channels.fetch(channelId);

  const embed = new EmbedBuilder()
    .setTitle('✅ LP生成・デプロイ完了！')
    .setDescription(`プレビューを確認して承認してください。`)
    .addFields({ name: '🔗 プレビューURL', value: deployUrl })
    .setColor(0x0070f3);

  const approveBtn = new ButtonBuilder()
    .setCustomId('lp_approve')
    .setLabel('承認して送信')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const rejectBtn = new ButtonBuilder()
    .setCustomId('lp_reject')
    .setLabel('やり直し')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('🔄');

  const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

  const message = await channel.send({ embeds: [embed], components: [row] });

  // ボタンクリック待ち（10分タイムアウト）
  return new Promise((resolve) => {
    const collector = message.createMessageComponentCollector({ time: 10 * 60 * 1000 });

    collector.on('collect', async (interaction) => {
      const approved = interaction.customId === 'lp_approve';

      // ボタンを無効化
      const disabledApprove = ButtonBuilder.from(approveBtn).setDisabled(true);
      const disabledReject = ButtonBuilder.from(rejectBtn).setDisabled(true);
      const disabledRow = new ActionRowBuilder().addComponents(disabledApprove, disabledReject);

      await interaction.update({
        embeds: [
          embed.setDescription(
            approved ? '✅ 承認されました。クライアントにメールを送信します。' : '🔄 やり直しリクエスト受付。'
          ),
        ],
        components: [disabledRow],
      });

      collector.stop();
      resolve(approved);
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        console.log('⏰ 承認タイムアウト（10分）');
        resolve(false);
      }
    });
  });
}

module.exports = { notifyFormReceived, notifyApprovalRequest, getBot };
