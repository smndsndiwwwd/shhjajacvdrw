import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../database/db.js';
import { shopEquipment, getItemById } from '../game/equipment.js';
import { emojis } from '../game/emojis.js';


// Load canvas library safely
let canvasLib = null;
try {
  canvasLib = await import('@napi-rs/canvas');
} catch (e) {
  console.warn('Canvas library @napi-rs/canvas not available yet, falling back.');
}

export async function handleInventory(interaction) {
  const discordId = interaction.user.id;
  const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  const items = db.prepare('SELECT * FROM inventory WHERE player_id = ?').all(discordId);

  // Helper to draw rounded rectangles
  function drawRoundRect(ctx, x, y, width, height, radius, fillStyle = null, strokeStyle = null, strokeWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  // Create dropdown menu to equip items
  const unequippedItems = items.filter(item => !item.equipped);
  let selectRow = null;
  
  if (unequippedItems.length > 0) {
    const selectOptions = unequippedItems.map(item => {
      let bonusText = '';
      try {
        const bonuses = JSON.parse(item.bonuses);
        bonusText = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
      } catch (e) {}

      return {
        label: `${item.type}: ${item.name}`,
        description: `${item.rarity} | ${bonusText}`.substring(0, 100),
        value: String(item.id)
      };
    });

    selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`equip_item_${discordId}`)
        .setPlaceholder('Select gear to equip...')
        .addOptions(selectOptions.slice(0, 25))
    );
  }

  let response;

  if (canvasLib && items.length > 0) {
    try {
      const { createCanvas } = canvasLib;
      const canvas = createCanvas(800, 600);
      const ctx = canvas.getContext('2d');

      // Background
      const mainGrad = ctx.createLinearGradient(0, 0, 800, 600);
      mainGrad.addColorStop(0, '#0c1b17'); // Dark green/teal metallic hue
      mainGrad.addColorStop(1, '#020705');
      ctx.fillStyle = mainGrad;
      ctx.fillRect(0, 0, 800, 600);

      // Grid
      ctx.strokeStyle = 'rgba(26, 188, 156, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 800; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 600);
        ctx.stroke();
      }
      for (let i = 0; i < 600; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(800, i);
        ctx.stroke();
      }

      // Border
      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 780, 580);

      // Header Banner
      drawRoundRect(ctx, 30, 30, 740, 70, 12, 'rgba(17, 24, 39, 0.85)', '#1abc9c', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎒 EQUIPMENT BAG & LOCKER', 400, 60);
      ctx.fillStyle = '#1abc9c';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${player.name.toUpperCase()}'S ACTIVE INVENTORY`, 400, 82);

      // Left Panel: Equipped Items
      drawRoundRect(ctx, 30, 120, 350, 440, 16, 'rgba(17, 24, 39, 0.85)', '#1abc9c', 2);
      ctx.fillStyle = '#1abc9c';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('⭐ EQUIPPED GEAR', 50, 150);

      const equippedList = items.filter(item => item.equipped);
      const categories = ['Bat', 'Grip', 'Gloves', 'Pads', 'Helmet', 'Shoes'];
      
      categories.forEach((cat, index) => {
        const item = equippedList.find(i => i.type === cat);
        const y = 185 + index * 60;
        
        drawRoundRect(ctx, 50, y, 310, 48, 8, 'rgba(30, 41, 59, 0.6)');
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(cat.toUpperCase(), 60, y + 18);
        
        if (item) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(item.name, 60, y + 36);

          let bonusStr = '';
          try {
            const bonuses = JSON.parse(item.bonuses);
            bonusStr = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
          } catch(e){}

          let rColor = '#ffffff';
          if (item.rarity === 'Rare') rColor = '#3b82f6';
          else if (item.rarity === 'Epic') rColor = '#a855f7';
          else if (item.rarity === 'Legendary') rColor = '#eab308';
          
          ctx.fillStyle = rColor;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(item.rarity, 350, y + 18);

          ctx.fillStyle = '#1abc9c';
          ctx.font = '11px sans-serif';
          ctx.fillText(bonusStr, 350, y + 36);
          ctx.textAlign = 'left';
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.font = 'italic 12px sans-serif';
          ctx.fillText('Locker Empty', 60, y + 36);
        }
      });

      // Right Panel: Backpack Items (unequipped)
      drawRoundRect(ctx, 400, 120, 370, 440, 16, 'rgba(17, 24, 39, 0.85)', '#1abc9c', 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('🎒 BACKPACK CONTENTS', 420, 150);

      const unequippedList = items.filter(item => !item.equipped);
      if (unequippedList.length === 0) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = 'italic 14px sans-serif';
        ctx.fillText('No unequipped items in backpack.', 420, 200);
      } else {
        const itemsToShow = unequippedList.slice(0, 6);
        itemsToShow.forEach((item, index) => {
          const y = 175 + index * 58;

          drawRoundRect(ctx, 420, y, 330, 48, 8, 'rgba(30, 41, 59, 0.4)');

          let rColor = '#ffffff';
          if (item.rarity === 'Rare') rColor = '#3b82f6';
          else if (item.rarity === 'Epic') rColor = '#a855f7';
          else if (item.rarity === 'Legendary') rColor = '#eab308';

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.fillText(item.name, 430, y + 20);

          ctx.fillStyle = rColor;
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`${item.type} | ${item.rarity}`, 430, y + 38);

          let bonusStr = '';
          try {
            const bonuses = JSON.parse(item.bonuses);
            bonusStr = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
          } catch(e){}

          ctx.fillStyle = '#1abc9c';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(bonusStr, 740, y + 28);
          ctx.textAlign = 'left';
        });

        if (unequippedList.length > 6) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = 'italic 12px sans-serif';
          ctx.fillText(`... and ${unequippedList.length - 6} more item(s) in locker`, 420, 535);
        }
      }

      const buffer = canvas.toBuffer('image/png');
      const attachment = new AttachmentBuilder(buffer, { name: `inventory_${discordId}.png` });

      const replyOpts = {
        content: `🎒 **${player.name}'s Equipment Inventory:**`,
        files: [attachment]
      };
      if (selectRow) replyOpts.components = [selectRow];

      response = await interaction.editReply(replyOpts);

    } catch (err) {
      console.error('Error drawing inventory canvas:', err);
    }
  }

  if (!response) {
    const embed = new EmbedBuilder()
      .setTitle(`🎒 Equipment Bag: ${player.name}`)
      .setDescription('Review your gear and choose items to equip. Equipped items boost your attributes during matches and training.')
      .setColor('#1abc9c')
      .setTimestamp();

    if (items.length === 0) {
      embed.setDescription('Your bag is empty. Visit the shop using \`/equipment shop\` to buy some gear!');
      const replyOpts = { embeds: [embed] };
      return await interaction.editReply(replyOpts);
    }

    // Group items by type
    const grouped = {};
    items.forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });

    const rarityColor = {
      Common: '⚪',
      Rare: '🔵',
      Epic: '🟣',
      Legendary: '🟡'
    };

    const typeEmojis = {
      Bat: emojis.bat,
      Grip: emojis.grip,
      Gloves: emojis.gloves,
      Pads: emojis.pads,
      Helmet: emojis.helmet,
      Shoes: emojis.shoes
    };

    for (const [type, list] of Object.entries(grouped)) {
      const listText = list.map(item => {
        const equipIndicator = item.equipped ? '⭐ **[Equipped]**' : '▫️';
        let bonusText = '';
        try {
          const bonuses = JSON.parse(item.bonuses);
          bonusText = Object.entries(bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
        } catch (e) {}
        
        const emoji = rarityColor[item.rarity] || '⚪';
        return `${equipIndicator} ${emoji} **${item.name}** (\`id: ${item.id}\` | ${item.rarity}) - *${bonusText}*`;
      }).join('\n');

      const categoryEmoji = typeEmojis[type] || '🛠️';
      embed.addFields({ name: `${categoryEmoji} ${type}s`, value: listText });
    }

    const replyOpts = { embeds: [embed] };
    if (selectRow) replyOpts.components = [selectRow];

    response = await interaction.editReply(replyOpts);
  }

  if (selectRow) {
    const filter = i => i.customId === `equip_item_${discordId}` && i.user.id === discordId;
    const collector = response.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
      const itemIdToEquip = parseInt(i.values[0], 10);
      const targetItem = db.prepare('SELECT * FROM inventory WHERE id = ? AND player_id = ?').get(itemIdToEquip, discordId);

      if (!targetItem) {
        return i.reply({ content: '❌ Item not found in your inventory.', flags: ['Ephemeral'] });
      }

      // Unequip all items of this type
      db.prepare('UPDATE inventory SET equipped = 0 WHERE player_id = ? AND type = ?').run(discordId, targetItem.type);

      // Equip target item
      db.prepare('UPDATE inventory SET equipped = 1 WHERE id = ?').run(itemIdToEquip);

      await i.update({
        content: `✅ Successfully equipped **${targetItem.name}**! Your active attributes have been boosted.`,
        embeds: [],
        components: [],
        files: [],
        attachments: []
      });
      collector.stop();
    });
  }
}


export async function handleEquipment(interaction) {
  const discordId = interaction.user.id;
  const subcommand = interaction.options.getSubcommand();
  
  const player = db.prepare('SELECT name, coins FROM players WHERE discord_id = ?').get(discordId);

  if (!player) {
    return interaction.reply({
      content: '❌ You do not have a career player yet! Use `/begin` to create your player.',
      flags: ['Ephemeral']
    });
  }

  await interaction.deferReply();

  // Helper to draw rounded rectangles
  function drawRoundRect(ctx, x, y, width, height, radius, fillStyle = null, strokeStyle = null, strokeWidth = 1) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
    if (fillStyle) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }

  if (subcommand === 'shop') {
    let activeCategory = 'Bat';
    let message = null;

    const renderShop = async () => {
      const currentPlayerCoins = db.prepare('SELECT coins FROM players WHERE discord_id = ?').get(discordId).coins;

      let fileAttachment = null;
      let embed = null;

      const colors = {
        Bat: '#3b82f6',
        Grip: '#a855f7',
        Gloves: '#10b981',
        Pads: '#f59e0b',
        Helmet: '#ef4444',
        Shoes: '#06b6d4'
      };
      const categoryColor = colors[activeCategory] || '#e67e22';

      const typeEmojis = {
        Bat: emojis.bat || '🏏',
        Grip: emojis.grip || '🌀',
        Gloves: emojis.gloves || '🧤',
        Pads: emojis.pads || '🛡️',
        Helmet: emojis.helmet || '🪖',
        Shoes: emojis.shoes || '👟'
      };

      if (canvasLib) {
        try {
          const { createCanvas } = canvasLib;
          const canvas = createCanvas(600, 500);
          const ctx = canvas.getContext('2d');

          // Background
          const mainGrad = ctx.createLinearGradient(0, 0, 600, 500);
          mainGrad.addColorStop(0, '#1c120c');
          mainGrad.addColorStop(1, '#070503');
          ctx.fillStyle = mainGrad;
          ctx.fillRect(0, 0, 600, 500);

          // Grid
          ctx.strokeStyle = 'rgba(230, 126, 34, 0.15)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 600; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 500);
            ctx.stroke();
          }
          for (let i = 0; i < 500; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(600, i);
            ctx.stroke();
          }

          // Border
          ctx.strokeStyle = '#e67e22';
          ctx.lineWidth = 4;
          ctx.strokeRect(10, 10, 580, 480);

          // Header Banner
          drawRoundRect(ctx, 30, 30, 540, 75, 12, 'rgba(17, 24, 39, 0.85)', '#e67e22', 2);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`🛒 SHOP: ${activeCategory.toUpperCase()}S`, 300, 62);
          ctx.fillStyle = '#f1c40f';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`BALANCE: 🪙 ${currentPlayerCoins} COINS`, 300, 85);

          const items = Object.values(shopEquipment).filter(i => i.type === activeCategory);
          drawRoundRect(ctx, 30, 125, 540, 345, 16, 'rgba(17, 24, 39, 0.85)', categoryColor, 2);

          items.forEach((item, index) => {
            const itemY = 145 + index * 75;
            drawRoundRect(ctx, 50, itemY, 500, 65, 8, 'rgba(30, 41, 59, 0.6)', 'rgba(230, 126, 34, 0.3)', 1);

            let rColor = '#ffffff';
            if (item.rarity === 'Rare') rColor = '#3b82f6';
            else if (item.rarity === 'Epic') rColor = '#a855f7';
            else if (item.rarity === 'Legendary') rColor = '#eab308';

            ctx.fillStyle = rColor;
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.name.replace(/[^a-zA-Z0-9 [\]()]/g, ''), 70, itemY + 22);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.fillText(`id: ${item.id} | Rarity: ${item.rarity}`, 70, itemY + 38);

            let bonusStr = '';
            try {
              bonusStr = Object.entries(item.bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
            } catch(e){}

            ctx.fillStyle = '#e67e22';
            ctx.font = '11px sans-serif';
            ctx.fillText(`Bonuses: ${bonusStr}`, 70, itemY + 54);

            ctx.fillStyle = '#f1c40f';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`🪙 ${item.cost}`, 530, itemY + 38);
            ctx.textAlign = 'left';
          });

          const buffer = canvas.toBuffer('image/png');
          fileAttachment = new AttachmentBuilder(buffer, { name: `shop_${discordId}_${Date.now()}.png` });
        } catch (err) {
          console.error('Error drawing shop catalog canvas:', err);
        }
      }

      if (!fileAttachment) {
        embed = new EmbedBuilder()
          .setTitle(`🛒 Equipment Shop: ${activeCategory}s`)
          .setDescription(`Current Balance: **${emojis.coin} ${currentPlayerCoins} Coins**\nBrowse items to purchase. Equip items via \`/inventory\` once bought.`)
          .setColor(categoryColor)
          .setTimestamp();

        const rarityColor = {
          Common: '⚪',
          Rare: '🔵',
          Epic: '🟣',
          Legendary: '🟡'
        };

        const items = Object.values(shopEquipment).filter(i => i.type === activeCategory);
        const listText = items.map(item => {
          const emoji = rarityColor[item.rarity] || '⚪';
          const bonusText = Object.entries(item.bonuses).map(([k, v]) => `+${v} ${k}`).join(', ');
          return `${emoji} **${item.name}** (\`id: ${item.id}\` | ${item.rarity})\n   └ Price: **${emojis.coin} ${item.cost}** | Bonuses: *${bonusText}*`;
        }).join('\n');

        const categoryEmoji = typeEmojis[activeCategory] || '🛠️';
        embed.addFields({ name: `${categoryEmoji} Available ${activeCategory}s`, value: listText });
      }

      const buttonsRow1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`shop_cat_Bat_${discordId}`).setLabel('🏏 Bats').setStyle(activeCategory === 'Bat' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`shop_cat_Grip_${discordId}`).setLabel('🌀 Grips').setStyle(activeCategory === 'Grip' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`shop_cat_Gloves_${discordId}`).setLabel('🧤 Gloves').setStyle(activeCategory === 'Gloves' ? ButtonStyle.Success : ButtonStyle.Primary)
      );

      const buttonsRow2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`shop_cat_Pads_${discordId}`).setLabel('🛡️ Pads').setStyle(activeCategory === 'Pads' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`shop_cat_Helmet_${discordId}`).setLabel('🪖 Helmets').setStyle(activeCategory === 'Helmet' ? ButtonStyle.Success : ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`shop_cat_Shoes_${discordId}`).setLabel('👟 Shoes').setStyle(activeCategory === 'Shoes' ? ButtonStyle.Success : ButtonStyle.Primary)
      );

      const purchaseOptions = Object.values(shopEquipment)
        .filter(item => item.type === activeCategory && item.cost <= currentPlayerCoins)
        .map(item => ({
          label: `Buy ${item.name}`,
          description: `Price: ${item.cost} Coins`,
          value: item.id
        }));

      const components = [buttonsRow1, buttonsRow2];
      if (purchaseOptions.length > 0) {
        const selectRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`shop_buy_${discordId}`)
            .setPlaceholder(`Select ${activeCategory} to purchase...`)
            .addOptions(purchaseOptions.slice(0, 25))
        );
        components.push(selectRow);
      }

      const payload = {
        content: `🛒 **Equipment Shop (${activeCategory}s page):**`,
        embeds: embed ? [embed] : [],
        files: fileAttachment ? [fileAttachment] : [],
        components: components
      };

      if (!message) {
        message = await interaction.editReply(payload);
      } else {
        await message.edit({ ...payload, attachments: [] }).catch(async () => {
          message = await message.channel.send(payload);
        });
      }
    };

    await renderShop();

    const filter = i => i.user.id === discordId && (i.customId === `shop_buy_${discordId}` || i.customId.startsWith('shop_cat_'));
    const collector = message.createMessageComponentCollector({ filter, time: 180000 });

    collector.on('collect', async i => {
      const customId = i.customId;

      if (customId.startsWith('shop_cat_')) {
        await i.deferUpdate().catch(() => {});
        activeCategory = customId.replace('shop_cat_', '').replace(`_${discordId}`, '');
        await renderShop();
      } else if (customId === `shop_buy_${discordId}`) {
        const selectedItemId = i.values[0];
        const item = getItemById(selectedItemId);

        // Re-fetch coins in transaction
        const currentCoins = db.prepare('SELECT coins FROM players WHERE discord_id = ?').get(discordId).coins;
        if (currentCoins < item.cost) {
          return i.reply({ content: '❌ You no longer have enough coins to buy this item.', flags: ['Ephemeral'] }).catch(() => {});
        }

        // Deduct coins & Insert into inventory
        db.prepare('UPDATE players SET coins = coins - ? WHERE discord_id = ?').run(item.cost, discordId);
        db.prepare(`
          INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
          VALUES (?, ?, ?, ?, ?, ?, 0)
        `).run(discordId, item.id, item.name, item.type, item.rarity, JSON.stringify(item.bonuses));

        await i.reply({
          content: `🎉 Successfully purchased **${item.name}** for **${emojis.coin} ${item.cost}**! Visit \`/inventory\` to equip it and activate the attribute boosts.`,
          flags: ['Ephemeral']
        }).catch(() => {});

        // Re-render shop page
        await renderShop();
      }
    });

    collector.on('end', async () => {
      if (message) {
        await message.edit({ components: [] }).catch(() => {});
      }
    });

  } else if (subcommand === 'buy') {
    const itemId = interaction.options.getString('item_id').toLowerCase().trim();
    const item = getItemById(itemId);

    if (!item) {
      return interaction.editReply({
        content: `❌ Item \`${itemId}\` does not exist. Check \`/equipment shop\` for item IDs.`
      });
    }

    if (player.coins < item.cost) {
      return interaction.editReply({
        content: `❌ You do not have enough coins! **${item.name}** costs **${emojis.coin} ${item.cost}**, but you only have **${emojis.coin} ${player.coins}**.`
      });
    }

    // Deduct coins & Insert
    db.prepare('UPDATE players SET coins = coins - ? WHERE discord_id = ?').run(item.cost, discordId);
    db.prepare(`
      INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(discordId, item.id, item.name, item.type, item.rarity, JSON.stringify(item.bonuses));

    const embed = new EmbedBuilder()
      .setTitle('🛒 Purchase Successful!')
      .setDescription(`You bought **${item.name}** for **${emojis.coin} ${item.cost}**!`)
      .setColor('#2ecc71')
      .setFooter({ text: 'Equip your new gear using /inventory' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
}
