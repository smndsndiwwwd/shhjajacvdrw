import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import db from '../database/db.js';
import { addXP } from '../game/utils.js';
import { emojis } from '../game/emojis.js';
import { sendBotLog } from '../game/botLogger.js';

export async function handleAdmin(interaction) {
  // Check administrator permissions
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ You do not have permission to run admin commands. Administrator permission is required.',
      flags: ['Ephemeral']
    });
  }

  // Defer ephemerally first to avoid gateway timeouts
  await interaction.deferReply({ flags: ['Ephemeral'] });

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'dashboard') {
    // Verify bot owner OR administrator
    const app = await interaction.client.application.fetch();
    const isOwner = app.owner.members ? app.owner.members.has(interaction.user.id) : app.owner.id === interaction.user.id;

    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({
        content: '❌ You must be the Bot Owner or a Server Administrator to access this dashboard.'
      });
    }

    const screen = getDashboardHome(interaction.user.id);
    return await interaction.editReply({
      ...screen
    });
  }

  // Subcommands that require target user check
  const targetUser = interaction.options.getUser('user');
  const discordId = targetUser.id;

  // Check if target player exists in db
  const targetPlayer = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);
  if (!targetPlayer) {
    return interaction.editReply({
      content: `❌ User **${targetUser.username}** does not have an active career profile.`
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('🛠️ Admin Operation Executed')
    .setColor('#d35400')
    .setTimestamp();

  if (subcommand === 'give') {
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    if (type === 'coins') {
      db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully granted **${emojis.coin} ${amount} Coins** to **${targetPlayer.name}**.`);
    } else if (type === 'training_tokens') {
      db.prepare('UPDATE players SET training_tokens = training_tokens + ? WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully granted **${emojis.token} ${amount} Training Tickets** to **${targetPlayer.name}**.`);
    } else if (type === 'xp') {
      const xpResult = addXP(db, discordId, amount);
      let desc = `Successfully added **${amount} XP** to **${targetPlayer.name}**.`;
      if (xpResult.levelUp) {
        desc += `\n\n🎉 **Level Up!** Player reached Level **${xpResult.newLevel}**.`;
      }
      if (xpResult.achievementsUnlocked.length > 0) {
        desc += `\n🏆 **Achievements Unlocked:** ${xpResult.achievementsUnlocked.join(', ')}`;
      }
      embed.setDescription(desc);
    }

    sendBotLog(interaction.client, {
      title: '🛠️ Admin Grant Issued',
      description: `Administrator <@${interaction.user.id}> granted resources to **${targetPlayer.name}** (<@${discordId}>).`,
      color: '#e67e22',
      fields: [
        { name: 'Admin', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Recipient', value: `**${targetPlayer.name}** (<@${discordId}>)`, inline: true },
        { name: 'Grant', value: `${amount} ${type}`, inline: true }
      ]
    });

    await interaction.editReply({ embeds: [embed] });

  } else if (subcommand === 'set_energy') {
    const amount = interaction.options.getInteger('amount');
    const capped = Math.min(100, Math.max(0, amount));

    db.prepare('UPDATE players SET energy = ?, last_energy_update = ? WHERE discord_id = ?').run(capped, Date.now(), discordId);
    
    embed.setDescription(`Successfully updated **${targetPlayer.name}** energy to **${capped}/100 ⚡**.`);

    sendBotLog(interaction.client, {
      title: '⚡ Admin Energy Modified',
      description: `Administrator <@${interaction.user.id}> set energy for **${targetPlayer.name}** (<@${discordId}>).`,
      color: '#f1c40f',
      fields: [
        { name: 'Admin', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Recipient', value: `**${targetPlayer.name}** (<@${discordId}>)`, inline: true },
        { name: 'New Energy', value: `${capped}/100 ⚡`, inline: true }
      ]
    });

    await interaction.editReply({ embeds: [embed] });
  }
}

export function getDashboardHome(userId) {
  const embed = new EmbedBuilder()
    .setTitle('🛠️ Bot Owner Config & Management Dashboard')
    .setDescription('Select a configuration module below to manage emojis, training academies, sponsorship deals, and shop items.')
    .setColor('#9b59b6')
    .addFields(
      { name: '⚙️ Emoji Config', value: 'Customize the dynamic emojis displayed across the bot (coins, tokens, etc.)' },
      { name: '🎓 Manage Academies', value: 'Create, modify, or delete cricket academies and training multipliers.' },
      { name: '👟 Manage Sponsors', value: 'Create, modify, or delete sponsorship deals and gear perks.' },
      { name: '🏏 Manage Shop Items', value: 'Create or delete custom equipment in the pro shop catalog.' }
    )
    .setTimestamp();

  const dropdown = {
    type: 3, // String select menu
    custom_id: `owner_dash_main_${userId}`,
    placeholder: 'Select a module to manage...',
    options: [
      { label: '⚙️ Emoji Configuration', description: 'Modify bot emojis', value: 'dash_emojis' },
      { label: '🎓 Academy Management', description: 'Create/Edit/Delete academies', value: 'dash_academies' },
      { label: '👟 Sponsor Management', description: 'Create/Edit/Delete sponsors', value: 'dash_sponsors' },
      { label: '🏏 Shop Item Management', description: 'Create/Delete custom shop items', value: 'dash_items' }
    ]
  };

  const row = {
    type: 1, // Action row
    components: [dropdown]
  };

  return { embeds: [embed], components: [row] };
}

export async function getItemsPanel(userId) {
  const embed = new EmbedBuilder()
    .setTitle('🏏 Shop Item Management Panel')
    .setDescription('Below are the custom items currently loaded in the database. Use the select menu to delete a custom item, or click the button to add a new custom item.')
    .setColor('#3498db')
    .setTimestamp();

  const rows = db.prepare('SELECT * FROM custom_items').all();
  rows.forEach(item => {
    let bonuses = {};
    try { bonuses = JSON.parse(item.bonuses_json || '{}'); } catch(e){}
    const bonusStr = Object.entries(bonuses).map(([k,v]) => `+${v} ${k}`).join(', ');

    embed.addFields({
      name: `${item.name} (\`id: ${item.id}\`)`,
      value: `*Type:* **${item.type}** | *Rarity:* **${item.rarity}** | *Cost:* **${emojis.coin} ${item.cost}**\n*Bonuses:* ${bonusStr || 'None'}`,
      inline: false
    });
  });

  if (rows.length === 0) {
    embed.setDescription('No custom items found. Only original shop items are currently available. Click the button below to add custom items!');
  }

  const addBtn = {
    type: 2,
    style: 3, // Success
    custom_id: `owner_btn_add_item_${userId}`,
    label: '➕ Add Custom Item'
  };

  const homeBtn = {
    type: 2,
    style: 2,
    custom_id: `owner_btn_home_${userId}`,
    label: '⬅️ Back'
  };

  const buttonsRow = { type: 1, components: [addBtn, homeBtn] };
  const components = [];

  if (rows.length > 0) {
    const deleteOptions = rows.map(item => ({
      label: `Delete ${item.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
      description: `WARNING: Deletes this item permanently from shop`,
      value: `delete:${item.id}`
    }));

    const deleteMenu = {
      type: 3,
      custom_id: `owner_select_item_delete_${userId}`,
      placeholder: 'Select a custom item to DELETE...',
      options: deleteOptions.slice(0, 25)
    };

    components.push({ type: 1, components: [deleteMenu] });
  }

  components.push(buttonsRow);
  return { embeds: [embed], components };
}

export async function getEmojisPanel(userId) {
  const { emojis } = await import('../game/emojis.js');
  const embed = new EmbedBuilder()
    .setTitle('⚙️ Emoji Configuration Panel')
    .setDescription('Select an emoji below to customize its unicode character or custom Discord <:name:id> tag.')
    .setColor('#34495e')
    .addFields(
      { name: 'Coin', value: emojis.coin, inline: true },
      { name: 'Skill Point (SP)', value: emojis.sp, inline: true },
      { name: 'Training Token', value: emojis.token, inline: true },
      { name: 'Energy', value: emojis.energy, inline: true },
      { name: 'Confidence', value: emojis.confidence, inline: true },
      { name: 'Form', value: emojis.form, inline: true },
      { name: 'Reputation', value: emojis.reputation, inline: true },
      { name: 'Level/XP', value: emojis.xp, inline: true },
      { name: 'Trophy/Achievement', value: emojis.trophy, inline: true },
      { name: 'Bat', value: emojis.bat, inline: true },
      { name: 'Gloves', value: emojis.gloves, inline: true },
      { name: 'Shoes', value: emojis.shoes, inline: true },
      { name: 'Pads', value: emojis.pads, inline: true },
      { name: 'Grip', value: emojis.grip, inline: true },
      { name: 'Wicket', value: emojis.wicket, inline: true },
      { name: 'Match/Stadium', value: emojis.match, inline: true }
    )
    .setTimestamp();

  const dropdown = {
    type: 3,
    custom_id: `owner_select_emoji_${userId}`,
    placeholder: 'Select an emoji to edit...',
    options: [
      { label: 'Coins', description: `Currently: ${emojis.coin}`, value: 'emoji_coin' },
      { label: 'Skill Points', description: `Currently: ${emojis.sp}`, value: 'emoji_sp' },
      { label: 'Training Tokens', description: `Currently: ${emojis.token}`, value: 'emoji_token' },
      { label: 'Energy', description: `Currently: ${emojis.energy}`, value: 'emoji_energy' },
      { label: 'Confidence', description: `Currently: ${emojis.confidence}`, value: 'emoji_confidence' },
      { label: 'Recent Form', description: `Currently: ${emojis.form}`, value: 'emoji_form' },
      { label: 'Reputation', description: `Currently: ${emojis.reputation}`, value: 'emoji_reputation' },
      { label: 'Level/XP', description: `Currently: ${emojis.xp}`, value: 'emoji_xp' },
      { label: 'Trophy/Achievement', description: `Currently: ${emojis.trophy}`, value: 'emoji_trophy' },
      { label: 'Bat', description: `Currently: ${emojis.bat}`, value: 'emoji_bat' },
      { label: 'Gloves', description: `Currently: ${emojis.gloves}`, value: 'emoji_gloves' },
      { label: 'Shoes', description: `Currently: ${emojis.shoes}`, value: 'emoji_shoes' },
      { label: 'Pads', description: `Currently: ${emojis.pads}`, value: 'emoji_pads' },
      { label: 'Grip', description: `Currently: ${emojis.grip}`, value: 'emoji_grip' },
      { label: 'Wicket', description: `Currently: ${emojis.wicket}`, value: 'emoji_wicket' },
      { label: 'Match/Stadium', description: `Currently: ${emojis.match}`, value: 'emoji_match' }
    ]
  };

  const homeBtn = {
    type: 2, // Button
    style: 2, // Secondary
    custom_id: `owner_btn_home_${userId}`,
    label: '⬅️ Back to Main Dashboard'
  };

  const row1 = { type: 1, components: [dropdown] };
  const row2 = { type: 1, components: [homeBtn] };

  return { embeds: [embed], components: [row1, row2] };
}

export async function getAcademiesPanel(userId) {
  const embed = new EmbedBuilder()
    .setTitle('🎓 Academy Management Panel')
    .setDescription('Below are the academies loaded in the database. Use the select menu to edit/delete a specific academy, or click the button to add a new academy.')
    .setColor('#2980b9')
    .setTimestamp();

  const rows = db.prepare('SELECT * FROM academies').all();
  rows.forEach(acad => {
    let bonuses = {};
    try { bonuses = JSON.parse(acad.bonuses_json || '{}'); } catch(e){}
    const bonusStr = Object.entries(bonuses).map(([k,v]) => `+${Math.round((v-1)*100)}% ${k}`).join(', ');
    embed.addFields({
      name: `${acad.name} (\`id: ${acad.id}\`)`,
      value: `*Rating:* ${'⭐'.repeat(acad.rating)} | *Specialty:* ${acad.specialty}\n` +
            `*Coach:* ${acad.coach_rating} | *Success:* ${acad.success_rate}\n` +
            `*Grads:* Dom ${acad.graduates_domestic} | Int ${acad.graduates_international}\n` +
            `*Bonuses:* ${bonusStr || 'None'}\n` +
            `*Description:* ${acad.history}`,
      inline: false
    });
  });

  const addBtn = {
    type: 2,
    style: 3, // Success
    custom_id: `owner_btn_add_academy_${userId}`,
    label: '➕ Add New Academy'
  };

  const homeBtn = {
    type: 2,
    style: 2,
    custom_id: `owner_btn_home_${userId}`,
    label: '⬅️ Back'
  };

  const buttonsRow = { type: 1, components: [addBtn, homeBtn] };
  const components = [];

  if (rows.length > 0) {
    const editOptions = rows.map(acad => ({
      label: `Edit ${acad.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
      description: `Edit specialties & training multipliers`,
      value: `edit:${acad.id}`
    }));

    const deleteOptions = rows.map(acad => ({
      label: `Delete ${acad.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
      description: `WARNING: Deletes this academy permanently`,
      value: `delete:${acad.id}`
    }));

    const editMenu = {
      type: 3,
      custom_id: `owner_select_academy_edit_${userId}`,
      placeholder: 'Select an academy to EDIT...',
      options: editOptions.slice(0, 25)
    };

    const deleteMenu = {
      type: 3,
      custom_id: `owner_select_academy_delete_${userId}`,
      placeholder: 'Select an academy to DELETE...',
      options: deleteOptions.slice(0, 25)
    };

    components.push({ type: 1, components: [editMenu] });
    components.push({ type: 1, components: [deleteMenu] });
  }

  components.push(buttonsRow);
  return { embeds: [embed], components };
}

export async function getSponsorsPanel(userId) {
  const { emojis } = await import('../game/emojis.js');
  const embed = new EmbedBuilder()
    .setTitle('👟 Sponsor Management Panel')
    .setDescription('Below are the sponsorships loaded in the database. Use the select menu to edit/delete a specific sponsor, or click the button to add a new sponsor.')
    .setColor('#f39c12')
    .setTimestamp();

  const rows = db.prepare('SELECT * FROM sponsors').all();
  rows.forEach(sp => {
    let bonuses = {};
    try { bonuses = JSON.parse(sp.perk_item_bonuses_json || '{}'); } catch(e){}
    const bonusStr = Object.entries(bonuses).map(([k,v]) => `+${v} ${k}`).join(', ');
    
    let gearText = 'None';
    if (sp.perk_item_id) {
      gearText = `${sp.perk_item_name} (${sp.perk_item_type}) [${bonusStr}]`;
    }

    embed.addFields({
      name: `${sp.name} (\`id: ${sp.id}\`)`,
      value: `*Required Rep:* ${sp.reputation_required} | *Coin Bonus:* ${emojis.coin} ${sp.bonus_coins}\n` +
            `*Perk Gear:* ${gearText}\n` +
            `*Description:* ${sp.description}`,
      inline: false
    });
  });

  const addBtn = {
    type: 2,
    style: 3,
    custom_id: `owner_btn_add_sponsor_${userId}`,
    label: '➕ Add New Sponsor'
  };

  const homeBtn = {
    type: 2,
    style: 2,
    custom_id: `owner_btn_home_${userId}`,
    label: '⬅️ Back'
  };

  const buttonsRow = { type: 1, components: [addBtn, homeBtn] };
  const components = [];

  if (rows.length > 0) {
    const editOptions = rows.map(sp => ({
      label: `Edit ${sp.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
      description: `Edit rewards & requirements`,
      value: `edit:${sp.id}`
    }));

    const deleteOptions = rows.map(sp => ({
      label: `Delete ${sp.name.replace(/[^a-zA-Z0-9 ]/g, '').trim()}`,
      description: `WARNING: Deletes this sponsor permanently`,
      value: `delete:${sp.id}`
    }));

    const editMenu = {
      type: 3,
      custom_id: `owner_select_sponsor_edit_${userId}`,
      placeholder: 'Select a sponsor to EDIT...',
      options: editOptions.slice(0, 25)
    };

    const deleteMenu = {
      type: 3,
      custom_id: `owner_select_sponsor_delete_${userId}`,
      placeholder: 'Select a sponsor to DELETE...',
      options: deleteOptions.slice(0, 25)
    };

    components.push({ type: 1, components: [editMenu] });
    components.push({ type: 1, components: [deleteMenu] });
  }

  components.push(buttonsRow);
  return { embeds: [embed], components };
}

export async function handleOwner(interaction) {
  // Defer ephemerally first to avoid gateway timeouts
  await interaction.deferReply({ flags: ['Ephemeral'] });

  // Verify bot owner
  const app = await interaction.client.application.fetch();
  const isOwner = app.owner.members ? app.owner.members.has(interaction.user.id) : app.owner.id === interaction.user.id;

  if (!isOwner) {
    return interaction.editReply({
      content: '❌ This command is restricted to the Bot Owner only.'
    });
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'give') {
    const targetUser = interaction.options.getUser('user');
    const discordId = targetUser.id;
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    // Check if player exists
    const targetPlayer = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);
    if (!targetPlayer) {
      return interaction.editReply({
        content: `❌ User **${targetUser.username}** does not have an active career profile.`
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('👑 Bot Owner Operation Executed')
      .setColor('#9b59b6')
      .setTimestamp();

    if (type === 'coins') {
      db.prepare('UPDATE players SET coins = coins + ? WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully granted **${emojis.coin} ${amount} Coins** to **${targetPlayer.name}**.`);
    } else if (type === 'training_tokens') {
      db.prepare('UPDATE players SET training_tokens = training_tokens + ? WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully granted **${emojis.token} ${amount} Training Tokens** to **${targetPlayer.name}**.`);
    } else if (type === 'xp') {
      const xpResult = addXP(db, discordId, amount);
      let desc = `Successfully added **${amount} XP** to **${targetPlayer.name}**.`;
      if (xpResult.levelUp) {
        desc += `\n\n🎉 **Level Up!** Player reached Level **${xpResult.newLevel}**.`;
      }
      if (xpResult.achievementsUnlocked.length > 0) {
        desc += `\n🏆 **Achievements Unlocked:** ${xpResult.achievementsUnlocked.join(', ')}`;
      }
      embed.setDescription(desc);
    } else if (type === 'reputation') {
      db.prepare('UPDATE players SET reputation = MAX(0, reputation + ?) WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully updated **${targetPlayer.name}** reputation by **${amount}**.`);
    } else if (type === 'confidence') {
      db.prepare('UPDATE players SET confidence = MIN(100, MAX(10, confidence + ?)) WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully updated **${targetPlayer.name}** confidence by **${amount}**.`);
    } else if (type === 'form') {
      db.prepare('UPDATE players SET form = MIN(100, MAX(20, form + ?)) WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully updated **${targetPlayer.name}** recent form by **${amount}**.`);
    } else if (type === 'skill_points') {
      db.prepare('UPDATE players SET skill_points = MAX(0, skill_points + ?) WHERE discord_id = ?').run(amount, discordId);
      embed.setDescription(`Successfully granted **${emojis.sp} ${amount} Skill Points** to **${targetPlayer.name}**.`);
    } else if (type === 'energy') {
      db.prepare('UPDATE players SET energy = MIN(100, MAX(0, energy + ?)), last_energy_update = ? WHERE discord_id = ?').run(amount, Date.now(), discordId);
      embed.setDescription(`Successfully updated **${targetPlayer.name}** energy by **${amount} ${emojis.energy}**.`);
    }

    sendBotLog(interaction.client, {
      title: '👑 Owner Grant Issued',
      description: `Bot Owner <@${interaction.user.id}> modified resources for **${targetPlayer.name}** (<@${discordId}>).`,
      color: '#9b59b6',
      fields: [
        { name: 'Owner', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Recipient', value: `**${targetPlayer.name}** (<@${discordId}>)`, inline: true },
        { name: 'Grant', value: `${amount} ${type}`, inline: true }
      ]
    });

    return await interaction.editReply({ embeds: [embed] });
  }
}
