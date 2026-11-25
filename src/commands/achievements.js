import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/db.js';
import { getPlayerAchievements } from '../game/achievements.js';
import { emojis } from '../game/emojis.js';

function formatRegDate(dateStr) {
  if (!dateStr) return 'Unknown';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return dateStr.split(' ')[0];
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr.split(' ')[0];
  }
}

export async function handleAchievements(interaction, customPage = null) {
  let targetUserId = interaction.user.id;
  let page = customPage || 1;

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('btn_ach_page_')) {
      // Format: btn_ach_page_{page}_{userId}
      const parts = customId.split('_');
      page = parseInt(parts[3], 10) || 1;
      targetUserId = parts[4] || interaction.user.id;
    } else if (customId.startsWith('btn_achievements_')) {
      targetUserId = customId.replace('btn_achievements_', '') || interaction.user.id;
    }
  } else if (interaction.options) {
    const userOption = interaction.options.getUser('user');
    if (userOption) targetUserId = userOption.id;
    const pageOption = interaction.options.getInteger('page');
    if (pageOption) page = pageOption;
  }

  const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(targetUserId);

  if (!player) {
    const isSelf = targetUserId === interaction.user.id;
    return interaction.reply({
      content: isSelf
        ? '❌ You do not have a career player yet! Use `/begin` to create your player.'
        : `❌ Target user does not have an active career profile.`,
      flags: ['Ephemeral']
    });
  }

  if (interaction.isButton()) {
    await interaction.deferUpdate().catch(() => {});
  } else {
    await interaction.deferReply().catch(() => {});
  }

  const allAchievements = getPlayerAchievements(db, targetUserId);
  const totalCount = allAchievements.length;
  const unlockedList = allAchievements.filter(a => a.unlocked);
  const unlockedCount = unlockedList.length;
  const totalCoinsClaimed = unlockedList.reduce((sum, a) => sum + (a.reward_coins || 0), 0);

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  page = Math.max(1, Math.min(page, totalPages));

  const pageItems = allAchievements.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const percent = Math.round((unlockedCount / totalCount) * 100);
  const filledBars = Math.round(percent / 10);
  const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(10 - filledBars);
  const regDate = formatRegDate(player.created_at);

  const embed = new EmbedBuilder()
    .setTitle(`🏅 ${player.name}'s Career Achievements`)
    .setDescription(
      `🏆 **Career Milestones & Hall of Fame**\n\n` +
      `📊 **Unlocked:** \`${unlockedCount} / ${totalCount}\` (**${percent}%**)\n` +
      `\`${progressBar}\`\n\n` +
      `📅 **Member Registered:** \`${regDate}\`\n` +
      `${emojis.coin} **Total Achievement Rewards:** **+${totalCoinsClaimed.toLocaleString()} Coins**\n` +
      `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`
    )
    .setColor('#f59e0b')
    .setFooter({ text: `Page ${page} of ${totalPages} • Cricket Ascend 🏏` })
    .setTimestamp();

  for (const ach of pageItems) {
    const statusIcon = ach.unlocked ? '🟢' : '🔒';
    const statusTag = ach.unlocked ? '`UNLOCKED`' : '`LOCKED`';
    let meta = '';
    if (ach.unlocked) {
      const earnedDateStr = formatRegDate(ach.earned_at);
      meta = `\n🏆 *Unlocked:* \`${earnedDateStr}\` • ${emojis.coin} *Reward:* **+${ach.reward_coins} Coins**`;
    } else {
      meta = `\n🎯 *Reward on unlock:* ${emojis.coin} **+${ach.reward_coins} Coins**`;
    }

    embed.addFields({
      name: `${statusIcon} ${ach.name} • ${statusTag}`,
      value: `💬 *${ach.description}*${meta}`,
      inline: false
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_ach_page_${page - 1}_${targetUserId}`)
      .setLabel('⬅️ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`btn_ach_ind_${targetUserId}`)
      .setLabel(`Page ${page}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`btn_ach_page_${page + 1}_${targetUserId}`)
      .setLabel('Next ➡️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
    new ButtonBuilder()
      .setCustomId(`btn_profile_${targetUserId}`)
      .setLabel('⬅️ Back to Profile')
      .setStyle(ButtonStyle.Primary)
  );

  const payload = {
    content: '',
    embeds: [embed],
    files: [],
    attachments: [],
    components: [row]
  };

  await interaction.editReply(payload).catch(console.error);
}
