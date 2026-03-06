const {
  Client,
  GatewayIntentBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  Events,
} = require('discord.js');

let botClient = null;
let botReady = false;

/**
 * Discord Botを初期化・起動する（シングルトン）
 */
function getBot() {
  if (botClient) return botClient;

  botClient = new Client({ intents: [GatewayIntentBits.Guilds] });

  botClient.once(Events.ClientReady, () => {
    botReady = true;
    console.log(`🤖 Discord Bot起動: ${botClient.user.tag}`);
  });

  botClient.login(process.env.DISCORD_BOT_TOKEN);
  return botClient;
}

async function waitReady() {
  const bot = getBot();
  if (botReady) return bot;
  return new Promise((resolve) => bot.once(Events.ClientReady, () => resolve(bot)));
}

/**
 * フォーム受信通知（Bot経由）
 */
async function notifyFormReceived(data) {
  const bot = await waitReady();
  const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('📬 新しいLP依頼が届きました！')
    .addFields(
      { name: '会社名', value: data.companyName || '未入力', inline: true },
      { name: '担当者', value: data.contactName || '未入力', inline: true },
      { name: 'メール', value: data.email || '未入力', inline: true },
      { name: 'サービス名', value: data.serviceName || '未入力', inline: true },
      { name: 'ターゲット', value: data.targetAudience || '未入力', inline: true },
      { name: '訴求ポイント', value: data.mainMessage || '未入力', inline: false },
    )
    .setColor(0x5865f2)
    .setFooter({ text: '⚙️ LP生成・デプロイを開始します...' });

  await channel.send({ embeds: [embed] });
}

/**
 * LP完成通知 + 承認ボタン送信
 * @returns {Promise<boolean>} true=承認, false=拒否
 */
async function notifyApprovalRequest(deployUrl) {
  const bot = await waitReady();
  const channel = await bot.channels.fetch(process.env.DISCORD_CHANNEL_ID);

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
