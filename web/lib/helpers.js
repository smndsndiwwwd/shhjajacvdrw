export function getPlayerTier(level) {
  if (level >= 19) return { name: 'International National Team', badge: '🟢 International', stipend: 500 };
  if (level >= 13) return { name: 'Domestic T20 Franchise', badge: '🟡 T20 Franchise', stipend: 250 };
  if (level >= 10) return { name: 'State League Division', badge: '🟠 State League', stipend: 100 };
  if (level >= 7) return { name: 'District Cricket Division', badge: '🔴 District', stipend: 70 };
  if (level >= 4) return { name: 'Local Club Cricket', badge: '🔵 Local Club', stipend: 45 };
  return { name: 'Academy Cricket', badge: '⚪ Academy', stipend: 20 };
}

export function generateStartingAttributes(role, bowlingStyle = '') {
  const base = {
    power: 10,
    timing: 10,
    technique: 10,
    spin: 10,
    pace: 10,
    fitness: 10,
    mentality: 10,
    aggression: 10,
    defense: 10,
    running: 10,
    fielding: 10,
    reflex: 10,
    throw_accuracy: 10,
    swing: 10,
    seam: 10,
    spin_bowling: 10,
    accuracy: 10,
    variations: 10,
    stamina: 10
  };

  const isSpin = (bowlingStyle || '').toLowerCase().includes('spin');

  if (role === 'Batsman') {
    base.power = 15;
    base.timing = 15;
    base.technique = 14;
    base.defense = 14;
    base.running = 12;
  } else if (role === 'Wicket-Keeper') {
    base.timing = 14;
    base.technique = 12;
    base.defense = 13;
    base.reflex = 15;
    base.fielding = 15;
    base.running = 13;
  } else if (role === 'Bowler') {
    base.accuracy = 15;
    base.variations = 13;
    base.stamina = 13;
    if (isSpin) {
      base.spin_bowling = 15;
      base.spin = 14;
    } else {
      base.pace = 15;
      base.swing = 14;
      base.seam = 14;
    }
  } else if (role === 'All-Rounder') {
    base.timing = 13;
    base.power = 12;
    base.accuracy = 13;
    base.fitness = 12;
    base.stamina = 12;
    if (isSpin) {
      base.spin_bowling = 13;
    } else {
      base.swing = 13;
    }
  }

  return base;
}

export const PITCH_TYPES = [
  'Flat Belter (Batting Paradise)',
  'Balanced Sporting Pitch',
  'Green Seamer (Pace & Swing)',
  'Dry Turning Track (Spin Heaven)',
  'Bouncy Clay Deck (Steep Bounce)',
  'Damp Slow Track (Sticky Pitch)'
];
