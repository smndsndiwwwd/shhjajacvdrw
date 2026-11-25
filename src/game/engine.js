import { shopEquipment } from './equipment.js';
import { skillTree } from './skills.js';

// Delivery Types
export const deliveries = {
  // Fast Bowler deliveries
  good_length: { name: 'Good Length Delivery', type: 'fast', desc: 'pitching on a good length, offering slight bounce.' },
  yorker: { name: 'Toe-Crushing Yorker', type: 'fast', desc: 'spearing in fast right at the batsman\'s toes.' },
  full_toss: { name: 'Juicy Full Toss', type: 'fast', desc: 'floating through the air at waist height.' },
  half_volley: { name: 'Overpitched Half Volley', type: 'fast', desc: 'pitched right up, inviting the drive.' },
  short_ball: { name: 'Short Pitched Delivery', type: 'fast', desc: 'bouncing halfway down the track, rising to chest height.' },
  bouncer: { name: 'Searing Bouncer', type: 'fast', desc: 'hurled in hard, climbing rapidly towards your helmet.' },
  slow_ball: { name: 'Deceptive Slower Ball', type: 'fast', desc: 'rolled off the fingers, hanging in the air.' },
  knuckle_ball: { name: 'Knuckle Ball', type: 'fast', desc: 'released with no spin or pace, dropping suddenly.' },
  off_cutter: { name: 'Sharp Off-Cutter', type: 'fast', desc: 'gripped to cut back sharply into the right-hander.' },
  leg_cutter: { name: 'Slick Leg-Cutter', type: 'fast', desc: 'gripped to grip and slide away from the bat.' },
  swing_in: { name: 'Booming In-Swinger', type: 'fast', desc: 'swings sharply into the pads in mid-air.' },
  swing_away: { name: 'Out-Swinger', type: 'fast', desc: 'starting middle and curving away late past the off-stump.' },
  reverse_swing: { name: 'Reverse Swinging Yorker', type: 'fast', desc: 'old ball tailing in late and fast toward the base of stumps.' },

  // Spin Bowler deliveries
  off_spin: { name: 'Traditional Off-Break', type: 'spin', desc: 'tossed up, drifting in and turning back off the pitch.' },
  leg_spin: { name: 'Looping Leg-Break', type: 'spin', desc: 'flighted high, landing on middle and spinning away outside off.' },
  googly: { name: 'Deceptive Googly', type: 'spin', desc: 'looks like a leg-break but spins back in sharply.' },
  doosra: { name: 'Mysterious Doosra', type: 'spin', desc: 'bowled with an off-spin action but spinning away.' },
  carrom_ball: { name: 'Flicked Carrom Ball', type: 'spin', desc: 'flicked off the middle finger, sliding straight on quickly.' },
  flipper: { name: 'Skidding Flipper', type: 'spin', desc: 'backspun delivery that stays low and skids on rapidly.' },
  arm_ball: { name: 'Arm Ball', type: 'spin', desc: 'drifts with the arm, sliding on quickly without turning.' },
  top_spinner: { name: 'Bouncy Top-Spinner', type: 'spin', desc: 'tossed up, dipping quickly and gaining extra bounce.' }
};

// Shot Types
export const shots = {
  defensive: { name: 'Defensive Shot', desc: 'Play with a straight, soft face to block the ball.' },
  straight_drive: { name: 'Straight Drive', desc: 'A classic shot played straight back past the bowler.' },
  cover_drive: { name: 'Cover Drive', desc: 'Stroked elegantly through the covers along the ground.' },
  pull: { name: 'Pull Shot', desc: 'Cross-bat shot played to leg-side from a short length.' },
  hook: { name: 'Hook Shot', desc: 'Playing a high short ball over fine leg/square leg.' },
  cut: { name: 'Cut Shot', desc: 'Playing a wide, short delivery past point.' },
  sweep: { name: 'Sweep Shot', desc: 'Kneeling down to sweep a spin delivery to the leg-side boundary.' },
  reverse_sweep: { name: 'Reverse Sweep', desc: 'Sweeping with reversed hands to point/third man.' },
  lofted_drive: { name: 'Lofted Drive', desc: 'Hitting the ball aerially over the infield.' },
  slog: { name: 'Slog Sweep', desc: 'A powerful, high-risk heave over mid-wicket.' },
  switch_hit: { name: 'Switch Hit', desc: 'Changing stance to hit the ball to the opposite side.' },
  upper_cut: { name: 'Upper Cut', desc: 'Guiding a high bouncer over the slip cordon.' },
  late_cut: { name: 'Late Cut', desc: 'Using the pace to glide the ball late past first slip.' }
};

// Matchup scoring: 1 to 5 stars (hidden percentages)
const matchupScores = {
  // yorker
  yorker: {
    defensive: 5, straight_drive: 4, cover_drive: 2, pull: 1, hook: 1, cut: 1, sweep: 2, reverse_sweep: 1,
    lofted_drive: 1, slog: 1, switch_hit: 1, upper_cut: 1, late_cut: 2
  },
  // bouncer
  bouncer: {
    defensive: 4, straight_drive: 1, cover_drive: 1, pull: 5, hook: 5, cut: 2, sweep: 1, reverse_sweep: 1,
    lofted_drive: 1, slog: 2, switch_hit: 1, upper_cut: 5, late_cut: 1
  },
  // short_ball
  short_ball: {
    defensive: 3, straight_drive: 2, cover_drive: 2, pull: 5, hook: 4, cut: 5, sweep: 2, reverse_sweep: 2,
    lofted_drive: 2, slog: 3, switch_hit: 2, upper_cut: 4, late_cut: 3
  },
  // half_volley
  half_volley: {
    defensive: 2, straight_drive: 5, cover_drive: 5, pull: 2, hook: 1, cut: 3, sweep: 3, reverse_sweep: 3,
    lofted_drive: 5, slog: 4, switch_hit: 3, upper_cut: 1, late_cut: 3
  },
  // full_toss
  full_toss: {
    defensive: 1, straight_drive: 5, cover_drive: 4, pull: 4, hook: 3, cut: 4, sweep: 4, reverse_sweep: 3,
    lofted_drive: 5, slog: 5, switch_hit: 4, upper_cut: 2, late_cut: 2
  },
  // good_length
  good_length: {
    defensive: 5, straight_drive: 4, cover_drive: 4, pull: 2, hook: 1, cut: 3, sweep: 2, reverse_sweep: 1,
    lofted_drive: 3, slog: 2, switch_hit: 1, upper_cut: 1, late_cut: 2
  },
  // slow_ball
  slow_ball: {
    defensive: 3, straight_drive: 3, cover_drive: 3, pull: 4, hook: 2, cut: 3, sweep: 4, reverse_sweep: 3,
    lofted_drive: 5, slog: 5, switch_hit: 3, upper_cut: 2, late_cut: 2
  },
  // knuckle_ball
  knuckle_ball: {
    defensive: 5, straight_drive: 4, cover_drive: 3, pull: 3, hook: 2, cut: 2, sweep: 3, reverse_sweep: 2,
    lofted_drive: 4, slog: 4, switch_hit: 2, upper_cut: 1, late_cut: 2
  },
  // off_cutter
  off_cutter: {
    defensive: 4, straight_drive: 3, cover_drive: 2, pull: 3, hook: 1, cut: 4, sweep: 3, reverse_sweep: 2,
    lofted_drive: 3, slog: 3, switch_hit: 2, upper_cut: 1, late_cut: 4
  },
  // leg_cutter
  leg_cutter: {
    defensive: 4, straight_drive: 2, cover_drive: 4, pull: 4, hook: 2, cut: 4, sweep: 2, reverse_sweep: 3,
    lofted_drive: 3, slog: 3, switch_hit: 2, upper_cut: 2, late_cut: 2
  },
  // swing_in
  swing_in: {
    defensive: 5, straight_drive: 5, cover_drive: 2, pull: 3, hook: 2, cut: 1, sweep: 3, reverse_sweep: 2,
    lofted_drive: 4, slog: 3, switch_hit: 2, upper_cut: 1, late_cut: 1
  },
  // swing_away
  swing_away: {
    defensive: 5, straight_drive: 3, cover_drive: 5, pull: 2, hook: 1, cut: 3, sweep: 2, reverse_sweep: 2,
    lofted_drive: 3, slog: 2, switch_hit: 2, upper_cut: 2, late_cut: 4
  },
  // reverse_swing
  reverse_swing: {
    defensive: 5, straight_drive: 4, cover_drive: 2, pull: 1, hook: 1, cut: 1, sweep: 2, reverse_sweep: 1,
    lofted_drive: 2, slog: 1, switch_hit: 1, upper_cut: 1, late_cut: 2
  },

  // SPIN DELIVERIES
  off_spin: {
    defensive: 5, straight_drive: 4, cover_drive: 3, pull: 2, hook: 1, cut: 3, sweep: 5, reverse_sweep: 4,
    lofted_drive: 4, slog: 4, switch_hit: 3, upper_cut: 1, late_cut: 2
  },
  leg_spin: {
    defensive: 4, straight_drive: 3, cover_drive: 5, pull: 3, hook: 1, cut: 4, sweep: 5, reverse_sweep: 3,
    lofted_drive: 4, slog: 4, switch_hit: 5, upper_cut: 1, late_cut: 2
  },
  googly: {
    defensive: 5, straight_drive: 4, cover_drive: 2, pull: 2, hook: 1, cut: 2, sweep: 5, reverse_sweep: 4,
    lofted_drive: 3, slog: 3, switch_hit: 3, upper_cut: 1, late_cut: 2
  },
  doosra: {
    defensive: 5, straight_drive: 2, cover_drive: 4, pull: 2, hook: 1, cut: 3, sweep: 3, reverse_sweep: 3,
    lofted_drive: 3, slog: 2, switch_hit: 3, upper_cut: 1, late_cut: 5
  },
  carrom_ball: {
    defensive: 5, straight_drive: 5, cover_drive: 3, pull: 2, hook: 1, cut: 3, sweep: 2, reverse_sweep: 2,
    lofted_drive: 4, slog: 3, switch_hit: 2, upper_cut: 1, late_cut: 3
  },
  flipper: {
    defensive: 5, straight_drive: 4, cover_drive: 3, pull: 1, hook: 1, cut: 2, sweep: 3, reverse_sweep: 2,
    lofted_drive: 3, slog: 2, switch_hit: 2, upper_cut: 1, late_cut: 3
  },
  arm_ball: {
    defensive: 5, straight_drive: 5, cover_drive: 3, pull: 2, hook: 1, cut: 4, sweep: 2, reverse_sweep: 2,
    lofted_drive: 4, slog: 3, switch_hit: 2, upper_cut: 1, late_cut: 3
  },
  top_spinner: {
    defensive: 5, straight_drive: 3, cover_drive: 3, pull: 4, hook: 3, cut: 3, sweep: 2, reverse_sweep: 2,
    lofted_drive: 4, slog: 3, switch_hit: 2, upper_cut: 2, late_cut: 2
  }
};

/**
 * Roll the timing of the shot based on player attributes, equipment, skills, and confidence.
 */
function rollTiming(playerAttrs, eqBonuses, activeSkills, confidence, isClutch) {
  // Aggregate timing stat
  const baseTiming = playerAttrs.timing || 10;
  const eqTiming = eqBonuses.timing || 0;
  let skillTimingMod = 0;

  if (activeSkills.includes('clutch_finisher') && isClutch) {
    skillTimingMod += 15;
  }
  if (activeSkills.includes('anchor')) {
    skillTimingMod += 5; // Passive boost to all timing
  }

  const confidenceMod = (confidence - 50) * 0.2; // -10 to +10

  const timingScore = 20 + baseTiming + eqTiming + skillTimingMod + confidenceMod + (Math.random() * 40 - 20);

  // Timing thresholds
  if (timingScore >= 95) return 'Perfect';
  if (timingScore >= 80) return 'Great';
  if (timingScore >= 60) return 'Good';
  if (timingScore >= 45) return 'Early';
  if (timingScore >= 30) return 'Late';
  if (timingScore >= 15) return 'Very Late';
  return 'Mistimed';
}

/**
 * Simulates a single ball based on user choices and stats
 * @param {object} params
 * @param {string} params.deliveryKey - Key of the delivery bowled
 * @param {string} params.shotKey - Key of the shot chosen by player
 * @param {object} params.playerAttrs - Player attributes
 * @param {object} params.eqBonuses - Total equipment attribute bonuses
 * @param {string[]} params.activeSkills - List of unlocked skill keys
 * @param {number} params.confidence - Player confidence (0-100)
 * @param {number} params.bowlerSkill - Bowler skill (0-100)
 * @param {boolean} params.isFreeHit - Whether it's a Free Hit
 * @param {boolean} params.isClutch - Chasing in last 5 balls
 * @returns {object} Outcome results
 */
export function simulateBall({
  deliveryKey,
  shotKey,
  playerAttrs,
  eqBonuses,
  activeSkills,
  confidence,
  bowlerSkill,
  isFreeHit = false,
  isClutch = false
}) {
  const delivery = deliveries[deliveryKey];
  const shot = shots[shotKey];

  if (!delivery || !shot) {
    throw new Error('Invalid delivery or shot selection.');
  }

  // Get matchup score (1 to 5)
  const matchupStar = matchupScores[deliveryKey]?.[shotKey] || 3;

  // Determine timing
  const timing = rollTiming(playerAttrs, eqBonuses, activeSkills, confidence, isClutch);

  // Calculate success probability based on matchup, timing, and player skill vs bowler skill
  let successWeight = matchupStar * 20; // 20 to 100 base

  // Timing adjustments (reduced multipliers to balance influence of attributes & shot matchups)
  let timingMultiplier = 1.0;
  if (timing === 'Perfect') timingMultiplier = 1.25;
  else if (timing === 'Great') timingMultiplier = 1.15;
  else if (timing === 'Good') timingMultiplier = 1.0;
  else if (timing === 'Early' || timing === 'Late') timingMultiplier = 0.90;
  else if (timing === 'Very Late') timingMultiplier = 0.75;
  else if (timing === 'Mistimed') timingMultiplier = 0.50;

  successWeight *= timingMultiplier;

  // Attributes vs Bowler Skill
  const isSpinner = delivery.type === 'spin';
  const battingSkill = isSpinner 
    ? (playerAttrs.spin || 10) + (eqBonuses.spin || 0)
    : (playerAttrs.pace || 10) + (eqBonuses.pace || 0);

  const technique = (playerAttrs.technique || 10) + (eqBonuses.technique || 0);
  const power = (playerAttrs.power || 10) + (eqBonuses.power || 0);

  // Skills buffs
  let skillSuccessMod = 1.0;
  if (activeSkills.includes('spin_specialist') && isSpinner) {
    skillSuccessMod += 0.12;
  }
  if (activeSkills.includes('reverse_sweep_master') && shotKey === 'reverse_sweep' && isSpinner) {
    skillSuccessMod += 0.25;
  }
  if (activeSkills.includes('anchor') && (shotKey === 'defensive' || shotKey === 'straight_drive' || shotKey === 'cover_drive')) {
    skillSuccessMod += 0.15;
  }
  if (activeSkills.includes('power_hitter') && (shotKey === 'slog' || shotKey === 'lofted_drive')) {
    skillSuccessMod += 0.10;
  }

  // Overall player ability score for this ball
  const playerAbility = (battingSkill * 0.4) + (technique * 0.4) + (power * 0.2);
  const skillRatio = playerAbility / (bowlerSkill || 50); // e.g. 45 / 50 = 0.9

  let finalSuccessScore = successWeight * skillRatio * skillSuccessMod;

  // Let's cap and roll the outcome
  // We can classify the outcome by dividing the finalSuccessScore into ranges:
  // Let's roll a random number 1 to 100 to introduce variability
  const roll = Math.random() * 100;

  let runs = 0;
  let wicket = false;
  let dismissalType = '';
  let commentary = '';
  let outcomeType = ''; // Dot, Run, Boundary, Out, Extra

  // Special Check: Defensive shot
  if (shotKey === 'defensive') {
    // Defense is highly reliable, but won't score runs
    const defenseThreshold = 90 - (technique * 0.3) - (matchupStar * 6);
    if (roll > defenseThreshold || timing === 'Perfect' || timing === 'Great') {
      runs = 0;
      commentary = `🛡️ You block it solidly. The ball drops dead right at your feet. No run.`;
      outcomeType = 'Dot';
    } else {
      // Small chance of dismissal if timing is awful
      if (isFreeHit) {
        runs = 0;
        commentary = `🛡️ Missed timing on the block, but you are safe on a Free Hit!`;
        outcomeType = 'Dot';
      } else {
        wicket = true;
        dismissalType = roll > (defenseThreshold + 5) ? 'caught' : 'bowled';
        if (dismissalType === 'caught') {
          commentary = `💔 Inside edge on the block! It balloons up off the pad and the short-leg fielder catches it easily. Dismissed!`;
        } else {
          commentary = `💔 Played down the wrong line of a defensive push. Stumps shattered! Dismissed!`;
        }
        outcomeType = 'Out';
      }
    }
  } else {
    // Normal shot scoring
    // High success score means better chance of boundary or safe runs.
    // Low success score means high chance of edge, miss, or out.

    if (finalSuccessScore >= 85) {
      // Perfect/Great Timing & Good Matchup: Boundary or heavy runs
      const boundaryRoll = Math.random() * 100;
      let powerMod = power;
      if (activeSkills.includes('power_hitter')) powerMod += 15;

      if (boundaryRoll < (45 + powerMod * 0.3) && (shotKey === 'slog' || shotKey === 'lofted_drive' || shotKey === 'pull' || shotKey === 'hook')) {
        runs = 6;
        commentary = `🚀 BOOM! What a connection! A spectacular strike that sails way over the ropes for a SIX!`;
        outcomeType = 'Boundary';
      } else {
        runs = 4;
        commentary = `🏏 Shot! Perfectly timed. The ball races across the turf, leaving the outfielders chasing shadows. FOUR!`;
        outcomeType = 'Boundary';
      }
    } else if (finalSuccessScore >= 45) {
      // Good Timing / Decent Matchup: Runs
      const runRoll = Math.random() * 100;
      // Fitness/Running increases chance of converting 1s to 2s/3s
      const runningStat = (playerAttrs.running || 10) + (eqBonuses.running || 0);
      let runSpeedBonus = runningStat * 0.4;
      if (activeSkills.includes('speed_demon')) runSpeedBonus += 15;

      if (runRoll < 15 + runSpeedBonus) {
        runs = 3;
        commentary = `🏃 Superb running! You hit it into the deep gap and sprint hard to complete three runs.`;
        outcomeType = 'Run';
      } else if (runRoll < 55 + runSpeedBonus) {
        runs = 2;
        commentary = `🏃 Clipped away into vacant mid-wicket. Easy two runs taken with good hustle.`;
        outcomeType = 'Run';
      } else {
        runs = 1;
        commentary = `🟢 Pushed down to long-on for a comfortable single. Keeps the scoreboard ticking.`;
        outcomeType = 'Run';
      }
    } else if (finalSuccessScore >= 20) {
      // Dot ball or Edge (small wicket risk)
      const dotRoll = Math.random() * 100;
      if (dotRoll < 40) {
        runs = 0;
        commentary = `🟢 Played to the fielder. No run possible.`;
        outcomeType = 'Dot';
      } else if (dotRoll < 75) {
        // Edge!
        const edgeWicketChance = 40 - (technique * 0.2);
        if (Math.random() * 100 < edgeWicketChance) {
          if (isFreeHit) {
            runs = 1;
            commentary = `⚡ Thick edge flies past slips! Safe because of the Free Hit, you take a single.`;
            outcomeType = 'Run';
          } else {
            wicket = true;
            dismissalType = 'caught';
            commentary = `💔 OUT! Thick outside edge! The ball flies quickly to the keeper/slips who makes no mistake. Caught!`;
            outcomeType = 'Out';
          }
        } else {
          runs = 1;
          commentary = `😅 Thick edge but it drops short of the slip fielder and trickles away. You steal a quick single.`;
          outcomeType = 'Run';
        }
      } else {
        // Inside edge
        runs = 0;
        commentary = `💥 Inside edge onto the pad. Bowler appeals, but it's clearly sliding down leg. Dot ball.`;
        outcomeType = 'Dot';
      }
    } else {
      // Terrible execution / mismatch: High Wicket Risk
      const wicketRoll = Math.random() * 100;
      if (isFreeHit) {
        runs = 0;
        commentary = `💨 Completely beaten! Lucky for you, it's a Free Hit. Stumps hit but NOT OUT!`;
        outcomeType = 'Dot';
      } else {
        wicket = true;
        // Select dismissal type
        if (wicketRoll < 40) {
          dismissalType = 'bowled';
          commentary = `💔 BOWLED! You completely missed the line. Stumps are cartwheeling! Dismissed!`;
        } else if (wicketRoll < 75) {
          dismissalType = 'lbw';
          commentary = `💔 LBW! Beaten by the movement, struck dead in front of the stumps. The umpire raises the finger! Dismissed!`;
        } else {
          dismissalType = 'caught';
          commentary = `💔 CAUGHT! A mistimed skyer that goes straight up in the air. The fielder under it handles the pressure. Dismissed!`;
        }
        outcomeType = 'Out';
      }
    }
  }

  // Random Extra Check (No ball or Wide - 4% chance total)
  let nextIsFreeHit = false;
  let rebowl = false;
  let extraRuns = 0;
  
  if (Math.random() < 0.04 && !isFreeHit) {
    const extraRoll = Math.random();
    if (extraRoll < 0.5) {
      // Wide
      extraRuns = 1;
      rebowl = true;
      commentary = `🚨 WIDE! The bowler sprays it way outside the tramline. +1 extra. Ball must be rebowled.`;
      runs = 0;
      wicket = false;
      outcomeType = 'Extra';
    } else {
      // No Ball
      extraRuns = 1;
      nextIsFreeHit = true;
      rebowl = true;
      runs = runs + (wicket ? 0 : 0); // No wicket stands on No Ball anyway
      if (wicket) {
        wicket = false;
        commentary = `🚨 NO BALL! The bowler overstepped! Stumps fell but you are NOT OUT! +1 run and FREE HIT coming up!`;
      } else {
        commentary = `🚨 NO BALL! Overstepped line. +1 run added. Free Hit unlocked for the next ball!\n${commentary}`;
      }
      outcomeType = 'Extra';
    }
  }

  return {
    runs: runs + extraRuns,
    wicket,
    dismissalType,
    timing,
    matchupStar,
    commentary,
    outcomeType,
    nextIsFreeHit,
    rebowl
  };
}

export function getReleaseHint(line, length, speed, variation) {
  let lineText = '';
  if (line === 'Off Side') {
    if (length === 'Yorker') lineText = 'spearing outside off-stump';
    else if (length === 'Short') lineText = 'bouncing wide outside off';
    else if (length === 'Full') lineText = 'pitched up invitingly outside off';
    else lineText = 'angled into the corridor outside off';
  } else if (line === 'Leg Side') {
    if (length === 'Yorker') lineText = 'spearing right at the toes on leg-stump';
    else if (length === 'Short') lineText = 'directed steeply at the ribs/bodyline';
    else if (length === 'Full') lineText = 'angling dangerously into the pads';
    else if (length === 'Full Toss') lineText = 'straying down leg at hip height';
    else lineText = 'probing the pads on middle-and-leg';
  } else if (line === 'Wide') {
    lineText = 'spraying well wide outside the tramlines';
  } else {
    if (length === 'Yorker') lineText = 'spearing straight at the base of middle stump';
    else if (length === 'Short') lineText = 'hurled in short, climbing towards the throat';
    else if (length === 'Full') lineText = 'pitched up right in line with the stumps';
    else lineText = 'landing on a testing length on the stumps';
  }

  let lengthText = '';
  if (length === 'Yorker') lengthText = 'released from a high arm action, spearing in full';
  else if (length === 'Full') lengthText = 'pitched right up searchingly';
  else if (length === 'Full Toss') lengthText = 'floating through without hitting the deck';
  else if (length === 'Good Length') lengthText = 'hitting a probing good length area';
  else lengthText = 'dragged back halfway down the pitch, rising sharply';

  let speedText = 'at brisk pace';
  if (speed === 'Fast') speedText = 'with a rapid arm rotation';
  else if (speed === 'Medium') speedText = 'with a smooth, controlled run-up';
  else if (speed === 'Slow') speedText = 'with a deceptive, flighted release';

  let varText = '';
  const v = (variation || '').toLowerCase();
  if (v.includes('out-swing') || v.includes('outswinger')) varText = 'with the shiny side out and seam angled towards slips';
  else if (v.includes('in-swing') || v.includes('inswinger')) varText = 'with the seam canted inwards towards fine leg';
  else if (v.includes('reverse')) varText = 'tailing in late through the air with a worn seam';
  else if (v.includes('off-cutter')) varText = 'with index finger rolling down the right of the seam';
  else if (v.includes('leg-cutter')) varText = 'with fingers cutting across the seam to slide away';
  else if (v.includes('knuckle')) varText = 'nestled delicately on the knuckles with zero rotation';
  else if (v.includes('slower') || v.includes('slow ball')) varText = 'with fingers rolling smoothly off the back of the ball';
  else if (v.includes('seam-up') || v.includes('normal delivery')) varText = 'with an upright, bolt-straight seam';
  else if (v.includes('cross-seam')) varText = 'with the seam scrambled horizontally across the ball';
  else if (v.includes('bouncer')) varText = 'hurled into the deck with aggressive shoulder effort';
  else if (v.includes('googly')) varText = 'released from the back of the wrist, disguised as leg-spin';
  else if (v.includes('doosra')) varText = 'flicked with an off-spin grip that counter-spins away';
  else if (v.includes('carrom')) varText = 'flicked out with the bent middle finger like a carrom striker';
  else if (v.includes('flipper')) varText = 'pinched from under the fingers, staying low';
  else if (v.includes('arm ball')) varText = 'pushed through with an upright seam, sliding on with the arm';
  else if (v.includes('top-spin')) varText = 'rolled over the top of the seam to generate dipping bounce';
  else if (v.includes('leg-break')) varText = 'with a sharp wrist snap, ripping the ball away from the bat';
  else if (v.includes('off-break')) varText = 'with heavy index-finger torque across the seam';
  else if (v.includes('toe-crushing')) varText = 'driven down hard aiming for the batsman\'s boots';
  else if (v.includes('swing/spin')) varText = 'with a tilted seam';
  else if (v.includes('cutter/googly')) varText = 'with a flick of the wrist';

  return `👀 **Bowler Release Hint:** The bowler releases the ball ${speedText} ${varText ? varText + ', ' : ''}${lengthText}, ${lineText}.`;
}

function rollWeightedChoice(weightsObj) {
  const entries = Object.entries(weightsObj);
  const total = entries.reduce((acc, [, w]) => acc + w, 0);
  let r = Math.random() * total;
  for (const [key, weight] of entries) {
    if (r < weight) return key;
    r -= weight;
  }
  return entries[0][0];
}

const DELIVERY_TACTICS = {
  'In-Swinger': {
    lines: { 'Leg Side': 42, 'Stumps': 44, 'Off Side': 11, 'Wide': 3 },
    lengths: { 'Full': 45, 'Yorker': 30, 'Good Length': 22, 'Full Toss': 3 },
    speeds: { 'Fast': 80, 'Medium': 20 }
  },
  'Out-Swinger': {
    lines: { 'Off Side': 60, 'Stumps': 28, 'Leg Side': 8, 'Wide': 4 },
    lengths: { 'Good Length': 52, 'Full': 32, 'Short': 12, 'Yorker': 4 },
    speeds: { 'Fast': 80, 'Medium': 20 }
  },
  'Reverse Swing': {
    lines: { 'Stumps': 46, 'Leg Side': 42, 'Off Side': 10, 'Wide': 2 },
    lengths: { 'Yorker': 55, 'Full': 30, 'Good Length': 15 },
    speeds: { 'Fast': 90, 'Medium': 10 }
  },
  'Searing Bouncer': {
    lines: { 'Leg Side': 42, 'Stumps': 34, 'Off Side': 21, 'Wide': 3 },
    lengths: { 'Short': 94, 'Good Length': 6 },
    speeds: { 'Fast': 85, 'Medium': 15 }
  },
  'Toe-Crushing Yorker': {
    lines: { 'Leg Side': 40, 'Stumps': 38, 'Off Side': 18, 'Wide': 4 },
    lengths: { 'Yorker': 90, 'Full Toss': 10 },
    speeds: { 'Fast': 88, 'Medium': 12 }
  },
  'Sharp Off-Cutter': {
    lines: { 'Stumps': 40, 'Leg Side': 38, 'Off Side': 20, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 28, 'Short': 22 },
    speeds: { 'Medium': 65, 'Slow': 35 }
  },
  'Slick Leg-Cutter': {
    lines: { 'Off Side': 55, 'Stumps': 32, 'Leg Side': 10, 'Wide': 3 },
    lengths: { 'Good Length': 55, 'Short': 25, 'Full': 20 },
    speeds: { 'Medium': 65, 'Slow': 35 }
  },
  'Knuckle Ball': {
    lines: { 'Stumps': 38, 'Off Side': 36, 'Leg Side': 23, 'Wide': 3 },
    lengths: { 'Full': 45, 'Yorker': 25, 'Good Length': 20, 'Short': 10 },
    speeds: { 'Slow': 80, 'Medium': 20 }
  },
  'Deceptive Slower Ball': {
    lines: { 'Off Side': 38, 'Stumps': 36, 'Leg Side': 23, 'Wide': 3 },
    lengths: { 'Full': 40, 'Good Length': 35, 'Short': 15, 'Yorker': 10 },
    speeds: { 'Slow': 80, 'Medium': 20 }
  },
  'Cross-Seam Delivery': {
    lines: { 'Stumps': 40, 'Off Side': 32, 'Leg Side': 25, 'Wide': 3 },
    lengths: { 'Good Length': 50, 'Short': 30, 'Full': 20 },
    speeds: { 'Fast': 75, 'Medium': 25 }
  },
  'Seam-Up Delivery': {
    lines: { 'Stumps': 38, 'Off Side': 34, 'Leg Side': 25, 'Wide': 3 },
    lengths: { 'Good Length': 55, 'Full': 25, 'Short': 15, 'Yorker': 5 },
    speeds: { 'Fast': 75, 'Medium': 25 }
  },
  'Traditional Off-Break': {
    lines: { 'Stumps': 40, 'Leg Side': 34, 'Off Side': 24, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 35, 'Short': 15 },
    speeds: { 'Slow': 75, 'Medium': 25 }
  },
  'Looping Leg-Break': {
    lines: { 'Leg Side': 36, 'Stumps': 38, 'Off Side': 24, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 35, 'Short': 15 },
    speeds: { 'Slow': 80, 'Medium': 20 }
  },
  'Deceptive Googly': {
    lines: { 'Off Side': 40, 'Stumps': 36, 'Leg Side': 22, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 35, 'Short': 15 },
    speeds: { 'Slow': 65, 'Medium': 35 }
  },
  'Mysterious Doosra': {
    lines: { 'Stumps': 40, 'Leg Side': 32, 'Off Side': 26, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 35, 'Short': 15 },
    speeds: { 'Slow': 70, 'Medium': 30 }
  },
  'Flicked Carrom Ball': {
    lines: { 'Off Side': 38, 'Stumps': 38, 'Leg Side': 22, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Full': 35, 'Yorker': 15 },
    speeds: { 'Medium': 65, 'Slow': 35 }
  },
  'Skidding Flipper': {
    lines: { 'Stumps': 55, 'Leg Side': 25, 'Off Side': 18, 'Wide': 2 },
    lengths: { 'Good Length': 50, 'Yorker': 30, 'Full': 20 },
    speeds: { 'Medium': 55, 'Slow': 45 }
  },
  'Arm Ball': {
    lines: { 'Leg Side': 42, 'Stumps': 38, 'Off Side': 18, 'Wide': 2 },
    lengths: { 'Full': 45, 'Good Length': 40, 'Yorker': 15 },
    speeds: { 'Medium': 70, 'Slow': 30 }
  },
  'Bouncy Top-Spinner': {
    lines: { 'Stumps': 45, 'Leg Side': 28, 'Off Side': 25, 'Wide': 2 },
    lengths: { 'Good Length': 55, 'Short': 30, 'Full': 15 },
    speeds: { 'Slow': 60, 'Medium': 40 }
  }
};

export function pickBowlerTypeForOver(pitch = 'Balanced Sporting Pitch', overIndex = 0) {
  const pLower = (pitch || '').toLowerCase();
  let spinBias = 0.42;
  if (pLower.includes('spin') || pLower.includes('dust') || pLower.includes('dry') || pLower.includes('crumbly')) spinBias = 0.68;
  else if (pLower.includes('green') || pLower.includes('seam') || pLower.includes('swing') || pLower.includes('bounc') || pLower.includes('clay')) spinBias = 0.25;
  // Opening over favors pace unless spin pitch, alternating cleanly across overs
  if (overIndex === 0 && spinBias < 0.6) return Math.random() < spinBias * 0.6 ? 'spin' : 'pace';
  return Math.random() < spinBias ? 'spin' : 'pace';
}

export function generateBowlerDelivery(pitch = 'Balanced Sporting Pitch', bowlerType = null) {
  const pLower = (pitch || '').toLowerCase();

  // 1. Determine bowler craft (Pace vs Spin) if not explicitly set
  let isSpin = false;
  if (bowlerType) {
    isSpin = bowlerType.toLowerCase().includes('spin');
  } else {
    isSpin = pickBowlerTypeForOver(pitch, 0) === 'spin';
  }

  // 2. Select tactical variation based on craft & pitch conditions
  let variation = 'Seam-Up Delivery';

  if (isSpin) {
    let spinPool;
    if (pLower.includes('spin') || pLower.includes('dry') || pLower.includes('dust')) {
      spinPool = ['Traditional Off-Break', 'Looping Leg-Break', 'Deceptive Googly', 'Mysterious Doosra', 'Bouncy Top-Spinner', 'Skidding Flipper'];
    } else {
      spinPool = [
        'Traditional Off-Break',
        'Looping Leg-Break',
        'Deceptive Googly',
        'Mysterious Doosra',
        'Flicked Carrom Ball',
        'Skidding Flipper',
        'Arm Ball',
        'Bouncy Top-Spinner'
      ];
    }
    variation = spinPool[Math.floor(Math.random() * spinPool.length)];
  } else {
    // Pace Bowler
    let pacePool;
    if (pLower.includes('green') || pLower.includes('seam') || pLower.includes('swing') || pLower.includes('overcast')) {
      pacePool = ['In-Swinger', 'Out-Swinger', 'Reverse Swing', 'Toe-Crushing Yorker', 'Seam-Up Delivery', 'Searing Bouncer'];
    } else if (pLower.includes('damp') || pLower.includes('slow')) {
      pacePool = ['Sharp Off-Cutter', 'Slick Leg-Cutter', 'Knuckle Ball', 'Deceptive Slower Ball', 'Seam-Up Delivery'];
    } else if (pLower.includes('bounc') || pLower.includes('clay')) {
      pacePool = ['Searing Bouncer', 'Seam-Up Delivery', 'In-Swinger', 'Toe-Crushing Yorker', 'Cross-Seam Delivery', 'Out-Swinger'];
    } else {
      pacePool = [
        'In-Swinger',
        'Out-Swinger',
        'Reverse Swing',
        'Searing Bouncer',
        'Toe-Crushing Yorker',
        'Sharp Off-Cutter',
        'Slick Leg-Cutter',
        'Knuckle Ball',
        'Deceptive Slower Ball',
        'Seam-Up Delivery',
        'Cross-Seam Delivery'
      ];
    }
    variation = pacePool[Math.floor(Math.random() * pacePool.length)];
  }

  // 3. Resolve tactical line, length, and speed based on variation
  const tactics = DELIVERY_TACTICS[variation] || DELIVERY_TACTICS['Seam-Up Delivery'];
  const line = rollWeightedChoice(tactics.lines);
  const length = rollWeightedChoice(tactics.lengths);
  const speed = rollWeightedChoice(tactics.speeds);

  const fieldPreset = ['Balanced', 'Attacking', 'Defensive'][Math.floor(Math.random() * 3)];

  return { line, length, variation, speed, fieldPreset, bowlerType: isSpin ? 'spin' : 'pace' };
}

export function getOverBowler(pitch = 'Balanced Sporting Pitch', overNumber = 1, previousBowler = null) {
  const pLower = (pitch || '').toLowerCase();
  const isSpinFriendly = pLower.includes('spin') || pLower.includes('dust') || pLower.includes('dry') || pLower.includes('turning');
  const isPaceFriendly = pLower.includes('green') || pLower.includes('seam') || pLower.includes('swing') || pLower.includes('bounc') || pLower.includes('clay');

  let preferredType = 'pace';
  if (overNumber === 1) {
    preferredType = 'pace'; // Over 1 is always the opening pacer taking the new ball
  } else if (isSpinFriendly) {
    preferredType = (overNumber % 2 === 0) ? 'spin' : (Math.random() < 0.65 ? 'spin' : 'pace');
  } else if (isPaceFriendly) {
    preferredType = (overNumber === 3 || overNumber === 7) ? 'spin' : 'pace';
  } else {
    preferredType = (overNumber % 2 === 0) ? 'spin' : 'pace';
  }

  const spinBowlers = [
    { name: 'Rashid Khan', style: 'Right-Arm Leg-Break' },
    { name: 'Ravichandran Ashwin', style: 'Right-Arm Off-Break' },
    { name: 'Adam Zampa', style: 'Right-Arm Leg-Spin' },
    { name: 'Shakib Al Hasan', style: 'Left-Arm Orthodox' },
    { name: 'Wanindu Hasaranga', style: 'Right-Arm Leg-Break Googly' },
    { name: 'Sunil Narine', style: 'Right-Arm Mystery Spin' },
    { name: 'Yuzvendra Chahal', style: 'Right-Arm Leg-Break' },
    { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist-Spin' },
    { name: 'Mitchell Santner', style: 'Left-Arm Orthodox' },
    { name: 'Tabraiz Shamsi', style: 'Left-Arm Wrist-Spin' }
  ];

  const paceBowlers = [
    { name: 'Mitchell Starc', style: 'Left-Arm Fast' },
    { name: 'Jasprit Bumrah', style: 'Right-Arm Fast' },
    { name: 'Shaheen Shah Afridi', style: 'Left-Arm Fast' },
    { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium' },
    { name: 'Kagiso Rabada', style: 'Right-Arm Fast' },
    { name: 'Trent Boult', style: 'Left-Arm Fast-Medium' },
    { name: 'Josh Hazlewood', style: 'Right-Arm Fast-Medium' },
    { name: 'Haris Rauf', style: 'Right-Arm Express Fast' },
    { name: 'Anrich Nortje', style: 'Right-Arm Express Fast' },
    { name: 'Mark Wood', style: 'Right-Arm Fast' },
    { name: 'Lockie Ferguson', style: 'Right-Arm Fast' },
    { name: 'Naseem Shah', style: 'Right-Arm Fast' }
  ];

  const list = (preferredType === 'spin') ? spinBowlers : paceBowlers;
  const filtered = list.filter(b => !previousBowler || b.name !== previousBowler.name);
  const selected = filtered[Math.floor(Math.random() * filtered.length)] || list[0];

  return {
    name: selected.name,
    type: preferredType, // 'pace' or 'spin'
    style: selected.style,
    ballsBowled: 0,
    runsConceded: 0,
    wicketsTaken: 0
  };
}

export const ZONE_MAP = {
  'Fine Leg': 1,
  'Square Leg': 2,
  'Mid Wicket': 3,
  'Long On': 4,
  'Long Off': 5,
  'Cover': 6,
  'Point': 7,
  'Third Man': 8,
  'Extra Cover': 6,
  'Deep Cover': 6,
  'Deep Point': 7,
  'Deep Square Leg': 2,
  'Deep Mid Wicket': 3,
  'Deep Fine Leg': 1,
  'Mid On': 4,
  'Mid Off': 5
};

export const ZONE_NAMES = {
  1: 'Fine Leg',
  2: 'Square Leg',
  3: 'Mid Wicket',
  4: 'Long On',
  5: 'Long Off',
  6: 'Cover',
  7: 'Point',
  8: 'Third Man'
};

export const FIELD_PRESET_CONFIGS = {
  Balanced: {
    powerplay: {
      1: { infield: 1, outfield: 0, labels: ['Short Fine Leg'] },
      2: { infield: 0, outfield: 1, labels: ['Deep Square Leg'] },
      3: { infield: 0, outfield: 1, labels: ['Deep Mid-Wicket'] },
      4: { infield: 2, outfield: 0, labels: ['Mid On', 'Long On (Up)'] },
      5: { infield: 2, outfield: 0, labels: ['Mid Off', 'Long Off (Up)'] },
      6: { infield: 1, outfield: 0, labels: ['Cover'] },
      7: { infield: 1, outfield: 0, labels: ['Point (Up)'] },
      8: { infield: 0, outfield: 0, labels: [] }
    },
    normal: {
      1: { infield: 1, outfield: 0, labels: ['Short Fine Leg'] },
      2: { infield: 0, outfield: 1, labels: ['Deep Square Leg'] },
      3: { infield: 0, outfield: 1, labels: ['Deep Mid-Wicket'] },
      4: { infield: 1, outfield: 1, labels: ['Mid On', 'Long On'] },
      5: { infield: 1, outfield: 1, labels: ['Mid Off', 'Long Off'] },
      6: { infield: 1, outfield: 0, labels: ['Cover'] },
      7: { infield: 0, outfield: 1, labels: ['Deep Point'] },
      8: { infield: 0, outfield: 0, labels: [] }
    }
  },
  Attacking: {
    powerplay: {
      1: { infield: 1, outfield: 0, labels: ['Short Leg'] },
      2: { infield: 0, outfield: 0, labels: [] },
      3: { infield: 1, outfield: 1, labels: ['Mid Wicket', 'Deep Mid Wicket'] },
      4: { infield: 0, outfield: 0, labels: [] },
      5: { infield: 0, outfield: 1, labels: ['Long Off'] },
      6: { infield: 2, outfield: 0, labels: ['Silly Point', 'Cover'] },
      7: { infield: 0, outfield: 0, labels: [] },
      8: { infield: 3, outfield: 0, labels: ['Slip 1', 'Slip 2', 'Gully'] }
    },
    normal: {
      1: { infield: 1, outfield: 0, labels: ['Short Leg'] },
      2: { infield: 0, outfield: 0, labels: [] },
      3: { infield: 1, outfield: 1, labels: ['Mid Wicket', 'Deep Mid Wicket'] },
      4: { infield: 0, outfield: 0, labels: [] },
      5: { infield: 0, outfield: 1, labels: ['Long Off'] },
      6: { infield: 2, outfield: 0, labels: ['Silly Point', 'Cover'] },
      7: { infield: 0, outfield: 0, labels: [] },
      8: { infield: 3, outfield: 0, labels: ['Slip 1', 'Slip 2', 'Gully'] }
    }
  },
  Defensive: {
    powerplay: {
      1: { infield: 0, outfield: 1, labels: ['Deep Fine Leg'] },
      2: { infield: 0, outfield: 1, labels: ['Deep Square Leg'] },
      3: { infield: 1, outfield: 0, labels: ['Deep Mid Wicket (Up)'] },
      4: { infield: 2, outfield: 0, labels: ['Mid On', 'Long On (Up)'] },
      5: { infield: 1, outfield: 0, labels: ['Long Off (Up)'] },
      6: { infield: 1, outfield: 0, labels: ['Deep Cover (Up)'] },
      7: { infield: 1, outfield: 0, labels: ['Point'] },
      8: { infield: 1, outfield: 0, labels: ['Deep Third Man (Up)'] }
    },
    normal: {
      1: { infield: 0, outfield: 1, labels: ['Deep Fine Leg'] },
      2: { infield: 0, outfield: 1, labels: ['Deep Square Leg'] },
      3: { infield: 0, outfield: 1, labels: ['Deep Mid Wicket'] },
      4: { infield: 1, outfield: 1, labels: ['Mid On', 'Long On'] },
      5: { infield: 0, outfield: 1, labels: ['Long Off'] },
      6: { infield: 1, outfield: 0, labels: ['Deep Cover (Up)'] },
      7: { infield: 1, outfield: 0, labels: ['Point'] },
      8: { infield: 1, outfield: 0, labels: ['Deep Third Man (Up)'] }
    }
  }
};

export function getZoneFielding(fieldPreset = 'Balanced', isPowerplay = false, zoneNum = 4) {
  const presetKey = ['Balanced', 'Attacking', 'Defensive'].find(p => p.toLowerCase() === (fieldPreset || '').toLowerCase()) || 'Balanced';
  const ppKey = isPowerplay ? 'powerplay' : 'normal';
  const zNum = Number(zoneNum) || 4;
  const cfg = (FIELD_PRESET_CONFIGS[presetKey] && FIELD_PRESET_CONFIGS[presetKey][ppKey] && FIELD_PRESET_CONFIGS[presetKey][ppKey][zNum]) || { infield: 0, outfield: 0, labels: [] };
  return {
    infield: cfg.infield,
    outfield: cfg.outfield,
    total: cfg.infield + cfg.outfield,
    labels: cfg.labels
  };
}

export function getPlayerBattingPosition(player, db = null) {
  let orderSetting = player?.batting_order || 'auto';
  if ((!orderSetting || orderSetting === 'auto') && db && player?.discord_id) {
    try {
      const ps = db.prepare('SELECT batting_order FROM player_settings WHERE player_id = ?').get(player.discord_id);
      if (ps && ps.batting_order) orderSetting = ps.batting_order;
    } catch (_) {}
  }
  if (orderSetting === 'opener') {
    return { targetWickets: 0, battingPos: 1, label: 'Opener (No. 1)' };
  }
  if (orderSetting === 'top_order') {
    return { targetWickets: 1, battingPos: 3, label: 'Top Order (No. 3)' };
  }
  if (orderSetting === 'middle_order') {
    return { targetWickets: 2, battingPos: 4, label: 'Middle Order (No. 4)' };
  }
  if (orderSetting === 'finisher') {
    return { targetWickets: 3, battingPos: 5, label: 'Finisher (No. 5)' };
  }
  if (orderSetting === 'lower_order') {
    return { targetWickets: 4, battingPos: 6, label: 'Lower Order (No. 6)' };
  }
  const role = (player?.primary_role || '').toLowerCase();
  if (role.includes('bowler')) {
    return { targetWickets: 6, battingPos: 8, label: 'Tailender (No. 8)' };
  }
  if (role.includes('all-rounder') || role.includes('allrounder')) {
    return { targetWickets: 3, battingPos: 5, label: 'Finisher (No. 5)' };
  }
  if (role.includes('wicket') || role.includes('keeper')) {
    return { targetWickets: 1, battingPos: 3, label: 'Top Order (No. 3)' };
  }
  return { targetWickets: 0, battingPos: 1, label: 'Opener (No. 1)' };
}

export function getDerivedShotName(footwork, intent, zone) {
  if (footwork === 'Leave') return 'Leave Ball';
  const isOffSide = ['Third Man', 'Point', 'Cover', 'Long Off'].includes(zone);
  const isLegSide = ['Long On', 'Mid Wicket', 'Square Leg', 'Fine Leg'].includes(zone);

  if (intent === 'Push') {
    if (footwork === 'Front Foot') return isOffSide ? 'Forward Push (Off)' : 'Forward Push (Leg)';
    if (footwork === 'Back Foot') return isOffSide ? 'Back Foot Punch' : 'Back Foot Tuck';
    if (footwork === 'Advanced') return 'Stepped-out Push';
  } else if (intent === 'Stroke') {
    if (zone === 'Cover') return 'Cover Drive';
    if (zone === 'Long Off') return 'Straight Off-Drive';
    if (zone === 'Long On') return 'On-Drive';
    if (zone === 'Mid Wicket') return footwork === 'Back Foot' ? 'Pull Shot' : 'Flick to Mid-Wicket';
    if (zone === 'Square Leg') return footwork === 'Back Foot' ? 'Square Pull' : 'Leg Glance';
    if (zone === 'Fine Leg') return footwork === 'Back Foot' ? 'Hook Shot' : 'Fine Glance';
    if (zone === 'Point') return footwork === 'Back Foot' ? 'Square Cut' : 'Drive through Point';
    if (zone === 'Third Man') return footwork === 'Back Foot' ? 'Late Cut' : 'Steered to Third Man';
  } else if (intent === 'Loft') {
    if (zone === 'Cover') return 'Lofted Cover Drive';
    if (zone === 'Long Off') return 'Lofted Straight Drive';
    if (zone === 'Long On') return 'Lofted On-Drive';
    if (zone === 'Mid Wicket') return footwork === 'Advanced' ? 'Dancing Slog over Mid-Wicket' : 'Slog Sweep / Pull';
    if (zone === 'Square Leg') return 'Slog over Square Leg';
    if (zone === 'Fine Leg') return 'Ramp / Scoop over Fine Leg';
    if (zone === 'Point') return footwork === 'Back Foot' ? 'Upper Cut over Point' : 'Aerial Slash over Point';
    if (zone === 'Third Man') return footwork === 'Back Foot' ? 'Upper Cut to Third Man' : 'Lofted Slash to Third Man';
  }
  return `${intent || 'Stroke'} towards ${zone || 'Long On'}`;
}

export function simulateBallAdvanced({
  bowlerInput,
  batterInput,
  timingResult,
  playerAttrs,
  eqBonuses,
  activeSkills,
  confidence,
  bowlerSkill,
  isFreeHit,
  isClutch,
  isPowerplay,
  pitch = 'Balanced Sporting Pitch'
}) {
  let runs = 0;
  let wicket = false;
  let dismissalType = 'not out';
  let commentary = '';
  let outcomeType = 'Dot';
  let nextIsFreeHit = false;
  let rebowl = false;

  const { line, length, variation, speed, fieldPreset } = bowlerInput;
  const { targetZone, intent, shotType, stanceCommitment, stance, footwork, zone } = batterInput;

  // Resolve new and legacy parameters
  const effectiveZone = zone || targetZone || 'Long On';
  const effectiveFootwork = footwork || (stanceCommitment?.startsWith('Forward') ? 'Front Foot' : 'Back Foot');
  const isOffSideZone = ['Third Man', 'Point', 'Cover', 'Long Off'].includes(effectiveZone);
  const effectiveStance = stance || (stanceCommitment?.endsWith('Off') ? 'Off Side' : (stanceCommitment?.endsWith('Leg') ? 'Leg Side' : (isOffSideZone ? 'Off Side' : 'Leg Side')));
  const effectiveIntent = intent || (shotType === 'Defensive Shot' ? 'Push' : (shotType === 'Lofted Drive' ? 'Loft' : 'Stroke'));
  const equippedShot = batterInput.equippedShot || null;
  const effectiveShot = equippedShot ? `${equippedShot.num} ${equippedShot.name}` : (shotType || getDerivedShotName(effectiveFootwork, effectiveIntent, effectiveZone));

  // Yorker Miss/Full Toss Mechanic
  let actualLength = length;
  let bowlerMissText = '';

  if (length === 'Yorker') {
    const accuracy = bowlerSkill || 50;
    const missChance = Math.max(0.05, 0.40 - (accuracy / 250));
    if (Math.random() < missChance) {
      actualLength = Math.random() < 0.5 ? 'Full' : 'Full Toss';
      bowlerMissText = `⚠️ Bowler attempted a Yorker but missed the length, releasing a juicy ${actualLength}! `;
    }
  }

  // Handle LEAVE (either Footwork Leave or Intent Leave)
  if (effectiveFootwork === 'Leave' || intent === 'Leave') {
    const isFrontFoot = footwork === 'Front Foot' || (!footwork && effectiveFootwork === 'Leave');
    const isBackFoot = footwork === 'Back Foot';
    const isAdvanced = footwork === 'Advanced';

    if (line === 'Stumps' && actualLength !== 'Short') {
      if (!isFreeHit) {
        wicket = true;
        dismissalType = (actualLength === 'Yorker' || actualLength === 'Full') ? 'bowled' : (Math.random() < 0.5 ? 'bowled' : 'lbw');
        if (isAdvanced) {
          dismissalType = 'stumped';
          commentary = `💔 STUMPED! Charged out on the front foot and left the delivery! The keeper whips off the bails in a flash! Out!`;
        } else if (dismissalType === 'bowled') {
          if (equippedShot) {
            commentary = `💔 BOWLED! Attempted a **${equippedShot.name}**, but misjudged the line as the ball crashed into off-stump! Clean bowled!`;
          } else {
            commentary = isBackFoot
              ? `💔 BOWLED! Left alone on the back foot, but the delivery crashed directly into off-stump! Clean bowled!`
              : `💔 BOWLED! Shouldered arms on the front foot to a ball directed straight at the stumps! Clean bowled!`;
          }
        } else {
          commentary = `💔 LBW! Left the ball on a good length, struck plumb in front of middle stump! Out!`;
        }
        outcomeType = 'Out';
      } else {
        runs = 0;
        commentary = `⚠️ Left alone on the stumps on a FREE HIT! The bails fly off but you are NOT OUT! Dot ball.`;
        outcomeType = 'Dot';
      }
    } else if (line === 'Wide') {
      runs = 1;
      rebowl = true;
      commentary = `🧘 Masterclass leave! The ball lands well outside the tramlines. WIDE called by the umpire! +1 Run.`;
      outcomeType = 'Run';
    } else if (actualLength === 'Short') {
      runs = 0;
      if (equippedShot) {
        commentary = `🧘 **${equippedShot.name}:** ${equippedShot.desc} Safely through to the keeper. Dot ball.`;
      } else if (isBackFoot) {
        commentary = `🧘 Back Foot Leave! Arched the back and ducked under the steep bouncer with textbook precision! Dot ball.`;
      } else {
        commentary = `🧘 Ducked smoothly underneath the bouncer! Safely through into the keeper's gloves. Dot ball.`;
      }
      outcomeType = 'Dot';
    } else {
      runs = 0;
      if (equippedShot) {
        commentary = `🧘 **${equippedShot.name}:** ${equippedShot.desc} Dot ball.`;
      } else if (isBackFoot) {
        commentary = `🧘 Back Foot Leave! Stepped deep into the crease, gave the delivery a wide berth and watched it sail into the keeper's gloves. Dot ball.`;
      } else if (isAdvanced) {
        commentary = `🧘 Advanced Leave! Stepped out of the crease, read the spin drift, and padded/left the ball safely away from the stumps. Dot ball.`;
      } else {
        commentary = `🧘 Front Foot Leave! High front elbow, bending onto the knee, shouldered arms cleanly outside off-stump. Ball through to the keeper. Dot ball.`;
      }
      outcomeType = 'Dot';
    }

    return {
      runs,
      wicket,
      dismissalType,
      commentary,
      timing: 'Left Alone',
      matchupStar: 3,
      outcomeType,
      nextIsFreeHit,
      rebowl
    };
  }

  // Stance & Footwork Evaluation
  let adjustedTiming = timingResult;
  let stanceMatch = true;
  let stancePenaltyText = '';
  let matchupStar = 3;

  // Physical & Technical Compatibility Checks
  const isPull = effectiveShot.toLowerCase().includes('pull') || effectiveShot.toLowerCase().includes('hook') || (effectiveFootwork === 'Back Foot' && ['Mid Wicket', 'Square Leg', 'Fine Leg'].includes(effectiveZone) && effectiveIntent !== 'Push');
  const vLower = (variation || '').toLowerCase();
  const isDeceivedByPace = (speed === 'Slow' || vLower.includes('slower') || vLower.includes('knuckle') || vLower.includes('cutter') || vLower.includes('flipper') || vLower.includes('carrom'));
  const isBackFootToFull = effectiveFootwork === 'Back Foot' && (actualLength === 'Full' || actualLength === 'Yorker') && effectiveIntent !== 'Push';
  const isFrontFootToShort = effectiveFootwork === 'Front Foot' && actualLength === 'Short' && effectiveIntent !== 'Push';
  const isCreaseLoftToYorker = effectiveFootwork !== 'Advanced' && effectiveIntent === 'Loft' && actualLength === 'Yorker';
  const isPullOnFullOrYorker = isPull && (actualLength === 'Full' || actualLength === 'Yorker');
  const isCrossLineDrag = (line === 'Off Side' || line === 'Wide') && ['Mid Wicket', 'Square Leg', 'Fine Leg'].includes(effectiveZone);

  // Calculate Mismatch Severity
  let mismatchSeverity = 0;
  if (isPullOnFullOrYorker) mismatchSeverity += 2.0;
  if (isBackFootToFull && !isPullOnFullOrYorker) mismatchSeverity += 1.5;
  if (isCrossLineDrag) mismatchSeverity += 1.5;
  if (isDeceivedByPace && (isBackFootToFull || isPullOnFullOrYorker)) mismatchSeverity += 1.5;
  if (isFrontFootToShort) mismatchSeverity += 2.0;
  if (isCreaseLoftToYorker) mismatchSeverity += 2.0;

  const isSevereMismatch = mismatchSeverity >= 2.5;
  const isModerateMismatch = mismatchSeverity >= 1.5;

  // Stance check
  if (effectiveStance === 'Off Side') {
    if (line === 'Off Side' || line === 'Wide') matchupStar += 0.75;
    else if (line === 'Leg Side') { stanceMatch = false; stancePenaltyText += 'Covered off-stump but exposed to leg-side! '; }
  } else if (effectiveStance === 'Leg Side') {
    if (line === 'Leg Side') matchupStar += 0.75;
    else if (line === 'Off Side' || line === 'Wide') { stanceMatch = false; stancePenaltyText += 'Guarded leg-side but delivery was outside off! '; }
  } else if (effectiveStance === 'In Line') {
    matchupStar += 0.5; // Balanced
  }

  // Footwork check
  if (effectiveFootwork === 'Front Foot') {
    if (actualLength === 'Good Length' || actualLength === 'Full' || actualLength === 'Yorker' || actualLength === 'Full Toss') {
      matchupStar += 1.0;
    } else if (actualLength === 'Short') {
      stanceMatch = false;
      stancePenaltyText += 'Committed to front foot against a short bouncer! ';
    }
  } else if (effectiveFootwork === 'Back Foot') {
    if (actualLength === 'Short') {
      matchupStar += 1.5;
    } else if (actualLength === 'Yorker' || actualLength === 'Full') {
      stanceMatch = false;
      stancePenaltyText += 'Stuck on the back foot against a fuller delivery! ';
    }
  } else if (effectiveFootwork === 'Advanced') {
    if (actualLength === 'Yorker') {
      actualLength = Math.random() < 0.6 ? 'Full Toss' : 'Full';
      matchupStar += 1.25;
      bowlerMissText += '⚡ Stepped out of the crease to intercept the Yorker on the full! ';
    } else if (actualLength === 'Good Length' || actualLength === 'Full') {
      matchupStar += 1.5;
    } else if (actualLength === 'Short') {
      matchupStar += 0.75;
      bowlerMissText += '⚡ Stepped out boldly to take the bouncer on the rise! ';
    } else if (actualLength === 'Full Toss') {
      matchupStar += 1.5;
    }
  }

  if (!stanceMatch) {
    matchupStar -= 1.0;
  }

  // Handle Severe Technical Mismatches (e.g. Back Foot Pull to Slow Full ball outside off)
  if (isSevereMismatch) {
    matchupStar = 1.0;
    if (adjustedTiming === 'Perfect') {
      adjustedTiming = isDeceivedByPace ? 'Very Early' : (Math.random() < 0.6 ? 'Very Early' : 'Slightly Early');
    } else if (adjustedTiming.includes('Slightly') && isDeceivedByPace) {
      adjustedTiming = 'Very Early';
    }

    if (adjustedTiming.includes('Very')) {
      if (isFreeHit) {
        runs = 0;
        commentary = `💨 Horrible technical mismatch! Reached across the line blindly, but saved by the FREE HIT! Dot ball.`;
        outcomeType = 'Dot';
      } else {
        const outRoll = Math.random() * 100;
        if (outRoll < 60) {
          wicket = true;
          const roll = Math.random() * 100;
          if (isPullOnFullOrYorker && isCrossLineDrag) {
            if (roll < 65) {
              dismissalType = 'caught';
              commentary = `💔 CAUGHT! Atrocious shot selection! Reached out on the back foot to pull a ${speed.toLowerCase()} delivery full outside off. Skied a helpless top edge caught easily in the covers!`;
            } else {
              dismissalType = 'bowled';
              commentary = `💔 BOWLED! Attempted to pull a full delivery from outside off from deep in the crease! Thick bottom edge chops right onto off-stump!`;
            }
          } else if (isFrontFootToShort) {
            dismissalType = 'caught';
            commentary = `💔 CAUGHT! Blindly pushed on the front foot to a sharp bouncer! Ball ballooned off the shoulder of the bat straight to mid-on!`;
          } else if (isCreaseLoftToYorker) {
            dismissalType = 'bowled';
            commentary = `💔 BOWLED! Tried to loft a spearing Yorker from deep inside the crease! Beaten between bat and pad as the bails fly!`;
          } else if (actualLength === 'Yorker' || actualLength === 'Full') {
            dismissalType = 'bowled';
            commentary = `💔 BOWLED! Stuck on the back foot against a full delivery, missed the line completely! Clean bowled!`;
          } else {
            dismissalType = 'caught';
            commentary = `💔 CAUGHT! Egregious footwork mismatch results in a wretched skier, taken comfortably!`;
          }
          outcomeType = 'Out';
        } else {
          runs = 0;
          outcomeType = 'Dot';
          if (isPullOnFullOrYorker) {
            commentary = `💨 Beaten by flight & lack of pace! Stepped back to pull, but the delivery was too full and slow outside off. Swung through way too early and missed it completely! Dot ball.`;
          } else if (isFrontFootToShort) {
            commentary = `💨 Beaten by steep bounce! Stood tall on the front foot to drive a bouncer, but the ball whistled past helmet into keeper's gloves. Dot ball.`;
          } else {
            commentary = `💨 Completely deceived by the delivery! Swung wildly across the line and missed it by a mile. Dot ball.`;
          }
        }
      }
      return {
        runs,
        wicket,
        dismissalType,
        commentary,
        timing: adjustedTiming,
        matchupStar,
        outcomeType,
        nextIsFreeHit,
        rebowl
      };
    } else {
      // Slightly mistimed on severe mismatch: CAN NEVER BE 2+ RUNS OR BOUNDARY!
      const catchRoll = Math.random() * 100;
      if (!isFreeHit && catchRoll < 45) {
        wicket = true;
        dismissalType = 'caught';
        if (isPullOnFullOrYorker) {
          commentary = `💔 CAUGHT! Sliced off the toe-end! Reached across to pull a slow, full ball from the back foot and looped a soft catch to the infielder!`;
        } else if (isFrontFootToShort) {
          commentary = `💔 CAUGHT! Pushed on the front foot to a bouncer, looped off the splice to short mid-wicket!`;
        } else {
          commentary = `💔 CAUGHT! Completely deceived by line and length, giving a simple catch to the infield!`;
        }
        outcomeType = 'Out';
      } else if (Math.random() < 0.70) {
        runs = 0;
        outcomeType = 'Dot';
        if (isPullOnFullOrYorker) {
          commentary = `⚠️ Bottom-edged into the pitch! Attempted a back-foot pull against a full delivery outside off. Bounces into the turf, no run.`;
        } else if (isFrontFootToShort) {
          commentary = `💨 Beaten by steep bounce! Tried to drive a bouncer on the front foot; whistled past helmet into keeper's gloves. Dot ball.`;
        } else {
          commentary = `💨 Completely beaten by the movement and lack of pace. Swung through awkwardly, dot ball.`;
        }
      } else {
        runs = 1;
        outcomeType = 'Run';
        if (isPullOnFullOrYorker) {
          commentary = `🏃 Thick edge squirts away! Completely mistimed the back-foot pull against the slow full ball; trickles past slip for a scramble single.`;
        } else {
          commentary = `🏃 Awkwardly squirted off the toe-end into the gap for a single.`;
        }
      }
      return {
        runs,
        wicket,
        dismissalType,
        commentary,
        timing: adjustedTiming,
        matchupStar,
        outcomeType,
        nextIsFreeHit,
        rebowl
      };
    }
  }

  if (isModerateMismatch && !stanceMatch && matchupStar < 2.5) {
    matchupStar = Math.min(matchupStar, 2.0);
    if (adjustedTiming === 'Perfect' && Math.random() < 0.20) {
      adjustedTiming = Math.random() < 0.5 ? 'Slightly Early' : 'Slightly Late';
    }
  }

  // 1. Evaluate Matchup Quality (Star rating: 1 to 5)
  const zoneNum = ZONE_MAP[effectiveZone] || parseInt(String(effectiveZone).replace(/\D/g, '')) || 4;
  if (line === 'Leg Side') {
    if ([1, 2, 3, 4].includes(zoneNum)) matchupStar += 0.75;
    if ([6, 7, 8].includes(zoneNum)) matchupStar -= 1.25;
  } else if (line === 'Off Side' || line === 'Wide') {
    if ([5, 6, 7, 8].includes(zoneNum)) matchupStar += 0.75;
    if ([1, 2].includes(zoneNum)) matchupStar -= 1.25;
  } else if (line === 'Stumps') {
    if ([3, 4, 5, 6].includes(zoneNum)) matchupStar += 0.5;
  }

  // Intent Bonus/Penalty
  if (effectiveIntent === 'Push') {
    matchupStar += 0.5;
  } else if (effectiveIntent === 'Loft') {
    if (actualLength === 'Yorker') matchupStar -= 1.5;
    if (actualLength === 'Full' || actualLength === 'Full Toss') matchupStar += 1.0;
  }

  // 2. Pitch condition dynamics for batting
  let powerVal = (playerAttrs.power || 50) + (eqBonuses.power || 0);
  const techVal = (playerAttrs.technique || 50) + (eqBonuses.technique || 0);
  const pLower = (pitch || '').toLowerCase();
  let pitchModifierText = '';

  if (pLower.includes('flat') || pLower.includes('belter')) {
    powerVal += 15;
    matchupStar += 0.5;
  } else if (pLower.includes('green') || pLower.includes('seam')) {
    if (effectiveIntent === 'Push' || effectiveFootwork === 'Leave') {
      matchupStar += 0.5;
    } else if (effectiveIntent === 'Loft' && actualLength === 'Good Length') {
      matchupStar -= 0.5;
      if (techVal < 60 && Math.random() < 0.35 && !isFreeHit) {
        if (adjustedTiming === 'Perfect') {
          adjustedTiming = 'Slightly Late';
          pitchModifierText = '🌱 Seaming deck! Late movement off the seam took the outside half of the bat! ';
        }
      }
    }
  } else if (pLower.includes('dry') || pLower.includes('dust') || pLower.includes('turn') || pLower.includes('spin')) {
    const isSpinDelivery = ['Traditional Off-Break', 'Looping Leg-Break', 'Deceptive Googly', 'Mysterious Doosra', 'Flicked Carrom Ball', 'Skidding Flipper', 'Arm Ball', 'Bouncy Top-Spinner'].includes(variation);
    if (isSpinDelivery) {
      if (effectiveFootwork === 'Advanced') {
        matchupStar += 0.75;
        pitchModifierText = '🌀 Stepped out brilliantly to smother the turn off the dusty deck! ';
      } else if (effectiveIntent === 'Stroke' && ['Mid Wicket', 'Square Leg', 'Fine Leg'].includes(effectiveZone)) {
        matchupStar += 0.5;
      } else if (effectiveFootwork === 'Back Foot' && (actualLength === 'Full' || actualLength === 'Good Length')) {
        matchupStar -= 0.75;
        if (techVal < 60 && Math.random() < 0.30 && !isFreeHit && adjustedTiming === 'Perfect') {
          adjustedTiming = 'Slightly Early';
          pitchModifierText = '⚠️ Held up in the dust! Spun sharply past your back-foot defense! ';
        }
      }
    }
  } else if (pLower.includes('bounc') || pLower.includes('clay') || pLower.includes('hard')) {
    if (actualLength === 'Short') {
      if (effectiveFootwork === 'Back Foot' && (effectiveIntent === 'Stroke' || effectiveIntent === 'Loft')) {
        powerVal += 20;
        matchupStar += 0.75;
        pitchModifierText = '⚡ Capitalized on the steep, true bounce off the deck! ';
      } else if (effectiveFootwork === 'Front Foot') {
        matchupStar -= 1.0;
        pitchModifierText = '⚠️ Fierce bounce climbed sharply over your front-foot stroke! ';
      }
    }
  } else if (pLower.includes('damp') || pLower.includes('slow') || pLower.includes('sticky')) {
    if (effectiveIntent === 'Loft') {
      matchupStar -= 0.5;
      powerVal -= 15;
      if (adjustedTiming === 'Perfect' && Math.random() < 0.35) {
        adjustedTiming = 'Slightly Early';
        pitchModifierText = '🌱 The ball gripped and held up in the damp surface! ';
      }
    } else if (effectiveIntent === 'Push') {
      matchupStar += 0.5;
    }
  }

  matchupStar = Math.min(5, Math.max(1, matchupStar));

  // 3. Timing Outcome Simulation
  if (adjustedTiming.includes('Very')) {
    // MISS
    if (isFreeHit) {
      runs = 0;
      commentary = `💨 Completely beaten! Stumps hit but it's a FREE HIT, so you're safe! Dot ball.`;
      outcomeType = 'Dot';
    } else {
      wicket = true;
      const roll = Math.random() * 100;
      if (effectiveFootwork === 'Advanced' && roll < 70) {
        dismissalType = 'stumped';
        commentary = `💔 STUMPED! Charged down the track and swung wildly, completely missing the ball! The keeper whips off the bails in a flash!`;
      } else if (actualLength === 'Yorker' || actualLength === 'Full' || actualLength === 'Full Toss') {
        if (roll < 60) {
          dismissalType = 'bowled';
          commentary = `💔 BOWLED! Yorker spears right under your bat. Stumps shattered!`;
        } else {
          dismissalType = 'lbw';
          commentary = `💔 LBW! Struck right on the pads in front of middle stump. Out!`;
        }
      } else if (actualLength === 'Short') {
        dismissalType = 'caught';
        commentary = `💔 CAUGHT! A hurried pull shot results in a top edge falling straight into the keeper's gloves.`;
      } else {
        if (roll < 50) {
          dismissalType = 'bowled';
          commentary = `💔 BOWLED! Beaten by the bounce, the ball clips the top of off-stump!`;
        } else {
          dismissalType = 'caught';
          commentary = `💔 CAUGHT BEHIND! Outside edge into the wicket-keeper's hands!`;
        }
      }
      outcomeType = 'Out';
    }
  } else if (adjustedTiming.includes('Slightly')) {
    // CONNECTS BUT REDUCED QUALITY
    let finalZone = zoneNum;
    if (Math.random() < 0.5) {
      const shift = Math.random() < 0.5 ? -1 : 1;
      finalZone = ((zoneNum - 1 + shift + 8) % 8) + 1;
    }
    const zoneFielding = getZoneFielding(fieldPreset, isPowerplay, finalZone);
    const zName = ZONE_NAMES[finalZone] || `Zone ${finalZone}`;

    if (effectiveIntent === 'Push' || intent === 'Defensive' || intent === 'Defensive Shot') {
      runs = 0;
      commentary = `🛡️ Played defensively with slightly off-timing. Safely blocked. Dot ball.`;
      outcomeType = 'Dot';
    } else {
      const isLofted = effectiveIntent === 'Loft' || 
                       intent === 'Loft' || 
                       shotType === 'Lofted Drive' || 
                       shotType === 'Slog Sweep' || 
                       shotType === 'Hook Shot' || 
                       effectiveShot.toLowerCase().includes('loft') || 
                       effectiveShot.toLowerCase().includes('slog') ||
                       effectiveShot.toLowerCase().includes('hook') ||
                       effectiveShot.toLowerCase().includes('six');
      const catchRoll = Math.random() * 100;

      if (isLofted) {
        if (zoneFielding.infield > 0) {
          if (catchRoll < 45 && !isFreeHit) {
            wicket = true;
            dismissalType = 'caught';
            const catcher = zoneFielding.labels.filter(l => !l.startsWith('Deep') && !l.startsWith('Long')).join(' / ') || 'infielder';
            commentary = `💔 CAUGHT! Mistimed in the air. Taken comfortably by ${catcher} inside the circle in Zone ${finalZone} (${zName})!`;
            outcomeType = 'Out';
          } else {
            runs = 1;
            commentary = `🏏 Sliced aerially towards Zone ${finalZone} (${zName}). It evades the fielder inside the circle and drops safely for a single.`;
            outcomeType = 'Run';
          }
        } else if (zoneFielding.outfield > 0) {
          if (catchRoll < 35 && !isFreeHit) {
            wicket = true;
            dismissalType = 'caught';
            const catcher = zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'deep fielder';
            commentary = `💔 CAUGHT! Sliced high into the deep. ${catcher} runs under it and takes a safe catch in Zone ${finalZone} (${zName})!`;
            outcomeType = 'Out';
          } else {
            runs = (matchupStar > 2.0) ? 2 : 1;
            commentary = `🏏 Lofted safely into the deep pocket in Zone ${finalZone} (${zName}) for ${runs} runs.`;
            outcomeType = 'Run';
          }
        } else {
          // Vacant Zone!
          if (matchupStar >= 2.5 && powerVal >= 45) {
            runs = 4;
            commentary = `🔥 FOUR! Mistimed slightly, but with Zone ${finalZone} (${zName}) completely vacant, the ball runs all the way to the rope!`;
            outcomeType = 'Four';
          } else {
            runs = (isModerateMismatch || matchupStar <= 2.0) ? 1 : 2;
            commentary = `🏃 Sliced into the empty Zone ${finalZone} (${zName}) for ${runs} runs.`;
            outcomeType = 'Run';
          }
        }
      } else {
        // Ground shot
        if (zoneFielding.infield > 0) {
          if (matchupStar >= 3.0 && Math.random() < 0.55) {
            runs = 1;
            commentary = `🏃 Pushed off the splice past ${zoneFielding.labels[0] || 'the fielder'} in Zone ${finalZone} (${zName}) for a quick single.`;
            outcomeType = 'Run';
          } else {
            runs = 0;
            commentary = `💥 Hit on the bounce to ${zoneFielding.labels[0] || 'the fielder'} in Zone ${finalZone} (${zName}), blocked cleanly. Dot ball.`;
            outcomeType = 'Dot';
          }
        } else if (zoneFielding.outfield > 0) {
          runs = 1;
          commentary = `🏏 Driven past the vacant ring towards the deep fielder in Zone ${finalZone} (${zName}) for a single.`;
          outcomeType = 'Run';
        } else {
          // Completely vacant
          if (matchupStar >= 2.5 && powerVal >= 40) {
            runs = 4;
            commentary = `🔥 FOUR! Placed through the completely vacant Zone ${finalZone} (${zName}) along the turf for a boundary!`;
            outcomeType = 'Four';
          } else {
            runs = (matchupStar >= 3.0) ? 2 : 1;
            commentary = `🏃 Placed through the vacant Zone ${finalZone} (${zName}) along the turf for ${runs} runs.`;
            outcomeType = 'Run';
          }
        }
      }
    }
  } else {
    // PERFECT TIMING!
    const finalZone = zoneNum;
    const zoneFielding = getZoneFielding(fieldPreset, isPowerplay, finalZone);
    const zName = ZONE_NAMES[finalZone] || `Zone ${finalZone}`;

    const isLofted = effectiveIntent === 'Loft' || 
                     intent === 'Loft' || 
                     shotType === 'Lofted Drive' || 
                     shotType === 'Slog Sweep' || 
                     shotType === 'Hook Shot' || 
                     effectiveShot.toLowerCase().includes('loft') || 
                     effectiveShot.toLowerCase().includes('slog') || 
                     effectiveShot.toLowerCase().includes('hook') || 
                     effectiveShot.toLowerCase().includes('six');

    if (effectiveIntent === 'Push' || intent === 'Defensive' || intent === 'Defensive Shot') {
      if (zoneFielding.infield > 0) {
        runs = Math.random() < 0.4 ? 1 : 0;
        commentary = runs === 1
          ? `🛡️ Soft hands defense. You guide it into the gap beside ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}) for a sharp single!`
          : `🛡️ Rock-solid defense straight to ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}). Dot ball.`;
        outcomeType = runs === 1 ? 'Run' : 'Dot';
      } else {
        runs = 1;
        commentary = `🛡️ Soft hands push into the vacant inner ring in Zone ${finalZone} (${zName})! Easy single taken.`;
        outcomeType = 'Run';
      }
    } else {
      let effectivePower = powerVal;
      if (matchupStar >= 4.5) {
        effectivePower += 25;
      } else if (matchupStar >= 4.0) {
        effectivePower += 15;
      } else if (matchupStar <= 2.0) {
        effectivePower -= 20;
      }

      if (isLofted) {
        if (zoneFielding.total === 0) {
          // Completely vacant zone
          if (effectivePower >= 40) {
            runs = 6;
            commentary = `🚀 SIX! Perfectly timed lofted shot into the completely vacant Zone ${finalZone} (${zName})! Sails way over the ropes!`;
            outcomeType = 'Six';
          } else {
            runs = 4;
            commentary = `🔥 FOUR! Lofted cleanly into the completely empty Zone ${finalZone} (${zName}) for a boundary!`;
            outcomeType = 'Four';
          }
        } else if (zoneFielding.outfield === 0) {
          // Infielders present, but NO boundary rider!
          if (effectivePower >= 55) {
            runs = 6;
            commentary = `🚀 SIX! Cleared the infield with supreme ease and sails way into the undefended stands in Zone ${finalZone} (${zName})!`;
            outcomeType = 'Six';
          } else if (effectivePower >= 30) {
            runs = 4;
            commentary = `🔥 FOUR! Lofted cleanly over the 30-yard circle into the empty deep grass in Zone ${finalZone} (${zName}) for four!`;
            outcomeType = 'Four';
          } else {
            // Underpowered loft into infield (< 30 power)
            const catchRoll = Math.random() * 100;
            if (catchRoll < 35 && !isFreeHit) {
              wicket = true;
              dismissalType = 'caught';
              const catcher = zoneFielding.labels.filter(l => !l.startsWith('Deep') && !l.startsWith('Long')).join(' / ') || 'infielder';
              commentary = `💔 CAUGHT! Chipped softly into the circle. ${catcher} accepts an easy catch in Zone ${finalZone} (${zName})!`;
              outcomeType = 'Out';
            } else {
              runs = 1;
              commentary = `🏏 Chipped over the infielder in Zone ${finalZone} (${zName}) and lands safely for a single.`;
              outcomeType = 'Run';
            }
          }
        } else {
          // Deep fielder(s) present!
          const catchRoll = Math.random() * 100;
          if (effectivePower >= 85 && !isModerateMismatch) {
            if (catchRoll < 12 && !isFreeHit) {
              wicket = true;
              dismissalType = 'caught';
              const catcher = zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'deep fielder';
              commentary = `💔 CAUGHT AT THE BOUNDARY! ${catcher} pulls off a spectacular leaping catch right on the rope in Zone ${finalZone} (${zName})!`;
              outcomeType = 'Out';
            } else {
              runs = 6;
              commentary = `🚀 SIX! Massive strike! Timed to perfection, it sails way over ${zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'the deep fielder'} in Zone ${finalZone} (${zName})!`;
              outcomeType = 'Six';
            }
          } else if (effectivePower >= 60 && !isModerateMismatch) {
            if (catchRoll < 30 && !isFreeHit) {
              wicket = true;
              dismissalType = 'caught';
              const catcher = zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'deep fielder';
              commentary = `💔 CAUGHT! Struck well, but picked out ${catcher} right on the boundary in Zone ${finalZone} (${zName})!`;
              outcomeType = 'Out';
            } else {
              runs = 4;
              commentary = `🔥 FOUR! Lofted over ${zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'the fielder'} in Zone ${finalZone} (${zName}) and one-bounces over the rope!`;
              outcomeType = 'Four';
            }
          } else {
            // Power < 60
            if (catchRoll < 50 && !isFreeHit) {
              wicket = true;
              dismissalType = 'caught';
              if (effectivePower < 50 && zoneFielding.infield > 0) {
                const catcher = zoneFielding.labels.filter(l => !l.startsWith('Deep') && !l.startsWith('Long')).join(' / ') || 'infielder';
                commentary = `💔 CAUGHT! Lacks power and elevation. A comfortable catch for ${catcher} inside the circle in Zone ${finalZone} (${zName})!`;
              } else {
                const catcher = zoneFielding.labels.find(l => l.startsWith('Deep') || l.startsWith('Long')) || 'deep fielder';
                commentary = `💔 CAUGHT! Didn't get enough of it. Settles into the hands of ${catcher} in Zone ${finalZone} (${zName})!`;
              }
              outcomeType = 'Out';
            } else {
              runs = (isModerateMismatch || matchupStar <= 2.0) ? 1 : 2;
              commentary = `🏏 Lofted into no man's land in Zone ${finalZone} (${zName}) for ${runs} runs.`;
              outcomeType = 'Run';
            }
          }
        }
      } else {
        // Ground stroke
        if (zoneFielding.total === 0) {
          runs = 4;
          commentary = `🔥 FOUR! Stroked along the turf with perfect timing through the completely vacant Zone ${finalZone} (${zName})!`;
          outcomeType = 'Four';
        } else if (zoneFielding.infield === 0 && zoneFielding.outfield > 0) {
          if (effectivePower >= 45) {
            runs = 4;
            commentary = `🔥 FOUR! Driven crisply through the open ring in Zone ${finalZone} (${zName}), beating the deep fielder to the rope!`;
            outcomeType = 'Four';
          } else {
            runs = 2;
            commentary = `🏃 Stroked past the empty inner ring in Zone ${finalZone} (${zName}). The deep fielder cuts it off for two.`;
            outcomeType = 'Run';
          }
        } else if (zoneFielding.infield > 0) {
          if (zoneFielding.outfield === 0) {
            // Infielders present, but NO deep boundary rider!
            if (effectivePower >= 30) {
              runs = 4;
              commentary = `🔥 FOUR! Pierces the infield dive of ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}) and races away across the undefended boundary!`;
              outcomeType = 'Four';
            } else {
              runs = (matchupStar >= 3.0) ? 1 : 0;
              commentary = runs === 1
                ? `🏃 Soft hands past ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}) for a quick single.`
                : `💥 Struck straight to ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}). Dot ball.`;
              outcomeType = runs === 1 ? 'Run' : 'Dot';
            }
          } else {
            // Deep fielder present!
            if (effectivePower >= 75 && !isModerateMismatch) {
              runs = (effectivePower >= 85 || Math.random() < 0.6) ? 4 : 2;
              commentary = runs === 4
                ? `🔥 FOUR! Bludgeoned with extreme pace! Pierces both ${zoneFielding.labels[0]} and the deep fielder in Zone ${finalZone} (${zName})!`
                : `🏃 Crushed past the diving ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}), deep fielder keeps it to two runs.`;
              outcomeType = runs === 4 ? 'Four' : 'Run';
            } else if (effectivePower >= 50 && !isModerateMismatch && matchupStar > 2.5) {
              runs = (Math.random() < 0.5) ? 4 : 2;
              commentary = runs === 4
                ? `🔥 FOUR! Driven past ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}) and splits the deep fielders perfectly to the rope!`
                : `🏃 Placed neatly into the gap beside ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}) for 2 runs.`;
              outcomeType = runs === 4 ? 'Four' : 'Run';
            } else {
              runs = (matchupStar >= 3.5 && Math.random() < 0.45) ? 1 : 0;
              commentary = runs === 0
                ? `💥 Struck straight to ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}). Dot ball.`
                : `🏃 Pushed firmly to ${zoneFielding.labels[0]} in Zone ${finalZone} (${zName}). Sharp single taken.`;
              outcomeType = runs === 0 ? 'Dot' : 'Run';
            }
          }
        }
      }
    }
  }

  // 4. Random Extra Check (No ball or Wide - 4% chance total)
  let extraRuns = 0;
  if (Math.random() < 0.04 && !isFreeHit) {
    const extraRoll = Math.random();
    if (extraRoll < 0.5) {
      extraRuns = 1;
      rebowl = true;
      commentary = `🚨 WIDE! Spraying way outside the tramline. +1 extra. Ball must be rebowled.`;
      runs = 0;
      wicket = false;
      outcomeType = 'Extra';
    } else {
      extraRuns = 1;
      nextIsFreeHit = true;
      rebowl = true;
      runs = runs + (wicket ? 0 : 0);
      if (wicket) {
        wicket = false;
        commentary = `🚨 NO BALL! The bowler overstepped! You are NOT OUT! +1 run and FREE HIT coming up!`;
      } else {
        commentary = `🚨 NO BALL! Overstepped line. +1 run added. Free Hit unlocked for the next ball!\n${commentary}`;
      }
      outcomeType = 'Extra';
    }
  }

  let finalCommentary = '';
  if (pitchModifierText) finalCommentary += pitchModifierText;
  if (bowlerMissText) finalCommentary += bowlerMissText;
  if (stancePenaltyText) finalCommentary += `⚠️ ${stancePenaltyText}`;
  if (equippedShot && effectiveFootwork !== 'Leave' && outcomeType !== 'Extra') {
    finalCommentary += `🏏 **[${equippedShot.num} ${equippedShot.name}]** ${commentary}`;
  } else {
    finalCommentary += commentary;
  }

  return {
    runs: runs + extraRuns,
    wicket,
    dismissalType,
    timing: adjustedTiming,
    matchupStar,
    commentary: finalCommentary,
    outcomeType,
    nextIsFreeHit,
    rebowl
  };
}
