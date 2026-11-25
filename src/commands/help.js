import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { emojis } from '../game/emojis.js';

/**
 * Builds interactive button rows with the active tab highlighted
 */
export function getHelpButtons(activeTab, discordId) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_tab_starter_${discordId}`)
      .setLabel('📖 Starter Guide')
      .setStyle(activeTab === 'starter' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help_tab_modes_${discordId}`)
      .setLabel('🏆 Game Modes')
      .setStyle(activeTab === 'modes' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help_tab_cmds_${discordId}`)
      .setLabel('📋 Commands')
      .setStyle(activeTab === 'cmds' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`help_tab_matches_${discordId}`)
      .setLabel('🎮 Batting & Gameplay')
      .setStyle(activeTab === 'matches' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help_tab_teams_${discordId}`)
      .setLabel('💼 Teams & Sponsors')
      .setStyle(activeTab === 'teams' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`help_tab_strat_${discordId}`)
      .setLabel('💡 Strategy')
      .setStyle(activeTab === 'strat' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Builds the embed and component rows for a given help tab
 */
export function getHelpTabPayload(requestedTab, discordId) {

  // 1. Starter Guide Panel
  const starterEmbed = new EmbedBuilder()
    .setTitle('📖 Cricket Career Starter Guide')
    .setDescription('Welcome to **Cricket Ascend**! Here is your step-by-step roadmap from rookie to global superstar:')
    .setColor('#ff9f43')
    .addFields(
      {
        name: '👤 Step 1: Create Your Career Player',
        value: `Run \`/begin\` to customize your name, batting hand, bowling style, role (Batsman, Wicket-Keeper, Bowler, All-Rounder), and nationality (25 nations available).`
      },
      {
        name: '⚡ Step 2: Start in Tournament Mode',
        value: `Jump straight into \`/tournament hub\` or \`/tournament quickmatch\`! As a rookie (Level 1), play friendly **Quick Matches** against computer teams to grind XP with zero coin risk and level up rapidly.`
      },
      {
        name: '🎯 Step 3: Customize Your Batting Shot Map',
        value: `Head into \`/shotmap hub\` to customize your personal batting preset! Across **72 combinations** (Footwork × Intent × Zone), choose from **328+ authentic shots** to play exactly how you want.`
      },
      {
        name: '🏋️ Step 4: Training & Super Skills',
        value: `Spend training tickets (${emojis.token}) and energy (${emojis.energy}) with \`/train\` to raise attributes like Power, Timing, and Control. Spend Skill Points (${emojis.sp}) in \`/skills view\` to unlock powerful game-changing perks.`
      },
      {
        name: '💼 Step 5: Club Contracts & Brand Sponsors',
        value: `Reach Level 4+ to request drafts in \`/contracts\` and receive guaranteed per-match salaries. Attract big brand sponsors with \`/sponsors\` for instant coin bonuses and exclusive gear!`
      },
      {
        name: '🛒 Step 6: Equipment & Franchise Leagues',
        value: `Equip elite gear from the shop (\`/equipment shop\`) into your bag (\`/inventory\`). Then register for the Mega Auction in \`/franchise\` to compete in world-class T20 leagues!`
      }
    )
    .setFooter({ text: 'Cricket Ascend Help Center • Use buttons below to explore all guides!' })
    .setTimestamp();

  // 2. Game Modes Guide Panel (NEW!)
  const modesEmbed = new EmbedBuilder()
    .setTitle('🏆 Game Modes Guide')
    .setDescription('Cricket Ascend offers **5 distinct game modes** designed for solo progression, championships, and competitive PvP:')
    .setColor('#f39c12')
    .addFields(
      {
        name: '🏆 1. Tournament Mode (Vs Computer AI)',
        value: `• **Command:** \`/tournament hub\` | \`/tournament quickmatch\`\n` +
              `• **Format:** Single-player offline championship against computer AI.\n` +
              `• **Level 1 (Rookie):** Play **Quick Exhibition Matches** (2 overs) against computer clubs to grind XP and level up.\n` +
              `• **Level 2 - 8 (Championships):** Unlock **6 real-world tournaments** (National T20 Blast, Premier T20 Cup, Super Smash, Big Bash, Champions Trophy, World T20 Championship)!\n` +
              `• **Knockout Bracket:** Lead your chosen team through Quarter-Finals, Semi-Finals, and Grand Finals to claim massive XP, Coins, and official trophies for your trophy cabinet!`
      },
      {
        name: '🏏 2. T20 Franchise League (Mega Auction & Season)',
        value: `• **Command:** \`/franchise\` | \`/playmatch\`\n` +
              `• **Format:** Enter the player **Mega Auction** across top global circuits (IPL, BBL, PSL, CPL, The Hundred).\n` +
              `• Watch computer AI franchises place live bids for your contract.\n` +
              `• Play scheduled league match days (\`/playmatch\`), earn match salaries, and battle through playoffs for the championship ring!`
      },
      {
        name: '📜 3. Career Campaign Chapters (Story Mode)',
        value: `• **Command:** \`/chapters\` | \`/play type:chapter\`\n` +
              `• **Format:** 50 curated story chapters tracing your ascent from regional grounds to international cricket.\n` +
              `• Complete target chases, defend totals in clutch overs, and unlock major career milestones.`
      },
      {
        name: '⚔️ 4. PvP Challenge Mode (1-Over Shootouts)',
        value: `• **Command:** \`/challenge duel <user> [target]\`\n` +
              `• **Format:** Intense 1-over (6 balls) shootout duels against any Discord server member.\n` +
              `• Features real-time field radar visuals, wagered target chases, and global PvP leaderboards (\`/challenge leaderboard\`).`
      },
      {
        name: '🎯 5. Practice Nets (Casual Practice)',
        value: `• **Command:** \`/play type:practice\`\n` +
              `• **Format:** Casual training matches to test out your equipped shot map presets, batting timing windows, and new gear with no penalties.`
      }
    )
    .setFooter({ text: 'Cricket Ascend Game Modes • Choose your preferred way to play!' })
    .setTimestamp();

  // 3. Command Directory Panel
  const commandsEmbed = new EmbedBuilder()
    .setTitle('📋 Complete Command Directory')
    .setDescription('Here is the full directory of all **29 slash commands** and subcommands:')
    .setColor('#1abc9c')
    .addFields(
      {
        name: '👤 Player Profile & Career Bio',
        value: `• \`/begin\` - Create your player profile and choose your nation.\n` +
              `• \`/profile [user]\` - View player card, level, XP, coins, energy, form, and trophies.\n` +
              `• \`/balance [user]\` (or \`/bal\`) - View your coin wallet, training tickets, skill points, and match stipend.\n` +
              `• \`/achievements [user]\` - View career achievements, milestones, and coin rewards.\n` +
              `• \`/attributes\` - Detailed view of core attributes and gear stat boosts.\n` +
              `• \`/stats\` - Lifetime career batting, bowling, and fielding averages.\n` +
              `• \`/history\` - View your 10 most recent match scorecards.\n` +
              `• \`/retire\` - Permanently retire your player to start a brand new career.`
      },
      {
        name: '🏆 Tournament & Shot Map Modes',
        value: `• \`/tournament hub\` - Open the Tournament Arena and exhibition directory.\n` +
              `• \`/tournament quickmatch\` - Play a fast exhibition match vs computer for XP.\n` +
              `• \`/tournament play\` - Play your active tournament knockout round match.\n` +
              `• \`/tournament bracket\` - View current tournament knockout bracket.\n` +
              `• \`/tournament abandon\` - Abandon your active tournament run.\n` +
              `• \`/shotmap hub\` - Interactive Batting Shot Map & Preset Editor.\n` +
              `• \`/shotmap preset\` - Overview of your active equipped shots across zones.\n` +
              `• \`/shotmap reset\` - Reset your shot map to balanced default setup.`
      },
      {
        name: '🏏 Franchise, Campaign & PvP Modes',
        value: `• \`/franchise\` - Access T20 franchise league dashboard, auction, and roster.\n` +
              `• \`/playmatch\` - Play your active scheduled franchise league match day.\n` +
              `• \`/chapters\` - View all 50 career campaign chapters and requirements.\n` +
              `• \`/play [type]\` - Play a campaign Chapter or casual Practice Nets match.\n` +
              `• \`/challenge duel\` - Challenge another Discord player to a 1-over shootout.\n` +
              `• \`/challenge stats\` - View Challenge Mode stats and head-to-head record.\n` +
              `• \`/challenge leaderboard\` - View global Challenge Mode PvP rankings.`
      },
      {
        name: '🏋️ Training, Skills & Academies',
        value: `• \`/train [regime]\` - Practice batting, bowling, fitness, or fielding drills.\n` +
              `• \`/skills view\` - View your skill tree and current Skill Points balance.\n` +
              `• \`/skills unlock [key]\` - Unlock passive skill perks using Skill Points.\n` +
              `• \`/academy\` - View your current training academy bonuses or transfer schools.`
      },
      {
        name: '💼 Contracts, Economy & Gear',
        value: `• \`/contracts\` - Request professional club drafts and review match salaries.\n` +
              `• \`/sponsors\` - Review brand endorsements, sign-on bonuses, and free perks.\n` +
              `• \`/season\` - Check league division standing, reputation, and national call-ups.\n` +
              `• \`/equipment shop\` - Browse bats, shoes, grips, gloves, and pads for sale.\n` +
              `• \`/equipment buy [item_id]\` - Purchase equipment from the shop with coins.\n` +
              `• \`/inventory\` - Manage your bag and equip items to boost attributes.\n` +
              `• \`/leaderboard [type]\` - View global leaderboards (Level, Runs, Wickets, Coins).\n` +
              `• \`/settings\` - Configure personal preferences (Graphics vs Embeds, Radar, DMs, etc.).\n` +
              `• \`/achievements [user]\` - View your career milestones, badges, and coin rewards.\n` +
              `• \`/invite\` - Get the official invite link to add Cricket Ascend to your servers.\n` +
              `• \`/help [topic]\` - Open this interactive help center and guide.`
      }
    )
    .setFooter({ text: 'Cricket Ascend Commands • Type / followed by command name in Discord!' })
    .setTimestamp();

  // 4. Batting & Gameplay Mechanics Panel
  const matchesEmbed = new EmbedBuilder()
    .setTitle('🎮 Batting & Gameplay Mechanics')
    .setDescription('Understand the advanced cricket physics and decision-making in Cricket Ascend:')
    .setColor('#9b59b6')
    .addFields(
      {
        name: '🏏 The 4-Step Batting Engine',
        value: `Every ball faced requires tactical decision-making:\n` +
              `• **1. Footwork:** Commit to **Front Foot** (full balls), **Back Foot** (short balls), **Advanced** (charge spinners), or **Leave**.\n` +
              `• **2. Intent:** Select **Push** (soft hands defense / single), **Stroke** (ground drives / cuts), **Loft** (aerial maximums), or **Leave** (shoulder arms).\n` +
              `• **3. Target Zone:** Aim at any of the **8 scoring zones** (Cover, Point, Mid Wicket, Long Off, Long On, Third Man, Square Leg, Fine Leg).\n` +
              `• **4. HIT SHOT:** Confirm your shot! Your equipped preset shot will execute with dynamic timing calculations.`
      },
      {
        name: '🛡️ Shouldering Arms & Leaving Deliveries',
        value: `• You can commit to a **Leave** either directly in Footwork or during Intent selection!\n` +
              `• **Zone selection is completely bypassed** on leaves since the ball is let through to the keeper.\n` +
              `• Supports all leave variations: **Front Foot Leave** (clean shoulder arms outside off), **Back Foot Leave** (ducking bouncers or stepping back), and **Advanced Leave** (reading spin drift).\n` +
              `• *Be careful:* Leaving balls heading straight at your stumps will result in Bowled or LBW dismissals!`
      },
      {
        name: '🎯 Batting Shot Map & Presets (/shotmap)',
        value: `• Customize your style across all **72 combinations** with **328+ authentic shots**!\n` +
              `• Want an *Inside-Out Drive* instead of a *Classic Cover Drive*? Or an *Upper Cut* instead of a *Back Foot Defense*?\n` +
              `• Equip any shot in your preset. Each shot features custom **timing modifiers**, **risk levels**, and unique **commentary text**.`
      },
      {
        name: '🥎 16+ Bowler Delivery Variations & Release Cues',
        value: `Inspect the bowler's grip and release cues before each ball:\n` +
              `• **Pace:** Out-swinger, In-swinger, Reverse Swing, Cross-Seam, Off-Cutter, Leg-Cutter, Knuckleball, Back-of-the-Hand Slower, Sharp Bouncer, Toe-Crushing Yorker.\n` +
              `• **Spin:** Leg-Break, Googly, Top-Spinner, Flipper, Slider, Classic Off-Break, Doosra, Arm Ball.\n` +
              `• *Pro Tip:* Look at wrist angle and seam position in the match alert to identify googlies and slower balls early!`
      },
      {
        name: '📈 6 Dynamic Pitch Conditions',
        value: `• **Flat Belter:** Road deck with true bounce. Highest scoring, lowest seam/spin risk.\n` +
              `• **Balanced Sporting:** Even battle between bat and ball with steady carry.\n` +
              `• **Green Seamer:** Heavy seam movement and swing. Rewards patient ground strokes.\n` +
              `• **Dry Turning Track:** Aggressive spin and dust puffs. Neutralize with sweeps & footwork.\n` +
              `• **Bouncy Clay Deck:** Steep vertical lift. Feast on back-foot cuts, pulls, and upper cuts.\n` +
              `• **Damp Slow Track:** Sluggish two-paced deck where slower balls grip. Wait for the ball!`
      }
    )
    .setFooter({ text: 'Cricket Ascend Gameplay • Master the 6 pitch surfaces and delivery cues!' })
    .setTimestamp();

  // 5. Teams & Sponsors Panel
  const teamsEmbed = new EmbedBuilder()
    .setTitle('💼 Academies, Contracts & Sponsors')
    .setDescription('Turn your raw talent into a lucrative professional cricket career:')
    .setColor('#f1c40f')
    .addFields(
      {
        name: '🎓 Cricket Academies (/academy)',
        value: `• Your starting training ground! Academies grant permanent percentage multipliers to your training gains (e.g. +8% Batting XP).\n` +
              `• Switch academies anytime for a nominal 200 ${emojis.coin} fee.`
      },
      {
        name: '💼 Club Contracts & Salaries (/contracts)',
        value: `• Unlocks at **Level 4**. Request draft offers from domestic clubs.\n` +
              `• Clubs bid for your signature and pay a **guaranteed coin salary per match** played, whether you win or lose!`
      },
      {
        name: '👟 Brand Endorsement Deals (/sponsors)',
        value: `• As your Reputation (${emojis.reputation}) grows, premier brands offer sponsorship contracts.\n` +
              `• Signing grants an instant lump-sum coin payout and free custom gear delivered straight to your \`/inventory\`.`
      },
      {
        name: '🔋 Energy Battery & Recovery',
        value: `• Max energy: 100 (${emojis.energy}). Playing matches and training consumes energy.\n` +
              `• Energy regenerates automatically over time in the background even when offline!`
      }
    )
    .setFooter({ text: 'Cricket Ascend Economy • Build your financial empire!' })
    .setTimestamp();

  // 6. Pro Strategy Panel
  const strategyEmbed = new EmbedBuilder()
    .setTitle('💡 Cricket Ascend Master Strategy Guide')
    .setDescription('Elevate your cricket IQ with proven tactics for shot selection, gap placement, pitch reading, and match awareness:')
    .setColor('#e74c3c')
    .addFields(
      {
        name: '🏏 1. The 4-Step Batting Engine (Footwork × Intent × Zone × Hit)',
        value: `• **Footwork:** Commit to **Front Foot** for full/yorker balls, **Back Foot** for short/bouncers, **Advanced** to charge flighted spinners, or **Leave** to let wide outswingers pass cleanly with 0% edge risk.\n` +
              `• **Intent:** Select **Push** (soft hands single/defense), **Stroke** (ground drives & pulls with zero catch risk), or **Loft** (aerial power hitting over fielders).\n` +
              `• **Zone:** Target open pockets on the field (Cover, Point, Mid Wicket, Long Off, Long On, Third Man, Square Leg, Fine Leg).\n` +
              `• **HIT SHOT:** Confirm your choices to execute your preset shot with timing calculation!`
      },
      {
        name: '🗺️ 2. Field Radar & Gap Placement',
        value: `• Check the field placement visual before every delivery!\n` +
              `• **Target Empty Zones:** Directing your shot into zones with **no fielders** ensures safe boundaries and singles.\n` +
              `• **Avoid Heavy Traffic:** Hitting into zones guarded by deep fielders or inner rings triggers high-risk catches and dot balls.\n` +
              `• **Death Overs Chasing:** When fielders are brought inside the circle, loft over infielders into the vacant deep zones.`
      },
      {
        name: '🎯 3. Shot Map Preset Optimization (/shotmap hub)',
        value: `• Across **72 combinations** (Footwork × Intent × Zone), choose your preferred shot from **328+ authentic strokes**!\n` +
              `• **Power Zones:** Assign high-multiplier shots (e.g. *Inside-Out Drive*, *Helicopter Shot*, *Upper Cut*, *Ramp Shot*) to your primary scoring areas.\n` +
              `• **Safety Presets:** Equip reliable, high-control shots (e.g. *Forward Defense*, *Back Foot Punch*) for defensive combinations to weather hostile spells.`
      },
      {
        name: '⚡ 4. Countering Delivery Lengths & Bowler Archetypes',
        value: `• **Yorker:** *Front Foot + Push* (block safely) or *Front Foot + Stroke* (drive into ground). Never loft (bowled risk!).\n` +
              `• **Bouncers:** *Back Foot + Stroke / Loft* (Pull shot or Upper Cut). Never play front-foot drives (top edge risk!).\n` +
              `• **Spin Drift & Googlies:** Use *Advanced* footwork to smother turn or play *Sweep / Reverse Sweep* to neutralize spin.\n` +
              `• **Seam & Swing:** Play along the turf with *Stroke* through the V (Long Off, Long On, Covers) rather than flashing outside off.`
      },
      {
        name: '📈 5. Pitch Conditions & Vitals Management',
        value: `• **Flat Belter:** Unleash aerial lofts and aggressive drives with minimal swing/spin penalty.\n` +
              `• **Balanced Sporting:** Play each ball on merit; test timing before taking aerial risks.\n` +
              `• **Green Seamer:** Significant seam & swing. Play with soft hands along the turf through the V.\n` +
              `• **Dry Turning Track:** Sharp spin & dust. Use *Advanced* footwork to smother turn or sweep.\n` +
              `• **Bouncy Clay Deck:** Steep vertical lift. Cut, pull, and upper cut; avoid front-foot cross-bat shots.\n` +
              `• **Damp Slow Track:** Sluggish two-paced bounce. Wait for cutters and slower balls; avoid early lofts.\n` +
              `• **Confidence & Form:** High confidence widens your sweet-spot timing window. Start with safe ground strokes before launching aerial lofts!`
      }
    )
    .setFooter({ text: 'Cricket Ascend Strategy • Think like a champion, execute like a legend!' })
    .setTimestamp();

  // Determine active tab and embed
  let activeTab = 'starter';
  let activeEmbed = starterEmbed;

  if (requestedTab) {
    const t = requestedTab.toLowerCase().trim();
    if (t === 'modes' || t === 'tournament' || t === 'tournaments' || t === 'franchise') {
      activeTab = 'modes';
      activeEmbed = modesEmbed;
    } else if (t === 'commands' || t === 'cmds' || t === 'cmd') {
      activeTab = 'cmds';
      activeEmbed = commandsEmbed;
    } else if (t === 'gameplay' || t === 'matches' || t === 'batting') {
      activeTab = 'matches';
      activeEmbed = matchesEmbed;
    } else if (t === 'teams' || t === 'sponsors' || t === 'contracts') {
      activeTab = 'teams';
      activeEmbed = teamsEmbed;
    } else if (t === 'strategy' || t === 'strat') {
      activeTab = 'strat';
      activeEmbed = strategyEmbed;
    }
  }

  const components = getHelpButtons(activeTab, discordId);
  return { embed: activeEmbed, components, activeTab };
}

/**
 * Handles global button interactions for the help menu.
 * Edits the original embed message in place without creating new messages.
 */
export async function handleHelpTabButton(interaction, tab, userId) {
  const { embed, components } = getHelpTabPayload(tab, userId);

  if (interaction.deferred || interaction.replied) {
    return await interaction.editReply({
      embeds: [embed],
      components: components
    }).catch(err => console.error('Error in handleHelpTabButton editReply:', err));
  } else {
    return await interaction.update({
      embeds: [embed],
      components: components
    }).catch(err => console.error('Error in handleHelpTabButton update:', err));
  }
}

/**
 * Handles the /help [topic] slash command.
 */
export async function handleHelp(interaction, initialTopic = null) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply().catch(() => {});
  }
  const discordId = interaction.user.id;

  const { embed, components } = getHelpTabPayload(initialTopic || 'starter', discordId);

  return await interaction.editReply({
    embeds: [embed],
    components: components
  }).catch(err => console.error('Error in handleHelp editReply:', err));
}


