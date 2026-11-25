import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/db.js';
import { emojis } from '../game/emojis.js';
import { updateAndGetEnergy } from '../game/utils.js';

export async function handleBalance(interaction) {
  try {
    const targetUser = interaction.options?.getUser
      ? (interaction.options.getUser('user') || interaction.user)
      : interaction.user;
    const discordId = targetUser.id;
    const isSelf = discordId === interaction.user.id;

    const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(discordId);
    if (!player) {
      return interaction.reply({
        content: isSelf
          ? '❌ You do not have an active career player yet! Use `/begin` to create your player and claim your starter bonus.'
          : `❌ **${targetUser.username}** does not have an active career player profile yet.`,
        flags: ['Ephemeral']
      });
    }

    const currentEnergy = updateAndGetEnergy(db, discordId);
    const contract = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND active = 1').get(discordId);

    const stipendText = contract
      ? `${contract.club_name} (${emojis.coin} ${contract.salary_per_match.toLocaleString()} / match)`
      : `${emojis.coin} 20 / match (Academy Trainee)`;

    const embed = new EmbedBuilder()
      .setTitle(`💰 Cricket Ascend Wallet • ${player.name}`)
      .setDescription(`Financial holdings and match resources for **${player.name}** (${player.nationality || 'Cricket Ascend'})`)
      .setColor('#f59e0b')
      .setThumbnail(
        typeof targetUser.displayAvatarURL === 'function'
          ? targetUser.displayAvatarURL({ size: 128 })
          : 'https://cdn.discordapp.com/embed/avatars/0.png'
      )
      .addFields(
        {
          name: '🪙 Main Currencies',
          value: 
            `• ${emojis.coin} **Coins:** **${(player.coins || 0).toLocaleString()}**\n` +
            `• ${emojis.token || emojis.ticket} **Training Tickets:** **${(player.training_tokens || 0).toLocaleString()}**\n` +
            `• ${emojis.sp} **Skill Points:** **${player.skill_points || 0} SP**`,
          inline: true
        },
        {
          name: '⚡ Player Vitals',
          value:
            `• ${emojis.energy} **Energy:** **${currentEnergy} / 100**\n` +
            `• ${emojis.form} **Recent Form:** **${player.form || 50} / 100**\n` +
            `• ${emojis.confidence} **Confidence:** **${player.confidence || 50} / 100**`,
          inline: true
        },
        {
          name: '📈 Career Standing',
          value:
            `• ⭐ **Level:** **Level ${player.level}** (${player.xp} XP)\n` +
            `• ${emojis.reputation} **Reputation:** **${player.reputation || 0} REP**\n` +
            `• 💼 **Match Stipend:** ${stipendText}`,
          inline: false
        }
      )
      .setFooter({ text: 'Cricket Ascend • Earn coins from campaign matches, contracts & challenges!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`btn_profile_${discordId}`)
        .setLabel('👤 View Profile')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`btn_train_${discordId}`)
        .setLabel('🏋️ Train')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`btn_equipment_${discordId}`)
        .setLabel('🛒 Shop Equipment')
        .setStyle(ButtonStyle.Success)
    );

    return await interaction.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in handleBalance:', error);
    const replyOpts = { content: '❌ An error occurred while retrieving wallet balance.', flags: ['Ephemeral'] };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyOpts).catch(() => {});
    } else {
      await interaction.reply(replyOpts).catch(() => {});
    }
  }
}
