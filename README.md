# 🏏 Virtual CM (Virtual Career Mode)

A completely standalone Discord bot career simulator for Cricket built using **discord.js v14** and **SQLite** (`better-sqlite3`).

Every player starts from humble beginnings in a junior training academy, progressing through local club cricket, district selectors, state matches, domestic T20 franchise drafts, and finally securing international team selection to win the Cricket World Cup.

---

## 🚀 Features

1. **Relational Database Design**: SQLite database holds structural tables for players, base attributes, equipment inventory, active skills, contracts, lifetime statistics, and detailed match histories.
2. **Interactive Batting & Bowling Engines**:
   - **Batsmen**: Choose from **13 different shot types** (Straight Drive, Pull, Sweep, Slog, etc.) against **21 delivery variations** (Yorker, Out-swinger, Googly, etc.). Delivery-to-shot matchups are calculated using a hidden percentage-based matrix.
   - **Bowlers**: Select the exact type of delivery to bowl based on your bowling style (spin or fast) to outsmart the AI batsman's shot selections.
   - **All-Rounders**: Complete matches playing both innings (a batting chase followed by a bowling defense spell).
3. **Timing Meter**: Calculates timing window (`Perfect`, `Great`, `Good`, `Early`, `Late`, `Very Late`, `Mistimed`) using player attributes (Timing, Technique), equipment buffs, and current confidence.
4. **Dynamic Story Events**: Random post-match occurrences (media critique, injury scares, sponsor offers, coach cabin disputes) with multi-choice options that alter stats.
5. **Skill Tree**: Spend Skill Points earned from leveling up to unlock specialization nodes (Power Hitter, Yorker King, Clutch Finisher, Captaincy IQ) that grant boosts in simulation math.
6. **Stateless Vitals & Energy**: Uses date-time offsets in SQLite to calculate recovered energy passively (+5 per hour, cap 100) without background loops or task scripts that can crash.
7. **Equipment Store**: Earn coins to buy bats, grips, gloves, pads, helmets, and shoes, with unique stats and rarities (Common to Legendary).

---

## 📂 Project Structure

```
virtual-cm/
├── C:UsersAdminvirtual-cm/
│   ├── src/
│   │   ├── database/
│   │   │   └── db.js               # SQLite Connection & Schemas
│   │   ├── game/
│   │   │   ├── academies.js        # Academy Bonuses & Info
│   │   │   ├── chapters.js         # Career Levels & Objectives
│   │   │   ├── equipment.js        # Gear Shop & Item Catalog
│   │   │   ├── skills.js           # Skill Tree Nodes & Buffs
│   │   │   ├── achievements.js     # Career Milestones & Coin Rewards
│   │   │   ├── events.js           # Story Events Choices & Modifiers
│   │   │   └── utils.js            # Energy, XP, & Attributes helper formulas
│   │   ├── commands/
│   │   │   ├── career.js           # /career, /profile, /retire
│   │   │   ├── stats.js            # /stats, /attributes, /history, /leaderboard
│   │   │   ├── training.js         # /train, /skills, /academy
│   │   │   ├── gameplay.js         # /play, /chapters, /contracts, /season
│   │   │   ├── items.js            # /inventory, /equipment
│   │   │   └── admin.js            # /admin give, /admin set_energy
│   │   ├── events/
│   │   │   ├── ready.js            # Gateway connection logging
│   │   │   └── interactionCreate.js# Command execution routing & profile button bindings
│   │   ├── index.js                # Core Discord Client Setup
│   │   └── deploy-commands.js      # Discord REST Slash commands registration
│   ├── package.json
│   ├── career.db                   # SQLite Database File (Created at startup)
│   └── .env                        # Discord Credentials Configuration
```

---

## 🛠️ Installation & Setup

### 1. Prerequisites
- **Node.js**: `v22.x` or higher installed.
- **pnpm** (or `npm`/`yarn`): Native module compilation compiler for `better-sqlite3`.

### 2. Configure Token & IDs
Rename `.env.example` to `.env` in the root of the project:
```bash
cp .env.example .env
```
Fill in the values:
- `DISCORD_TOKEN`: Your Discord Bot Token (from the Discord Developer Portal).
- `CLIENT_ID`: Your Application Client ID.
- `GUILD_ID`: (Optional) Your Discord Server ID for testing. Specifying this deploys commands instantly to your server instead of waiting for global distribution.

### 3. Deploy Slash Commands
Register the commands to Discord:
```bash
pnpm run deploy
```

### 4. Start the Bot
Run the bot locally:
```bash
pnpm run start
```

---

## 🎮 Command List

| Slash Command | Subcommands / Options | Description |
| :--- | :--- | :--- |
| `/career start` | `name`, `batting_hand`, `bowling_style`, `primary_role`, `nationality` | Creates your player and prompts you to select a training academy. |
| `/profile` | *None* | View your player card, level progress, coins, tokens, vitals, and contract. |
| `/academy` | *None* | View current academy benefits, or request transfer to another academy (costs 🪙200). |
| `/train` | `regime: batting/bowling/fitness/fielding` | Spend 1 Token + 15 Energy to drill attributes and earn XP. |
| `/chapters` | *None* | View progression chapters, objectives, rewards, and play the active level. |
| `/play` | `type: practice/chapter` | Start a career match. Launches the batting/bowling engine in your chat. |
| `/inventory` | *None* | View owned gear and equip items to activate attribute boosts. |
| `/equipment` | `shop` or `buy [item_id]` | Browse the shop items or purchase gear with coins. |
| `/attributes` | *None* | Detailed view of base attributes and equipment-modified attributes. |
| `/skills` | `view` or `unlock [skill_key]` | Spend level-up skill points to unlock powerful perks in the skill tree. |
| `/leaderboard`| `type: level/runs/wickets/coins` | View top 10 global players for each category. |
| `/history` | *None* | Logs the match details of your last 10 games. |
| `/stats` | *None* | Complete batting, bowling, and fielding career statistics. |
| `/contracts` | *None* | Review active contract, request drafts/contract offers, or sign with new clubs. |
| `/season` | *None* | View current season details and career tiers (Academy up to International). |
| `/retire` | *None* | Permanently retire your player and delete all career data. |
| `/admin` | `give [user] [type] [amount]` or `set_energy` | Developer/Admin command to add resources or restore energy levels. |
