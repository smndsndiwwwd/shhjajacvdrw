import { handleCareerStart, handleProfile, handleRetire, handleBeginInteraction } from '../commands/career.js';
import { handleStats, handleAttributes, handleHistory, handleLeaderboard } from '../commands/stats.js';
import { handleTrain, handleSkills, handleAcademy } from '../commands/training.js';
import { handleInventory, handleEquipment } from '../commands/items.js';
import { handlePlay, handleChapters, handleContracts, handleSeason, handleTeam, handleSponsors } from '../commands/gameplay.js';
import { handleFranchise, handlePlayMatch, handleLeagueDetail, handleConfirmRegister, handleRunAuction } from '../commands/franchise.js';
import { handleAdmin, handleOwner } from '../commands/admin.js';
import { handleHelp, handleHelpTabButton } from '../commands/help.js';
import { handleChallenge, handleChallengeStats, handleChallengeLeaderboard } from '../commands/challenge.js';
import { handleTournament, startQuickMatch, executeQuickMatch, handleTournamentDetails, handlePickTeam, playNextTournamentMatch, executeTournamentMatch, showTournamentBracket, handleAbandonTournament } from '../commands/tournament.js';
import { handleShotMap, renderShotMapEditor, renderPresetSummary } from '../commands/shotmap.js';
import { handleSettings } from '../commands/settings.js';
import { handleAchievements } from '../commands/achievements.js';
import { handleInvite } from '../commands/invite.js';
import { handleBalance } from '../commands/balance.js';
import { setPlayerEquippedShot, getShotById, resetPlayerPreset } from '../game/shotmap.js';
import db from '../database/db.js';
import { getDashboardHome, getEmojisPanel, getAcademiesPanel, getSponsorsPanel } from '../commands/admin.js';
import { loadAcademies } from '../game/academies.js';
import { enforceGraphicCooldown } from '../game/cooldown.js';
import { isPlayerInMatch } from '../game/matchState.js';

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      try {
        if (commandName === 'begin') {
          return await handleCareerStart(interaction);
        } else if (commandName === 'career') {
          const subcommand = interaction.options.getSubcommand(false);
          if (subcommand === 'start' || !subcommand) return await handleCareerStart(interaction);
        } else if (commandName === 'profile') {
          return await handleProfile(interaction); // EXEMPT from cooldown
        } else if (commandName === 'academy') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleAcademy(interaction);
        } else if (commandName === 'train') {
          return await handleTrain(interaction);
        } else if (commandName === 'chapters') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleChapters(interaction);
        } else if (commandName === 'play') {
          return await handlePlay(interaction);
        } else if (commandName === 'inventory') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleInventory(interaction);
        } else if (commandName === 'equipment') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleEquipment(interaction);
        } else if (commandName === 'attributes') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleAttributes(interaction);
        } else if (commandName === 'skills') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleSkills(interaction);
        } else if (commandName === 'leaderboard') {
          return await handleLeaderboard(interaction);
        } else if (commandName === 'history') {
          return await handleHistory(interaction);
        } else if (commandName === 'stats') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleStats(interaction);
        } else if (commandName === 'contracts') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleContracts(interaction);
        } else if (commandName === 'team') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleTeam(interaction);
        } else if (commandName === 'sponsors') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleSponsors(interaction);
        } else if (commandName === 'challenge') {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === 'duel') {
            return await handleChallenge(interaction);
          } else if (subcommand === 'stats') {
            if (!await enforceGraphicCooldown(interaction)) return;
            return await handleChallengeStats(interaction);
          } else if (subcommand === 'leaderboard') {
            if (!await enforceGraphicCooldown(interaction)) return;
            return await handleChallengeLeaderboard(interaction);
          }
        } else if (commandName === 'season') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleSeason(interaction);
        } else if (commandName === 'retire') {
          return await handleRetire(interaction);
        } else if (commandName === 'help') {
          const topic = interaction.options?.getString?.('topic');
          return await handleHelp(interaction, topic);
        } else if (commandName === 'admin') {
          return await handleAdmin(interaction);
        } else if (commandName === 'owner') {
          return await handleOwner(interaction);
        } else if (commandName === 'franchise') {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleFranchise(interaction);
        } else if (commandName === 'playmatch') {
          return await handlePlayMatch(interaction);
        } else if (commandName === 'tournament') {
          const subcommand = interaction.options?.getSubcommand?.(false);
          return await handleTournament(interaction, subcommand);
        } else if (commandName === 'shotmap') {
          const subcommand = interaction.options?.getSubcommand?.(false);
          return await handleShotMap(interaction, subcommand);
        } else if (commandName === 'settings') {
          return await handleSettings(interaction);
        } else if (commandName === 'achievements') {
          return await handleAchievements(interaction);
        } else if (commandName === 'invite') {
          return await handleInvite(interaction);
        } else if (commandName === 'balance' || commandName === 'bal') {
          return await handleBalance(interaction);
        }
      } catch (error) {
        console.error(`Error executing slash command /${commandName}:`, error);
        const replyOpts = { content: '❌ An error occurred while executing this command!', flags: ['Ephemeral'] };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyOpts).catch(async () => {
            if (interaction.channel?.send) {
              await interaction.channel.send(replyOpts).catch(() => {});
            }
          });
        } else {
          await interaction.reply(replyOpts).catch(async () => {
            if (interaction.channel?.send) {
              await interaction.channel.send(replyOpts).catch(() => {});
            }
          });
        }
      }
    }

    // 2. Handle Buttons (Profile & Gameplay Quick Links)
    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (customId.startsWith('begin_')) {
        return await handleBeginInteraction(interaction);
      }
      
      const globalButtonPrefixes = [
        'help_tab_',
        'owner_btn_',
        'btn_profile_',
        'btn_stats_',
        'btn_skills_',
        'btn_achievements_',
        'btn_ach_page_',
        'btn_skill_unlock_modal_',
        'btn_chapters_',
        'btn_play_chapter_',
        'btn_contracts_',
        'btn_franchise_',
        'btn_start_auction_',
        'btn_train_',
        'btn_equipment_',
        'tourn_quickmatch_',
        'tourn_start_quick_',
        'tourn_start_match_',
        'tourn_play_',
        'tourn_bracket_',
        'tourn_abandon_',
        'tourn_hub_',
        'tourn_select_',
        'sm_foot_',
        'sm_intent_',
        'sm_summary_',
        'sm_preset_',
        'sm_reset_',
        'sm_back_',
        'btn_set_'
      ];

      const isGlobalButton = globalButtonPrefixes.some(prefix => customId.startsWith(prefix));
      if (!isGlobalButton) {
        // Handled by command-level message component collectors
        return;
      }

      const userId = customId.split('_').pop();

      // Ensure only the owner of the profile or help menu can click these quick buttons
      if (interaction.user.id !== userId) {
        const isHelp = customId.startsWith('help_tab_');
        return interaction.reply({
          content: isHelp
            ? '❌ You cannot navigate this help menu. Run `/help` to open your own interactive guide!'
            : '❌ You cannot interact with this profile. Run the commands yourself to view your career!',
          flags: ['Ephemeral']
        });
      }

      try {
        if (customId.startsWith('owner_btn_home_')) {
          const screen = getDashboardHome(userId);
          return await interaction.update(screen);
        } else if (customId.startsWith('owner_btn_add_academy_')) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_academy`)
            .setTitle(`Add New Academy`);

          const idInput = new TextInputBuilder().setCustomId('acad_id').setLabel('Unique ID (e.g. elite_academy)').setStyle(TextInputStyle.Short).setRequired(true);
          const nameInput = new TextInputBuilder().setCustomId('acad_name').setLabel('Academy Name').setStyle(TextInputStyle.Short).setRequired(true);
          const specialtyInput = new TextInputBuilder().setCustomId('acad_specialty').setLabel('Specialty').setStyle(TextInputStyle.Short).setRequired(true);
          const coachInput = new TextInputBuilder().setCustomId('acad_coach').setLabel('Coach & Rating').setStyle(TextInputStyle.Short).setRequired(true);
          const bonusesInput = new TextInputBuilder().setCustomId('acad_bonuses').setLabel('Bonuses JSON (e.g. {"batting":1.08})').setStyle(TextInputStyle.Short).setRequired(true).setValue('{"batting":1.00}');

          modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(specialtyInput),
            new ActionRowBuilder().addComponents(coachInput),
            new ActionRowBuilder().addComponents(bonusesInput)
          );
          return await interaction.showModal(modal);
        } else if (customId.startsWith('owner_btn_add_sponsor_')) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_sponsor`)
            .setTitle(`Add New Sponsor`);

          const idInput = new TextInputBuilder().setCustomId('sp_id').setLabel('Unique ID (e.g. wood_works)').setStyle(TextInputStyle.Short).setRequired(true);
          const nameInput = new TextInputBuilder().setCustomId('sp_name').setLabel('Sponsor Name').setStyle(TextInputStyle.Short).setRequired(true);
          const descInput = new TextInputBuilder().setCustomId('sp_desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(true);
          const coinsRepInput = new TextInputBuilder().setCustomId('sp_coins_rep').setLabel('Coins Bonus & Rep Req (e.g. 500,100)').setStyle(TextInputStyle.Short).setRequired(true);
          const perkInput = new TextInputBuilder().setCustomId('sp_perk').setLabel('Perk ID,Name,Type (e.g. bat_1,My Bat,Bat)').setStyle(TextInputStyle.Short).setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(coinsRepInput),
            new ActionRowBuilder().addComponents(perkInput)
          );
          return await interaction.showModal(modal);
        } else if (customId.startsWith('owner_btn_add_item_')) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_add_item`)
            .setTitle(`Add Custom Shop Item`);

          const idInput = new TextInputBuilder().setCustomId('item_id').setLabel('Unique ID (e.g. golden_blade)').setStyle(TextInputStyle.Short).setRequired(true);
          const nameInput = new TextInputBuilder().setCustomId('item_name').setLabel('Item Name').setStyle(TextInputStyle.Short).setRequired(true);
          const typeInput = new TextInputBuilder().setCustomId('item_type').setLabel('Type (Bat, Grip, Gloves, Pads, Helmet, Shoes)').setStyle(TextInputStyle.Short).setRequired(true);
          const costRarityInput = new TextInputBuilder().setCustomId('item_cost_rarity').setLabel('Cost & Rarity (e.g. 1500,Epic)').setStyle(TextInputStyle.Short).setRequired(true);
          const bonusesInput = new TextInputBuilder().setCustomId('item_bonuses').setLabel('Bonuses JSON (e.g. {"power":10})').setStyle(TextInputStyle.Short).setRequired(true).setValue('{"power":5}');

          modal.addComponents(
            new ActionRowBuilder().addComponents(idInput),
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(typeInput),
            new ActionRowBuilder().addComponents(costRarityInput),
            new ActionRowBuilder().addComponents(bonusesInput)
          );
          return await interaction.showModal(modal);
        } else if (customId.startsWith('btn_profile_')) {
          return await handleProfile(interaction); // EXEMPT from cooldown
        } else if (customId.startsWith('btn_stats_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleStats(interaction);
        } else if (customId.startsWith('btn_achievements_') || customId.startsWith('btn_ach_page_')) {
          return await handleAchievements(interaction);
        } else if (customId.startsWith('btn_skills_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          // Mock subcommand options structure
          interaction.options = { getSubcommand: () => 'view' };
          return await handleSkills(interaction);
        } else if (customId.startsWith('btn_skill_unlock_modal_')) {
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_skill_unlock`)
            .setTitle(`Unlock Skill Node`);

          const keyInput = new TextInputBuilder()
            .setCustomId('skill_key')
            .setLabel('Skill Key Identifier')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g. power_hitting_1, yorker_specialist, etc.')
            .setRequired(true);

          modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
          return await interaction.showModal(modal);
        } else if (customId.startsWith('btn_chapters_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleChapters(interaction);
        } else if (customId.startsWith('btn_play_chapter_')) {
          // Mock option type = 'chapter'
          interaction.options = { getString: (name) => name === 'type' ? 'chapter' : null };
          return await handlePlay(interaction);
        } else if (customId.startsWith('btn_contracts_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleContracts(interaction);
        } else if (customId.startsWith('btn_franchise_register_')) {
          const leagueId = customId.split('_')[3];
          return await handleConfirmRegister(interaction, leagueId);
        } else if (customId.startsWith('btn_franchise_back_')) {
          return await handleFranchise(interaction);
        } else if (customId.startsWith('btn_start_auction_')) {
          const leagueId = customId.split('_')[3];
          return await handleRunAuction(interaction, leagueId);
        } else if (customId.startsWith('btn_franchise_dashboard_')) {
          return await handleFranchise(interaction);
        } else if (customId.startsWith('btn_franchise_playmatch_')) {
          return await handlePlayMatch(interaction);
        } else if (customId.startsWith('btn_franchise_abandon_')) {
          db.prepare("UPDATE player_franchise SET status = 'none', league_id = NULL, team_id = NULL WHERE player_id = ?").run(userId);
          return await handleFranchise(interaction);
        } else if (customId.startsWith('btn_franchise_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          return await handleFranchise(interaction);
        } else if (customId.startsWith('btn_train_')) {
          return await interaction.reply({
            content: '🏋️ To train your player, run the `/train` slash command and choose a training regime (batting, bowling, fitness, or fielding).',
            flags: ['Ephemeral']
          });
        } else if (customId.startsWith('btn_equipment_')) {
          if (!await enforceGraphicCooldown(interaction)) return;
          interaction.options = { getSubcommand: () => 'shop' };
          return await handleEquipment(interaction);
        } else if (customId.startsWith('tourn_quickmatch_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await startQuickMatch(interaction, player);
        } else if (customId.startsWith('tourn_start_quick_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await executeQuickMatch(interaction, player);
        } else if (customId.startsWith('tourn_play_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await playNextTournamentMatch(interaction, player);
        } else if (customId.startsWith('tourn_start_match_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await executeTournamentMatch(interaction, player);
        } else if (customId.startsWith('tourn_bracket_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await showTournamentBracket(interaction, player);
        } else if (customId.startsWith('tourn_abandon_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await handleAbandonTournament(interaction, player);
        } else if (customId.startsWith('tourn_hub_')) {
          return await handleTournament(interaction);
        } else if (customId.startsWith('tourn_select_')) {
          return await handleTournament(interaction);
        } else if (customId.startsWith('sm_foot_')) {
          const parts = customId.split('_');
          const footwork = parts[2] || 'Front Foot';
          const intent = parts[3] || 'Stroke';
          const zone = parts[4] || 'Cover';
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderShotMapEditor(interaction, player, footwork, intent, zone);
        } else if (customId.startsWith('sm_intent_')) {
          const parts = customId.split('_');
          const footwork = parts[2] || 'Front Foot';
          const intent = parts[3] || 'Stroke';
          const zone = intent === 'Leave' ? 'In Line' : (parts[4] || 'Cover');
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderShotMapEditor(interaction, player, footwork, intent, zone);
        } else if (customId.startsWith('sm_summary_')) {
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderPresetSummary(interaction, player, 1);
        } else if (customId.startsWith('sm_preset_')) {
          const parts = customId.split('_');
          const action = parts[2]; // prev, next, page
          const pageParam = parseInt(parts[3], 10) || 1;
          let targetPage = pageParam;
          if (action === 'prev') {
            targetPage = Math.max(1, pageParam - 1);
          } else if (action === 'next') {
            targetPage = Math.min(3, pageParam + 1);
          } else if (action === 'page') {
            targetPage = pageParam;
          }
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderPresetSummary(interaction, player, targetPage);
        } else if (customId.startsWith('sm_reset_')) {
          if (isPlayerInMatch(userId)) {
            return await interaction.reply({
              content: '🔒 **Shot Map Locked:** You are currently in an active match! Shot combinations and presets cannot be modified during a match. You can only view.',
              flags: ['Ephemeral']
            }).catch(() => {});
          }
          resetPlayerPreset(userId);
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderShotMapEditor(interaction, player, 'Front Foot', 'Stroke', 'Cover', '🔄 Shot Preset reset to default configuration!');
        } else if (customId.startsWith('sm_back_')) {
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderShotMapEditor(interaction, player, 'Front Foot', 'Stroke', 'Cover');
        } else if (customId.startsWith('help_tab_')) {
          const parts = customId.split('_');
          const tab = parts[2];
          return await handleHelpTabButton(interaction, tab, userId);
        } else if (customId.startsWith('btn_set_')) {
          const parts = customId.split('_');
          const settingAction = parts[2]; // display, radar, location, commentary, mention, reset
          const { togglePlayerSetting, resetPlayerSettings, buildSettingsMessage } = await import('../game/settings.js');
          
          if (settingAction === 'display') {
            togglePlayerSetting(userId, 'display_mode');
          } else if (settingAction === 'radar') {
            togglePlayerSetting(userId, 'field_radar');
          } else if (settingAction === 'location') {
            // Deprecated: matches always happen in DMs
          } else if (settingAction === 'commentary') {
            togglePlayerSetting(userId, 'commentary_level');
          } else if (settingAction === 'order') {
            togglePlayerSetting(userId, 'batting_order');
          } else if (settingAction === 'mention') {
            togglePlayerSetting(userId, 'mention_ping');
          } else if (settingAction === 'reset') {
            resetPlayerSettings(userId);
          }

          const player = db.prepare('SELECT name FROM players WHERE discord_id = ?').get(userId);
          const playerName = player ? player.name : interaction.user.username;
          const updatedView = buildSettingsMessage(userId, playerName);
          return await interaction.update(updatedView);
        }
      } catch (error) {
        console.error(`Error executing button interaction ${customId}:`, error);
      }
    }

    // 3. Handle Select Menus (Owner Dashboard & Career Wizard)
    if (interaction.isStringSelectMenu()) {
      const customId = interaction.customId;

      if (customId.startsWith('begin_')) {
        return await handleBeginInteraction(interaction);
      }

      let userId = null;
      
      if (customId.startsWith('owner_') || customId.startsWith('select_franchise_') || customId.startsWith('tourn_') || customId.startsWith('sm_')) {
        userId = customId.split('_').pop();
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ You do not own this dashboard.', flags: ['Ephemeral'] });
        }
      }

      try {
        if (customId.startsWith('owner_dash_main_')) {
          const value = interaction.values[0];
          if (value === 'dash_emojis') {
            const screen = await getEmojisPanel(userId);
            return await interaction.update(screen);
          } else if (value === 'dash_academies') {
            const screen = await getAcademiesPanel(userId);
            return await interaction.update(screen);
          } else if (value === 'dash_sponsors') {
            const screen = await getSponsorsPanel(userId);
            return await interaction.update(screen);
          } else if (value === 'dash_items') {
            const { getItemsPanel } = await import('../commands/admin.js');
            const screen = await getItemsPanel(userId);
            return await interaction.update(screen);
          }
        } else if (customId.startsWith('owner_select_emoji_')) {
          const key = interaction.values[0];
          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const { emojis } = await import('../game/emojis.js');

          const modal = new ModalBuilder()
            .setCustomId(`modal_edit_emoji:${key}`)
            .setTitle(`Edit ${key.replace('emoji_', '').toUpperCase()} Emoji`);

          const textInput = new TextInputBuilder()
            .setCustomId('new_emoji_val')
            .setLabel(`New value (Unicode or <:id:>)`)
            .setStyle(TextInputStyle.Short)
            .setValue(emojis[key.replace('emoji_', '')])
            .setRequired(true)
            .setMaxLength(60);

          const actionRow = new ActionRowBuilder().addComponents(textInput);
          modal.addComponents(actionRow);

          return await interaction.showModal(modal);
        } else if (customId.startsWith('owner_select_academy_edit_')) {
          const academyId = interaction.values[0].split(':')[1];
          const acad = db.prepare('SELECT * FROM academies WHERE id = ?').get(academyId);
          if (!acad) return interaction.reply({ content: '❌ Academy not found.', flags: ['Ephemeral'] });

          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_edit_academy:${academyId}`)
            .setTitle(`Edit Academy: ${acad.id}`);

          const nameInput = new TextInputBuilder().setCustomId('acad_name').setLabel('Academy Name').setStyle(TextInputStyle.Short).setValue(acad.name).setRequired(true);
          const specialtyInput = new TextInputBuilder().setCustomId('acad_specialty').setLabel('Specialty').setStyle(TextInputStyle.Short).setValue(acad.specialty).setRequired(true);
          const coachInput = new TextInputBuilder().setCustomId('acad_coach').setLabel('Coach & Rating').setStyle(TextInputStyle.Short).setValue(acad.coach_rating).setRequired(true);
          const historyInput = new TextInputBuilder().setCustomId('acad_history').setLabel('History Description').setStyle(TextInputStyle.Paragraph).setValue(acad.history).setRequired(true);
          const bonusesInput = new TextInputBuilder().setCustomId('acad_bonuses').setLabel('Bonuses JSON (e.g. {"batting":1.08})').setStyle(TextInputStyle.Short).setValue(acad.bonuses_json).setRequired(true);

          modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(specialtyInput),
            new ActionRowBuilder().addComponents(coachInput),
            new ActionRowBuilder().addComponents(historyInput),
            new ActionRowBuilder().addComponents(bonusesInput)
          );
          return await interaction.showModal(modal);
        } else if (customId.startsWith('owner_select_academy_delete_')) {
          const academyId = interaction.values[0].split(':')[1];
          db.prepare('DELETE FROM academies WHERE id = ?').run(academyId);
          loadAcademies();
          const screen = await getAcademiesPanel(userId);
          return await interaction.update(screen);
        } else if (customId.startsWith('owner_select_sponsor_edit_')) {
          const sponsorId = interaction.values[0].split(':')[1];
          const sp = db.prepare('SELECT * FROM sponsors WHERE id = ?').get(sponsorId);
          if (!sp) return interaction.reply({ content: '❌ Sponsor not found.', flags: ['Ephemeral'] });

          const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');
          const modal = new ModalBuilder()
            .setCustomId(`modal_edit_sponsor:${sponsorId}`)
            .setTitle(`Edit Sponsor: ${sp.id}`);

          const nameInput = new TextInputBuilder().setCustomId('sp_name').setLabel('Sponsor Name').setStyle(TextInputStyle.Short).setValue(sp.name).setRequired(true);
          const descInput = new TextInputBuilder().setCustomId('sp_desc').setLabel('Description').setStyle(TextInputStyle.Paragraph).setValue(sp.description).setRequired(true);
          const coinsRepInput = new TextInputBuilder().setCustomId('sp_coins_rep').setLabel('Coins Bonus & Rep Req (e.g. 500,100)').setStyle(TextInputStyle.Short).setValue(`${sp.bonus_coins},${sp.reputation_required}`).setRequired(true);
          const perkInput = new TextInputBuilder().setCustomId('sp_perk').setLabel('Perk ID,Name,Type (e.g. bat_1,My Bat,Bat)').setStyle(TextInputStyle.Short).setValue(`${sp.perk_item_id || ''},${sp.perk_item_name || ''},${sp.perk_item_type || ''}`).setRequired(false);
          const perkBonusesInput = new TextInputBuilder().setCustomId('sp_perk_bonuses').setLabel('Gear Bonuses JSON (e.g. {"power":5})').setStyle(TextInputStyle.Short).setValue(sp.perk_item_bonuses_json || '{}').setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(coinsRepInput),
            new ActionRowBuilder().addComponents(perkInput),
            new ActionRowBuilder().addComponents(perkBonusesInput)
          );
          return await interaction.showModal(modal);
        } else if (customId.startsWith('owner_select_sponsor_delete_')) {
          const sponsorId = interaction.values[0].split(':')[1];
          db.prepare('DELETE FROM sponsors WHERE id = ?').run(sponsorId);
          const screen = await getSponsorsPanel(userId);
          return await interaction.update(screen);
        } else if (customId.startsWith('owner_select_item_delete_')) {
          const itemId = interaction.values[0].split(':')[1];
          db.prepare('DELETE FROM custom_items WHERE id = ?').run(itemId);
          const { loadCustomItems } = await import('../game/equipment.js');
          loadCustomItems();
          const { getItemsPanel } = await import('../commands/admin.js');
          const screen = await getItemsPanel(userId);
          return await interaction.update(screen);
        } else if (customId.startsWith('select_franchise_league_')) {
          const leagueId = interaction.values[0];
          return await handleLeagueDetail(interaction, leagueId);
        } else if (customId.startsWith('tourn_select_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const tournamentId = interaction.values[0];
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await handleTournamentDetails(interaction, player, tournamentId);
        } else if (customId.startsWith('tourn_pickteam_')) {
          if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(() => {});
          const parts = customId.split('_');
          const tournamentId = parts.slice(2, parts.length - 1).join('_');
          const teamName = interaction.values[0];
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await handlePickTeam(interaction, player, tournamentId, teamName);
        } else if (customId.startsWith('sm_zone_')) {
          const parts = customId.split('_');
          const footwork = parts[2] || 'Front Foot';
          const intent = parts[3] || 'Stroke';
          const zone = interaction.values[0] || 'Cover';
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          return await renderShotMapEditor(interaction, player, footwork, intent, zone);
        } else if (customId.startsWith('sm_equip_')) {
          if (isPlayerInMatch(userId)) {
            return await interaction.reply({
              content: '🔒 **Shot Map Locked:** You are currently in an active match! Shot combinations and presets cannot be modified during a match. You can only view.',
              flags: ['Ephemeral']
            }).catch(() => {});
          }
          const parts = customId.split('_');
          const footwork = parts[2] || 'Front Foot';
          const intent = parts[3] || 'Stroke';
          const zone = intent === 'Leave' ? 'In Line' : (parts[4] || 'Cover');
          const shotId = interaction.values[0];
          setPlayerEquippedShot(userId, footwork, intent, zone, shotId);
          const shot = getShotById(shotId);
          const player = db.prepare('SELECT * FROM players WHERE discord_id = ?').get(userId);
          const label = intent === 'Leave' ? `[${footwork} + Leave]` : `[${footwork} + ${intent} + ${zone}]`;
          return await renderShotMapEditor(
            interaction,
            player,
            footwork,
            intent,
            zone,
            `✅ Successfully equipped **${shot.num} ${shot.name}** for **${label}**!`
          );
        }
      } catch (error) {
        console.error('Error handling select menu:', error);
      }
    }

    // 4. Handle Modals (Owner Dashboard & Career Wizard)
    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith('modal_begin_')) {
        return await handleBeginInteraction(interaction);
      }

      if (customId.startsWith('modal_edit_emoji:')) {
        try {
          const key = customId.split(':')[1];
          const newValue = interaction.fields.getTextInputValue('new_emoji_val');

          const { updateEmojiInDb } = await import('../game/emojis.js');
          updateEmojiInDb(key, newValue);

          return await interaction.reply({
            content: `✅ Successfully updated config for **${key}** to **${newValue}**! Emojis have been reloaded bot-wide.`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error saving owner config modal:', error);
        }
      } else if (customId.startsWith('modal_add_academy')) {
        try {
          const id = interaction.fields.getTextInputValue('acad_id').trim().toLowerCase();
          const name = interaction.fields.getTextInputValue('acad_name').trim();
          const specialty = interaction.fields.getTextInputValue('acad_specialty').trim();
          const coach = interaction.fields.getTextInputValue('acad_coach').trim();
          const bonuses = interaction.fields.getTextInputValue('acad_bonuses').trim();

          db.prepare(`
            INSERT INTO academies (id, name, rating, reputation, history, specialty, coach_rating, training_bonus_text, bonuses_json, graduates_domestic, graduates_international, success_rate)
            VALUES (?, ?, 3, 'Local', 'Custom-built academy added via Admin Config Dashboard.', ?, ?, '+0% Base', ?, 5, 0, '50%')
          `).run(id, name, specialty, coach, bonuses);

          loadAcademies();

          return await interaction.reply({
            content: `✅ Successfully added academy **${name}**! Check the Academies Management panel to view it.`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error adding academy:', error);
          return await interaction.reply({ content: `❌ Error creating academy: ${error.message}`, flags: ['Ephemeral'] });
        }
      } else if (customId.startsWith('modal_edit_academy:')) {
        try {
          const academyId = customId.split(':')[1];
          const name = interaction.fields.getTextInputValue('acad_name').trim();
          const specialty = interaction.fields.getTextInputValue('acad_specialty').trim();
          const coach = interaction.fields.getTextInputValue('acad_coach').trim();
          const history = interaction.fields.getTextInputValue('acad_history').trim();
          const bonuses = interaction.fields.getTextInputValue('acad_bonuses').trim();

          db.prepare(`
            UPDATE academies
            SET name = ?, specialty = ?, coach_rating = ?, history = ?, bonuses_json = ?
            WHERE id = ?
          `).run(name, specialty, coach, history, bonuses, academyId);

          loadAcademies();

          return await interaction.reply({
            content: `✅ Successfully updated academy **${name}**!`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error editing academy:', error);
          return await interaction.reply({ content: `❌ Error updating academy: ${error.message}`, flags: ['Ephemeral'] });
        }
      } else if (customId.startsWith('modal_add_sponsor')) {
        try {
          const id = interaction.fields.getTextInputValue('sp_id').trim().toLowerCase();
          const name = interaction.fields.getTextInputValue('sp_name').trim();
          const desc = interaction.fields.getTextInputValue('sp_desc').trim();
          const coinsRep = interaction.fields.getTextInputValue('sp_coins_rep').trim();
          const perk = interaction.fields.getTextInputValue('sp_perk').trim();

          const [coins, rep] = coinsRep.split(',').map(s => parseInt(s.trim(), 10) || 0);
          
          let perkId = null, perkName = null, perkType = null;
          if (perk) {
            const parts = perk.split(',').map(s => s.trim());
            perkId = parts[0] || null;
            perkName = parts[1] || null;
            perkType = parts[2] || null;
          }

          db.prepare(`
            INSERT INTO sponsors (id, name, description, bonus_coins, reputation_required, perk_item_id, perk_item_name, perk_item_type, perk_item_bonuses_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}')
          `).run(id, name, desc, coins, rep, perkId, perkName, perkType);

          return await interaction.reply({
            content: `✅ Successfully created sponsor **${name}**! Check the Sponsors panel to view it.`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error adding sponsor:', error);
          return await interaction.reply({ content: `❌ Error creating sponsor: ${error.message}`, flags: ['Ephemeral'] });
        }
      } else if (customId.startsWith('modal_edit_sponsor:')) {
        try {
          const sponsorId = customId.split(':')[1];
          const name = interaction.fields.getTextInputValue('sp_name').trim();
          const desc = interaction.fields.getTextInputValue('sp_desc').trim();
          const coinsRep = interaction.fields.getTextInputValue('sp_coins_rep').trim();
          const perk = interaction.fields.getTextInputValue('sp_perk').trim();
          const perkBonuses = interaction.fields.getTextInputValue('sp_perk_bonuses').trim();

          const [coins, rep] = coinsRep.split(',').map(s => parseInt(s.trim(), 10) || 0);
          
          let perkId = null, perkName = null, perkType = null;
          if (perk) {
            const parts = perk.split(',').map(s => s.trim());
            perkId = parts[0] || null;
            perkName = parts[1] || null;
            perkType = parts[2] || null;
          }

          db.prepare(`
            UPDATE sponsors
            SET name = ?, description = ?, bonus_coins = ?, reputation_required = ?, perk_item_id = ?, perk_item_name = ?, perk_item_type = ?, perk_item_bonuses_json = ?
            WHERE id = ?
          `).run(name, desc, coins, rep, perkId, perkName, perkType, perkBonuses, sponsorId);

          return await interaction.reply({
            content: `✅ Successfully updated sponsor **${name}**!`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error editing sponsor:', error);
          return await interaction.reply({ content: `❌ Error updating sponsor: ${error.message}`, flags: ['Ephemeral'] });
        }
      } else if (customId.startsWith('modal_add_item')) {
        try {
          const id = interaction.fields.getTextInputValue('item_id').trim().toLowerCase();
          const name = interaction.fields.getTextInputValue('item_name').trim();
          const type = interaction.fields.getTextInputValue('item_type').trim();
          const costRarity = interaction.fields.getTextInputValue('item_cost_rarity').trim();
          const bonuses = interaction.fields.getTextInputValue('item_bonuses').trim();

          const [costStr, rarity] = costRarity.split(',').map(s => s.trim());
          const cost = parseInt(costStr, 10) || 0;

          db.prepare(`
            INSERT INTO custom_items (id, name, type, rarity, cost, bonuses_json)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(id, name, type, rarity, cost, bonuses);

          const { loadCustomItems } = await import('../game/equipment.js');
          loadCustomItems();

          return await interaction.reply({
            content: `✅ Successfully created custom item **${name}**! Check the Shop Items panel or \`/equipment shop\` to view it.`,
            flags: ['Ephemeral']
          });
        } catch (error) {
          console.error('Error adding custom item:', error);
          return await interaction.reply({ content: `❌ Error creating custom item: ${error.message}`, flags: ['Ephemeral'] });
        }
      } else if (customId === 'modal_skill_unlock') {
        try {
          const skillKey = interaction.fields.getTextInputValue('skill_key').trim().toLowerCase();
          interaction.options = {
            getSubcommand: () => 'unlock',
            getString: (name) => name === 'skill_key' ? skillKey : null
          };
          return await handleSkills(interaction);
        } catch (error) {
          console.error('Error in modal_skill_unlock:', error);
          return await interaction.reply({ content: `❌ Error unlocking skill: ${error.message}`, flags: ['Ephemeral'] });
        }
      }
    }
  } catch (globalError) {
    console.error('Unhandled error in interactionCreate event:', globalError);
  }
}
};
