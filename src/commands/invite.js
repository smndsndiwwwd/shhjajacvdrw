import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function handleInvite(interaction) {
  const clientId = interaction.client?.user?.id || process.env.CLIENT_ID || '1519999937037864980';
  const botUsername = interaction.client?.user?.username || 'Cricket Ascend';

  // Standard recommended permissions:
  // ViewChannel, SendMessages, EmbedLinks, AttachFiles, ReadMessageHistory, UseExternalEmojis, AddReactions
  const standardPerms = '379968';
  const standardInviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${standardPerms}&scope=bot+applications.commands`;

  // Administrator permissions for full automated server management without role permission conflicts
  const adminInviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot+applications.commands`;

  const embed = new EmbedBuilder()
    .setTitle(`🏏 Invite ${botUsername} to Your Server!`)
    .setDescription(
      `**Cricket Ascend** brings the ultimate cricket career RPG directly into your Discord community!\n\n` +
      `Click the buttons below to add **${botUsername}** with slash command access.`
    )
    .setColor('#38bdf8')
    .setThumbnail(interaction.client?.user?.displayAvatarURL() || 'https://cdn.discordapp.com/embed/avatars/0.png')
    .addFields(
      {
        name: '🌟 Key Highlights & Game Modes',
        value: `• **Authentic Batting Engine:** 4-step tactical batting with 328+ unique shots.\n` +
               `• **2D Dynamic Field Radar:** Live fielder positioning & targeted gap calculation.\n` +
               `• **50-Chapter Campaign:** Story-driven progression from rookie to national icon.\n` +
               `• **T20 Franchise Leagues:** Dynamic player auctions with real-time AI franchise bidding.\n` +
               `• **1v1 PvP Showdowns:** Real-time head-to-head multiplayer duels.`,
        inline: false
      },
      {
        name: '🎁 Early Bird Launch Perk',
        value: `⭐ **First 250 Registrations:** Exclusive **"Beta Tester"** badge + **500 Bonus Coins** credited automatically upon creating your career player!`,
        inline: false
      },
      {
        name: '🔗 Direct Invite Links',
        value: `• [**Recommended Invite (Standard Permissions)**](${standardInviteUrl})\n` +
               `• [**Full Access Invite (Administrator)**](${adminInviteUrl})`,
        inline: false
      }
    )
    .setFooter({ text: 'Cricket Ascend • Ready to Play in Any Server!' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('➕ Add Cricket Ascend')
      .setStyle(ButtonStyle.Link)
      .setURL(standardInviteUrl),
    new ButtonBuilder()
      .setLabel('🛡️ Add with Admin')
      .setStyle(ButtonStyle.Link)
      .setURL(adminInviteUrl)
  );

  return await interaction.reply({ embeds: [embed], components: [row] });
}
