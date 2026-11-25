import { academies } from './academies.js';

export const chapters = [
  // === ACADEMY LEVEL (1-5) ===
  {
    id: 1,
    name: 'Academy Nets Induction',
    description: 'Face the academy bowling machine on a flat deck to demonstrate basic batting competence.',
    opponent: 'Academy Bowling Machine',
    difficulty: 'Very Easy',
    bowlerSkill: 12,
    pitchCondition: 'Flat & Hard',
    objective: { type: 'runs', target: 8, balls: 6 },
    rewards: { xp: 120, coins: 50, message: 'Unlocked the "Pull" shot! Use it against short-pitched deliveries.' }
  },
  {
    id: 2,
    name: 'Academy Junior Drills',
    description: 'Face gentle slow-medium balls in the outdoor nets to work on footwork.',
    opponent: 'Academy Junior Bowler',
    difficulty: 'Very Easy',
    bowlerSkill: 15,
    pitchCondition: 'Even Turf',
    objective: { type: 'runs', target: 12, balls: 10 },
    rewards: { xp: 150, coins: 60, message: 'Practice makes perfect.' }
  },
  {
    id: 3,
    name: 'Academy Reserves Trial',
    description: 'Chase down a modest score set by the reserves squad in a friendly practice simulation.',
    opponent: 'Academy Reserves XI',
    difficulty: 'Easy',
    bowlerSkill: 18,
    pitchCondition: 'Green Grass',
    objective: { type: 'runs', target: 16, balls: 12 },
    rewards: {
      xp: 200,
      coins: 100,
      itemUnlock: {
        item_id: 'willow_starter',
        name: 'Willow Starter Bat',
        type: 'Bat',
        rarity: 'Common',
        bonuses: { power: 3, timing: 2 }
      },
      message: 'Unlocked the "Willow Starter Bat" (+3 Power, +2 Timing)!'
    }
  },
  {
    id: 4,
    name: 'Coach Special Selection',
    description: 'Face the academy bowling machine on a turning deck to prove you can handle spin.',
    opponent: 'Academy Spin Machine',
    difficulty: 'Easy',
    bowlerSkill: 20,
    pitchCondition: 'Dry & Turning',
    objective: { type: 'runs', target: 18, balls: 10 },
    rewards: { xp: 250, coins: 120, message: 'Excellent control against turning deliveries.' }
  },
  {
    id: 5,
    name: 'Academy Intra-Squad Cup',
    description: 'The final academy assessment. Hit boundaries off the senior squad fast bowler to earn your graduation.',
    opponent: 'Academy Senior Speedster',
    difficulty: 'Easy',
    bowlerSkill: 22,
    pitchCondition: 'Hard Bouncy Clay',
    objective: { type: 'runs', target: 20, balls: 10 },
    rewards: {
      xp: 300,
      coins: 150,
      itemUnlock: {
        item_id: 'leather_grip',
        name: 'Premium Leather Grip',
        type: 'Grip',
        rarity: 'Common',
        bonuses: { technique: 4 }
      },
      message: 'Unlocked the "Premium Leather Grip" (+4 Technique)!'
    }
  },

  // === LOCAL CLUB LEVEL (6-12) ===
  {
    id: 6,
    name: 'Club Nets Practice',
    description: 'Your first day at the local club. Face the swing specialist in the indoor nets.',
    opponent: 'Club Swing Specialist',
    difficulty: 'Easy',
    bowlerSkill: 25,
    pitchCondition: 'Overcast (Swing)',
    objective: { type: 'runs', target: 18, balls: 12 },
    rewards: { xp: 350, coins: 160, message: 'You have adapted well to swing bowling.' }
  },
  {
    id: 7,
    name: 'Weekend Club Debut',
    description: 'Chase a low score in a local club game. The pitch is slow and damp.',
    opponent: 'Local Club Medium Pacer',
    difficulty: 'Medium',
    bowlerSkill: 28,
    pitchCondition: 'Damp Slow Grass',
    objective: { type: 'runs', target: 22, balls: 15 },
    rewards: { xp: 400, coins: 180, message: 'Solid debut performance!' }
  },
  {
    id: 8,
    name: 'Club Derby Chase',
    description: 'A local derby match. Play sweep shots against their star off-spinner to control the chase.',
    opponent: 'Derby Off-Spinner',
    difficulty: 'Medium',
    bowlerSkill: 30,
    pitchCondition: 'Dry & Crumbly (High Spin)',
    objective: { type: 'runs', target: 24, balls: 12 },
    rewards: {
      xp: 450,
      coins: 200,
      itemUnlock: {
        item_id: 'club_spikes',
        name: 'Standard Spike Shoes',
        type: 'Shoes',
        rarity: 'Common',
        bonuses: { running: 4, fitness: 2 }
      },
      message: 'Unlocked "Standard Spike Shoes" (+4 Running, +2 Fitness)!'
    }
  },
  {
    id: 9,
    name: 'Seamer Challenge',
    description: 'The opposition bowler has control over seam movement. Play late and watch the ball off the pitch.',
    opponent: 'Club Seam Bowler',
    difficulty: 'Medium',
    bowlerSkill: 32,
    pitchCondition: 'Green Grass (Seam)',
    objective: { type: 'runs', target: 26, balls: 15 },
    rewards: { xp: 500, coins: 220, message: 'Great technique against seam movement.' }
  },
  {
    id: 10,
    name: 'Club T20 Quarter-Final',
    description: 'Score quick boundaries to secure a spot in the semi-finals.',
    opponent: 'Club T20 Death Bowler',
    difficulty: 'Medium',
    bowlerSkill: 34,
    pitchCondition: 'Flat & Fast',
    objective: { type: 'runs', target: 24, balls: 8 },
    rewards: { xp: 550, coins: 240, message: 'Perfect boundary hitting under pressure.' }
  },
  {
    id: 11,
    name: 'Club T20 Semi-Final',
    description: 'A tense chase in the club championship. Keep your cool against their leading wicket taker.',
    opponent: 'Club Leading Spinner',
    difficulty: 'Medium',
    bowlerSkill: 36,
    pitchCondition: 'Dry Flat Oval',
    objective: { type: 'runs', target: 30, balls: 18 },
    rewards: { xp: 600, coins: 260, message: 'You have guided the club to the grand final!' }
  },
  {
    id: 12,
    name: 'Club Championship Final',
    description: 'The final club game of the season. Face a cunning bowler mixing slow cutters.',
    opponent: 'Club Champion Bowler',
    difficulty: 'Medium-Hard',
    bowlerSkill: 38,
    pitchCondition: 'Hard Clay Deck',
    objective: { type: 'runs', target: 35, balls: 18 },
    rewards: {
      xp: 700,
      coins: 300,
      itemUnlock: {
        item_id: 'club_gloves',
        name: 'Club Pro Gloves',
        type: 'Gloves',
        rarity: 'Common',
        bonuses: { technique: 3, power: 2 }
      },
      message: 'Unlocked "Club Pro Gloves" (+3 Technique, +2 Power)!'
    }
  },

  // === DISTRICT LEVEL (13-18) ===
  {
    id: 13,
    name: 'District Squad Induction',
    description: 'First practice match at the district level. Prove your worth against high-pace deliveries.',
    opponent: 'District Express Bowler',
    difficulty: 'Medium-Hard',
    bowlerSkill: 40,
    pitchCondition: 'Hard Fast Turf',
    objective: { type: 'runs', target: 22, balls: 10 },
    rewards: { xp: 800, coins: 320, message: 'Excellent reflex play against pace.' }
  },
  {
    id: 14,
    name: 'District Opener',
    description: 'Representing the district. Score runs against their highly disciplined swing bowler.',
    opponent: 'District Swing Specialist',
    difficulty: 'Medium-Hard',
    bowlerSkill: 42,
    pitchCondition: 'Overcast (Slight Swing)',
    objective: { type: 'runs', target: 26, balls: 15 },
    rewards: { xp: 900, coins: 350, message: 'Solid start to the district league.' }
  },
  {
    id: 15,
    name: 'Bounce Specialist Duel',
    description: 'Scouts are watching. Score boundaries off short-pitched bouncers.',
    opponent: 'District Bouncer Expert',
    difficulty: 'Medium-Hard',
    bowlerSkill: 45,
    pitchCondition: 'Bouncy Clay Deck',
    objective: { type: 'runs', target: 24, balls: 10 },
    rewards: {
      xp: 1000,
      coins: 400,
      itemUnlock: {
        item_id: 'pro_pads',
        name: 'Pro-Guard Pads',
        type: 'Pads',
        rarity: 'Rare',
        bonuses: { defense: 6, running: 4 }
      },
      message: 'Unlocked "Pro-Guard Pads" (+6 Defense, +4 Running)!'
    }
  },
  {
    id: 16,
    name: 'District Derby Thriller',
    description: 'High intensity rivalry match. The bowler mixes slow balls and fast yorkers.',
    opponent: 'District Rival Bowler',
    difficulty: 'Medium-Hard',
    bowlerSkill: 48,
    pitchCondition: 'Standard Pitch',
    objective: { type: 'runs', target: 32, balls: 16 },
    rewards: { xp: 1100, coins: 420, message: 'Superb control under derby pressure.' }
  },
  {
    id: 17,
    name: 'District Semi-Final Chase',
    description: 'Chase down a competitive score against their spinner.',
    opponent: 'District Mystery Spinner',
    difficulty: 'Hard',
    bowlerSkill: 50,
    pitchCondition: 'Dry Turning Wicket',
    objective: { type: 'runs', target: 34, balls: 18 },
    rewards: { xp: 1200, coins: 450, message: 'You unlocked the "Sweep" shot! Highly effective against spinners.' }
  },
  {
    id: 18,
    name: 'District Cup Final',
    description: 'Play for the district trophy. Face their premier seamer on a green grass deck.',
    opponent: 'District Seam King',
    difficulty: 'Hard',
    bowlerSkill: 52,
    pitchCondition: 'Damp Green Grass',
    objective: { type: 'runs', target: 38, balls: 20 },
    rewards: {
      xp: 1400,
      coins: 500,
      itemUnlock: {
        item_id: 'pro_grip',
        name: 'Tacky Silicon Grip',
        type: 'Grip',
        rarity: 'Rare',
        bonuses: { technique: 8, timing: 4 }
      },
      message: 'Unlocked "Tacky Silicon Grip" (+8 Technique, +4 Timing)!'
    }
  },

  // === STATE LEVEL (19-28) ===
  {
    id: 19,
    name: 'State Academy Induction',
    description: 'Show you belong in the state academy reserves. Face their accurate bowler.',
    opponent: 'State Academy Bowler',
    difficulty: 'Hard',
    bowlerSkill: 55,
    pitchCondition: 'Hard Even Turf',
    objective: { type: 'runs', target: 28, balls: 12 },
    rewards: { xp: 1500, coins: 550, message: 'State coach is impressed.' }
  },
  {
    id: 20,
    name: 'State Reserves Friendly',
    description: 'A practice match against the senior team players. Face their quickest bowler.',
    opponent: 'State Senior Bowler',
    difficulty: 'Hard',
    bowlerSkill: 57,
    pitchCondition: 'Fast Hard Pitch',
    objective: { type: 'runs', target: 32, balls: 15 },
    rewards: { xp: 1600, coins: 600, message: 'You have earned a spot in the main first-class team!' }
  },
  {
    id: 21,
    name: 'First-Class Shield Opener',
    description: 'Your debut in first-class cricket. Face their swing master under overcast skies.',
    opponent: 'State Swing Master',
    difficulty: 'Hard',
    bowlerSkill: 60,
    pitchCondition: 'Overcast (Swing & Seam)',
    objective: { type: 'runs', target: 30, balls: 14 },
    rewards: {
      xp: 1800,
      coins: 650,
      itemUnlock: {
        item_id: 'carbon_gloves',
        name: 'Carbon Elite Gloves',
        type: 'Gloves',
        rarity: 'Rare',
        bonuses: { timing: 8, reflex: 4 }
      },
      message: 'Unlocked "Carbon Elite Gloves" (+8 Timing, +4 Reflex)!'
    }
  },
  {
    id: 22,
    name: 'Dusty Turf Challenge',
    description: 'A long innings simulation against an experienced first-class leg-spinner.',
    opponent: 'State Leg-Spinner',
    difficulty: 'Hard',
    bowlerSkill: 62,
    pitchCondition: 'Dry & Dusty Wicket',
    objective: { type: 'runs', target: 38, balls: 20 },
    rewards: { xp: 2000, coins: 700, message: 'Great footwork to smother the spin.' }
  },
  {
    id: 23,
    name: 'State Under-23 Championship',
    description: 'Play for the junior state shield. Score boundaries off their death over specialist.',
    opponent: 'State U-23 Death Bowler',
    difficulty: 'Hard',
    bowlerSkill: 64,
    pitchCondition: 'Flat & Fast Outfield',
    objective: { type: 'runs', target: 32, balls: 12 },
    rewards: { xp: 2200, coins: 750, message: 'Excellent boundary hitting.' }
  },
  {
    id: 24,
    name: 'Day/Night Shield Match',
    description: 'Batting under lights with the pink ball. Watch out for extra swing and seam.',
    opponent: 'State Pink-Ball Specialist',
    difficulty: 'Hard-Expert',
    bowlerSkill: 66,
    pitchCondition: 'Overcast (Extra Swing)',
    objective: { type: 'runs', target: 36, balls: 18 },
    rewards: { xp: 2400, coins: 800, message: 'Pink ball mastered!' }
  },
  {
    id: 25,
    name: 'Bouncy Track Challenge',
    description: 'Score boundary runs against their fast bowler on a green grass deck.',
    opponent: 'State Speedster',
    difficulty: 'Hard-Expert',
    bowlerSkill: 68,
    pitchCondition: 'Green Grass Bouncy Pitch',
    objective: { type: 'runs', target: 40, balls: 18 },
    rewards: {
      xp: 2600,
      coins: 850,
      itemUnlock: {
        item_id: 'english_willow_pro',
        name: 'English Willow Pro Bat',
        type: 'Bat',
        rarity: 'Rare',
        bonuses: { power: 8, timing: 6, technique: 4 }
      },
      message: 'Unlocked the "English Willow Pro Bat" (+8 Power, +6 Timing, +4 Technique)!'
    }
  },
  {
    id: 26,
    name: 'State Shield Quarter-Final',
    description: 'First knockout match in the state league. Block or smash their bowler.',
    opponent: 'State Rival Seamer',
    difficulty: 'Hard-Expert',
    bowlerSkill: 70,
    pitchCondition: 'Standard Pitch',
    objective: { type: 'runs', target: 42, balls: 20 },
    rewards: { xp: 2800, coins: 900, message: 'Qualified for the semi-finals!' }
  },
  {
    id: 27,
    name: 'State Shield Semi-Final',
    description: 'Pressure is high. Score runs against the state league\'s leading wicket taker.',
    opponent: 'State Leading Spinner',
    difficulty: 'Hard-Expert',
    bowlerSkill: 71,
    pitchCondition: 'Wear and Tear (Low Bounce)',
    objective: { type: 'runs', target: 45, balls: 22 },
    rewards: { xp: 3000, coins: 950, message: 'State Championship Final ticket secured!' }
  },
  {
    id: 28,
    name: 'State Championship Final',
    description: 'The grand finale of first-class cricket. Secure the trophy against your rivals.',
    opponent: 'State Legend Bowler',
    difficulty: 'Hard-Expert',
    bowlerSkill: 72,
    pitchCondition: 'Even Flat Deck',
    objective: { type: 'runs', target: 48, balls: 24 },
    rewards: {
      xp: 3500,
      coins: 1100,
      itemUnlock: {
        item_id: 'titanium_pads',
        name: 'Titanium Guard Pads',
        type: 'Pads',
        rarity: 'Epic',
        bonuses: { defense: 10, running: 8, stamina: 4 }
      },
      message: 'State Champions! Unlocked "Titanium Guard Pads" (+10 Defense, +8 Running, +4 Stamina)!'
    }
  },

  // === T20 FRANCHISE LEVEL (29-38) ===
  {
    id: 29,
    name: 'Franchise Draft Trial',
    description: 'Franchise scouts are watching. Show aggressive strokeplay to get drafted.',
    opponent: 'Franchise Scout Bowler',
    difficulty: 'Hard-Expert',
    bowlerSkill: 74,
    pitchCondition: 'Flat Belter (Fast Outfield)',
    objective: { type: 'runs', target: 30, balls: 10 },
    rewards: { xp: 3800, coins: 1150, message: 'Unlocked the "Reverse Sweep" shot! Useful against spinners.' }
  },
  {
    id: 30,
    name: 'Franchise Debut Match',
    description: 'First official franchise match. The stadium is packed. Score runs against a foreign pace star.',
    opponent: 'Global T20 Pace Star',
    difficulty: 'Expert',
    bowlerSkill: 76,
    pitchCondition: 'Even Bounce',
    objective: { type: 'runs', target: 36, balls: 16 },
    rewards: {
      xp: 4000,
      coins: 1200,
      itemUnlock: {
        item_id: 'gel_spikes',
        name: 'Gel-Active Pro Spikes',
        type: 'Shoes',
        rarity: 'Rare',
        bonuses: { running: 8, fitness: 6, stamina: 4 }
      },
      message: 'Unlocked "Gel-Active Pro Spikes" (+8 Running, +6 Fitness, +4 Stamina)!'
    }
  },
  {
    id: 31,
    name: 'Death Over Run-Chase',
    description: 'Tense finish. Smash boundaries against their leading death bowler.',
    opponent: 'Franchise Death Specialist',
    difficulty: 'Expert',
    bowlerSkill: 78,
    pitchCondition: 'Dry Flat Wicket',
    objective: { type: 'runs', target: 28, balls: 8 },
    rewards: { xp: 4200, coins: 1300, message: 'Phenomenal death-overs hitting.' }
  },
  {
    id: 32,
    name: 'Quality International Spinner',
    description: 'Play smart and find gaps against a world-class overseas mystery spinner.',
    opponent: 'Global Mystery Spinner',
    difficulty: 'Expert',
    bowlerSkill: 80,
    pitchCondition: 'Dry Turning Track',
    objective: { type: 'runs', target: 40, balls: 20 },
    rewards: { xp: 4400, coins: 1350, message: 'Brilliant adaptation to spin variations.' }
  },
  {
    id: 33,
    name: 'Super Over Target',
    description: 'Simulation of a high stakes Super Over. Every ball counts.',
    opponent: 'Super Over Fast Bowler',
    difficulty: 'Expert',
    bowlerSkill: 81,
    pitchCondition: 'Hard Deck',
    objective: { type: 'runs', target: 16, balls: 6 },
    rewards: { xp: 4600, coins: 1400, message: 'Super Over won! Unlocked the "Upper Cut" shot!' }
  },
  {
    id: 34,
    name: 'Spin Mystery Duel',
    description: 'Opposition has introduced a bowler with a lethal doosra and variations.',
    opponent: 'Doosra Specialist',
    difficulty: 'Expert',
    bowlerSkill: 82,
    pitchCondition: 'Dry Dusty Turf',
    objective: { type: 'runs', target: 38, balls: 18 },
    rewards: { xp: 4800, coins: 1450, message: 'Decoded the variations perfectly.' }
  },
  {
    id: 35,
    name: 'Wet Outfield Challenge',
    description: 'Damp outfield makes running difficult. Rely on timing to clear the fielders.',
    opponent: 'Franchise Medium Seamer',
    difficulty: 'Expert',
    bowlerSkill: 83,
    pitchCondition: 'Damp Slow Turf',
    objective: { type: 'runs', target: 42, balls: 20 },
    rewards: {
      xp: 5000,
      coins: 1500,
      itemUnlock: {
        item_id: 'kookaburra_gold',
        name: 'Kookaburra Gold Blade',
        type: 'Bat',
        rarity: 'Epic',
        bonuses: { power: 15, timing: 12, technique: 10 }
      },
      message: 'Unlocked the legendary "Kookaburra Gold Blade" (+15 Power, +12 Timing, +10 Technique)!'
    }
  },
  {
    id: 36,
    name: 'Franchise Quarter-Final',
    description: 'Knockout pressure in the franchise league. Score boundaries under lights.',
    opponent: 'Franchise Spearhead',
    difficulty: 'Expert',
    bowlerSkill: 84,
    pitchCondition: 'Flat Belter',
    objective: { type: 'runs', target: 45, balls: 20 },
    rewards: { xp: 5200, coins: 1600, message: 'Qualified for the semi-finals!' }
  },
  {
    id: 37,
    name: 'Franchise Semi-Final',
    description: 'One step away from the final. The bowler uses extreme cutters.',
    opponent: 'Franchise Cutter Specialist',
    difficulty: 'Expert',
    bowlerSkill: 85,
    pitchCondition: 'Dry Cracked Wicket',
    objective: { type: 'runs', target: 48, balls: 22 },
    rewards: { xp: 5500, coins: 1700, message: 'Grand final ticket secured!' }
  },
  {
    id: 38,
    name: 'Franchise Grand Final',
    description: 'Play for the franchise trophy. Face the tournament\'s leading wicket taker.',
    opponent: 'Franchise MVP Bowler',
    difficulty: 'Expert',
    bowlerSkill: 86,
    pitchCondition: 'Flat Hard Deck',
    objective: { type: 'runs', target: 50, balls: 24 },
    rewards: {
      xp: 6000,
      coins: 1800,
      itemUnlock: {
        item_id: 'titanium_helmet',
        name: 'Titanium Air Helmet',
        type: 'Helmet',
        rarity: 'Epic',
        bonuses: { defense: 12, mentality: 12, reflex: 8 }
      },
      message: 'Franchise Champions! Unlocked "Titanium Air Helmet" (+12 Defense, +12 Mentality, +8 Reflex)!'
    }
  },

  // === NATIONAL SELECTORS & A-TEAM (39-42) ===
  {
    id: 39,
    name: 'National Selectors Trial',
    description: 'National selectors are watching. Face their premier fast bowler hitting 145+ km/h.',
    opponent: 'National Pace Prospect',
    difficulty: 'Expert',
    bowlerSkill: 88,
    pitchCondition: 'Green Bouncy Turf',
    objective: { type: 'runs', target: 44, balls: 18 },
    rewards: { xp: 6500, coins: 1900, message: 'Selectors are writing down your name.' }
  },
  {
    id: 40,
    name: 'A-Team Tour Opener',
    description: 'You got picked for the National A-Team. Face their swing bowler in overseas conditions.',
    opponent: 'Overseas A-Team Swing Bowler',
    difficulty: 'Expert',
    bowlerSkill: 89,
    pitchCondition: 'Damp Green Grass (Swing)',
    objective: { type: 'runs', target: 46, balls: 20 },
    rewards: { xp: 7000, coins: 2000, message: 'Successful start to the A-Team tour.' }
  },
  {
    id: 41,
    name: 'A-Team Tri-Series Decider',
    description: 'A-Team tri-series final. Face a cunning bowler mixing slow cutters and knuckleballs.',
    opponent: 'Overseas A-Team Death Bowler',
    difficulty: 'Expert',
    bowlerSkill: 90,
    pitchCondition: 'Dry Cracked Wicket',
    objective: { type: 'runs', target: 48, balls: 20 },
    rewards: {
      xp: 7500,
      coins: 2200,
      itemUnlock: {
        item_id: 'kookaburra_plat',
        name: 'Kookaburra Platinum Blade',
        type: 'Bat',
        rarity: 'Epic',
        bonuses: { power: 18, timing: 15, technique: 12 }
      },
      message: 'Unlocked the "Kookaburra Platinum Blade" (+18 Power, +15 Timing, +12 Technique)!'
    }
  },
  {
    id: 42,
    name: 'National Team Selection Trial',
    description: 'The final trial. Face the senior national team\'s spearhead to claim your debut cap.',
    opponent: 'National Team Spearhead',
    difficulty: 'Expert-Legendary',
    bowlerSkill: 92,
    pitchCondition: 'Balanced Hard Pitch',
    objective: { type: 'runs', target: 50, balls: 22 },
    rewards: { xp: 8000, coins: 2400, message: 'CAP EARNED! You have been selected for the senior national team!' }
  },

  // === INTERNATIONAL BILATERALS (43-45) ===
  {
    id: 43,
    name: 'International T20I Debut',
    description: 'You walk out wearing your national colors! Face the rival team\'s swing bowler.',
    opponent: 'Rival National Swing Bowler',
    difficulty: 'Expert-Legendary',
    bowlerSkill: 94,
    pitchCondition: 'Overcast (Heavy Swing)',
    objective: { type: 'runs', target: 48, balls: 20 },
    rewards: { xp: 8500, coins: 2600, message: 'Fantastic debut innings!' }
  },
  {
    id: 44,
    name: 'ODI Series Decider',
    description: 'The bilateral series is tied. Guide your country to victory against their top leg-spinner.',
    opponent: 'Rival National Spinner',
    difficulty: 'Expert-Legendary',
    bowlerSkill: 95,
    pitchCondition: 'Dry Turning Turf',
    objective: { type: 'runs', target: 54, balls: 24 },
    rewards: {
      xp: 9000,
      coins: 2800,
      itemUnlock: {
        item_id: 'plat_gloves',
        name: 'Grandmaster Platinum Gloves',
        type: 'Gloves',
        rarity: 'Epic',
        bonuses: { technique: 15, timing: 12, reflex: 10 }
      },
      message: 'Series Won! Unlocked "Grandmaster Platinum Gloves" (+15 Technique, +12 Timing, +10 Reflex)!'
    }
  },
  {
    id: 45,
    name: 'International Test Derby',
    description: 'A historic test derby match. Face their fastest bowler on a green grass deck.',
    opponent: 'Rival Fast Bowling Legend',
    difficulty: 'Expert-Legendary',
    bowlerSkill: 96,
    pitchCondition: 'Green Grass (Extra Bounce)',
    objective: { type: 'runs', target: 58, balls: 24 },
    rewards: { xp: 9500, coins: 3000, message: 'Outstanding batting in hostile conditions.' }
  },

  // === WORLD CUP CAMPAIGN (46-50) ===
  {
    id: 46,
    name: 'World Cup Group Opener',
    description: 'World Cup group stage begins. Chase down a competitive score against an accurate seamer.',
    opponent: 'World Cup Seam Specialist',
    difficulty: 'Legendary',
    bowlerSkill: 97,
    pitchCondition: 'Balanced Oval',
    objective: { type: 'runs', target: 52, balls: 22 },
    rewards: { xp: 10000, coins: 3200, message: 'World Cup campaign off to a winning start.' }
  },
  {
    id: 47,
    name: 'World Cup Quarter-Final',
    description: 'A high stakes knockout match. Play to reach the semi-finals against their spinner.',
    opponent: 'World Cup Leggie',
    difficulty: 'Legendary',
    bowlerSkill: 98,
    pitchCondition: 'Very Dry Turning Track',
    objective: { type: 'runs', target: 56, balls: 24 },
    rewards: {
      xp: 11000,
      coins: 3500,
      itemUnlock: {
        item_id: 'legend_pads',
        name: 'Grandmaster Carbon Pads',
        type: 'Pads',
        rarity: 'Legendary',
        bonuses: { defense: 20, running: 15, stamina: 10 }
      },
      message: 'Semifinals reached! Unlocked "Grandmaster Carbon Pads" (+20 Defense, +15 Running, +10 Stamina)!'
    }
  },
  {
    id: 48,
    name: 'World Cup Semi-Final Thriller',
    description: 'Score quickly in the final overs to book your spot in the grand final.',
    opponent: 'World Cup Death Over King',
    difficulty: 'Legendary',
    bowlerSkill: 99,
    pitchCondition: 'Abrasive Dry Turf',
    objective: { type: 'runs', target: 46, balls: 14 },
    rewards: { xp: 12000, coins: 4000, message: 'Grand Final ticket secured!' }
  },
  {
    id: 49,
    name: 'World Cup Super-Over Final',
    description: 'A tied match in the final. Smash boundaries off their world-class left-arm pacer.',
    opponent: 'World Class Left-Arm Pacer',
    difficulty: 'Legendary',
    bowlerSkill: 99.5,
    pitchCondition: 'Hard Bouncy Clay',
    objective: { type: 'runs', target: 18, balls: 6 },
    rewards: { xp: 13000, coins: 4500, message: 'Super Over completed!' }
  },
  {
    id: 50,
    name: 'World Cup Grand Final',
    description: 'This is the moment. Walk out in front of 100,000 fans to face the greatest bowler in cricket history.',
    opponent: 'The Cricket Legend Bowler',
    difficulty: 'Legendary',
    bowlerSkill: 100,
    pitchCondition: 'Balanced Oval Pitch (Swing, Spin, Seam)',
    objective: { type: 'runs', target: 70, balls: 24 },
    rewards: {
      xp: 15000,
      coins: 5000,
      itemUnlock: {
        item_id: 'legend_helmet',
        name: 'Grandmaster Carbon Helmet',
        type: 'Helmet',
        rarity: 'Legendary',
        bonuses: { mentality: 20, defense: 15, reflex: 15 }
      },
      message: '🏆 WORLD CHAMPION! You won the Cricket World Cup and unlocked the "Grandmaster Carbon Helmet" (+20 Mentality, +15 Defense, +15 Reflex)!'
    }
  }
];

export function getPlayerChapters(player, db) {
  // Get player's academy details to determine their state
  let stateName = 'State';
  if (player.academy_id && player.academy_id !== 'pending') {
    const acad = academies[player.academy_id];
    if (acad && acad.state) {
      stateName = acad.state;
    }
  }

  const nationality = player.nationality || 'National';
  const capNation = nationality.charAt(0).toUpperCase() + nationality.slice(1).toLowerCase();

  // Get country first class championship name
  let firstClassCup = 'National First Class Cup';
  const normNation = nationality.toLowerCase();
  if (normNation === 'india') firstClassCup = 'Ranji Trophy';
  else if (normNation === 'australia') firstClassCup = 'Sheffield Shield';
  else if (normNation === 'england') firstClassCup = 'County Championship';
  else if (normNation === 'pakistan') firstClassCup = 'Quaid-e-Azam Trophy';
  else if (normNation === 'south africa') firstClassCup = '4-Day Series';
  else if (normNation === 'new zealand') firstClassCup = 'Plunket Shield';
  else if (normNation === 'west indies') firstClassCup = 'Regional Four Day';

  // Get opponent state teams for the state chapters (Chapters 19 to 28)
  let stateRivals = ['Delhi', 'Karnataka', 'Tamil Nadu', 'Mumbai'];
  if (normNation === 'australia') stateRivals = ['Victoria', 'Queensland', 'Western Australia', 'New South Wales'];
  else if (normNation === 'england') stateRivals = ['Yorkshire', 'Lancashire', 'Surrey', 'Middlesex'];
  else if (normNation === 'pakistan') stateRivals = ['KPK', 'Sindh', 'Punjab', 'Balochistan'];
  else if (normNation === 'south africa') stateRivals = ['Titans', 'Lions', 'Western Province', 'Dolphins'];
  else {
    stateRivals = [
      `${capNation} Northern Province`,
      `${capNation} Southern Coast`,
      `${capNation} Eastern Districts`,
      `${capNation} Western Plains`
    ];
  }

  // Filter out the player's own state if it matches
  stateRivals = stateRivals.filter(r => r.toLowerCase() !== stateName.toLowerCase());
  if (stateRivals.length < 4) {
    stateRivals.push('Rival State XI');
    stateRivals.push('Rest of Country XI');
  }

  // International rivals
  let intRivals = ['Australia', 'England', 'Pakistan', 'South Africa', 'New Zealand', 'India'];
  intRivals = intRivals.filter(c => c.toLowerCase() !== normNation);
  if (intRivals.length < 5) {
    intRivals.push('West Indies');
    intRivals.push('Sri Lanka');
    intRivals.push('Bangladesh');
  }

  return chapters.map(ch => {
    // Deep clone chapter to avoid modifying the static reference
    const customCh = { ...ch, objective: { ...ch.objective }, rewards: { ...ch.rewards } };
    if (ch.rewards.itemUnlock) {
      customCh.rewards.itemUnlock = { ...ch.rewards.itemUnlock };
    }

    // Academy chapters (1-5)
    if (ch.id >= 1 && ch.id <= 5) {
      if (player.academy_id && player.academy_id !== 'pending') {
        const acadName = academies[player.academy_id]?.name || 'Academy';
        if (ch.id === 1) {
          customCh.name = `${acadName} Nets Induction`;
          customCh.opponent = `${acadName} Bowling Machine`;
        } else if (ch.id === 2) {
          customCh.name = `${acadName} Junior Drills`;
          customCh.opponent = `${acadName} Junior Bowler`;
        } else if (ch.id === 3) {
          customCh.name = `${acadName} Reserves Trial`;
          customCh.opponent = `${acadName} Reserves XI`;
        } else if (ch.id === 4) {
          customCh.name = `${acadName} Coach Selection`;
          customCh.opponent = `${acadName} Spin Machine`;
        } else if (ch.id === 5) {
          customCh.name = `${acadName} Intra-Squad Cup`;
          customCh.opponent = `${acadName} Senior Speedster`;
        }
      }
    }

    // State chapters (19-28)
    if (ch.id >= 19 && ch.id <= 28) {
      const idx = (ch.id - 19) % stateRivals.length;
      const opponentState = stateRivals[idx];
      if (ch.id === 19) {
        customCh.name = `${stateName} Shield Opener`;
        customCh.opponent = `${opponentState} Academy Bowler`;
      } else if (ch.id === 28) {
        customCh.name = `${firstClassCup} Final`;
        customCh.opponent = `${opponentState} First-Class Veteran`;
      } else {
        customCh.name = `${stateName} vs ${opponentState}`;
        customCh.opponent = `${opponentState} Bowler`;
      }
    }

    // International Selection and Matches (39-50)
    if (ch.id >= 39 && ch.id <= 50) {
      const idx = (ch.id - 39) % intRivals.length;
      const opponentNation = intRivals[idx];
      if (ch.id === 39) {
        customCh.name = `${capNation} Selectors Trial`;
        customCh.opponent = `${capNation} Pace Prospect`;
      } else if (ch.id === 50) {
        customCh.name = `World Cup Final: ${capNation} vs ${opponentNation}`;
        customCh.opponent = `${opponentNation} Cricket Legend`;
      } else {
        customCh.name = `International: ${capNation} vs ${opponentNation}`;
        customCh.opponent = `${opponentNation} International`;
      }
    }

    return customCh;
  });
}
