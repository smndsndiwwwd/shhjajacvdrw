export const skillTree = {
  // BATTING BRANCH
  power_hitter: {
    key: 'power_hitter',
    name: '💥 Power Hitter',
    branch: 'Batting',
    description: 'Increases boundary conversion rate by +10% and improves Power calculations.',
    cost: 1,
    requires: null
  },
  anchor: {
    key: 'anchor',
    name: '⚓ Anchor',
    branch: 'Batting',
    description: 'Improves defensive shot success by +15% and reduces dismissal risk.',
    cost: 1,
    requires: null
  },
  spin_specialist: {
    key: 'spin_specialist',
    name: '🌀 Spin Specialist',
    branch: 'Batting',
    description: 'Provides +12% success rate and timing against spin deliveries.',
    cost: 1,
    requires: null
  },
  reverse_sweep_master: {
    key: 'reverse_sweep_master',
    name: '🧹 Reverse Sweep Master',
    branch: 'Batting',
    description: 'Boosts Reverse Sweep success rate by +25% on turning deliveries.',
    cost: 2,
    requires: 'spin_specialist'
  },

  // BOWLING BRANCH
  pace_spearhead: {
    key: 'pace_spearhead',
    name: '⚡ Pace Spearhead',
    branch: 'Bowling',
    description: 'Increases chance of bowling bouncers/searing deliveries by +15%.',
    cost: 1,
    requires: null
  },
  yorker_king: {
    key: 'yorker_king',
    name: '🎯 Yorker King',
    branch: 'Bowling',
    description: 'Drastically improves Yorker quality, lowering runs conceded in match history simulations.',
    cost: 2,
    requires: 'pace_spearhead'
  },
  doosra_wizard: {
    key: 'doosra_wizard',
    name: '🔮 Doosra Wizard',
    branch: 'Bowling',
    description: 'Unlocks the Doosra variation for spin bowling, increasing wicket take rate.',
    cost: 2,
    requires: null
  },

  // FITNESS BRANCH
  iron_lungs: {
    key: 'iron_lungs',
    name: '🫁 Iron Lungs',
    branch: 'Fitness',
    description: 'Reduces energy drain per training session or match by 20%.',
    cost: 1,
    requires: null
  },
  speed_demon: {
    key: 'speed_demon',
    name: '🏃 Speed Demon',
    branch: 'Fitness',
    description: 'Boosts Running attribute by +10%, converting dot balls to quick singles.',
    cost: 1,
    requires: 'iron_lungs'
  },

  // LEADERSHIP BRANCH
  captaincy_iq: {
    key: 'captaincy_iq',
    name: '🧠 Captaincy IQ',
    branch: 'Leadership',
    description: 'Unlocks Captaincy offers earlier and increases team win rates in simulations.',
    cost: 1,
    requires: null
  },
  tactician: {
    key: 'tactician',
    name: '📋 Master Tactician',
    branch: 'Leadership',
    description: 'Improves contract salary bids by +20% and guarantees playing XI selection.',
    cost: 2,
    requires: 'captaincy_iq'
  },

  // MENTAL STRENGTH BRANCH
  clutch_finisher: {
    key: 'clutch_finisher',
    name: '🔥 Clutch Finisher',
    branch: 'Mental Strength',
    description: 'Boosts timing and confidence by +15% when chasing in the final 5 balls.',
    cost: 1,
    requires: null
  },
  ice_veins: {
    key: 'ice_veins',
    name: '🧊 Ice in Veins',
    branch: 'Mental Strength',
    description: 'Prevents confidence drops after ducks or early match dismissals.',
    cost: 2,
    requires: 'clutch_finisher'
  },

  // FIELDING BRANCH
  bullet_arm: {
    key: 'bullet_arm',
    name: '💪 Bullet Arm',
    branch: 'Fielding',
    description: 'Increases throw accuracy, resulting in +15% more run-outs.',
    cost: 1,
    requires: null
  },
  acrobatic_fielder: {
    key: 'acrobatic_fielder',
    name: '🧤 Acrobatic Fielder',
    branch: 'Fielding',
    description: 'Increases catch success rate by +15% and saves runs.',
    cost: 2,
    requires: 'bullet_arm'
  }
};
