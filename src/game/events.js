import { academies } from './academies.js';

// Story Events list and execution helpers
export const storyEvents = [
  {
    id: 'media_criticism',
    title: '📰 Media Criticism',
    description: 'A local sports journalist writes an article claiming your technique is raw and you are too selfish at the crease.',
    choices: [
      {
        label: 'Ignore the criticism and stay quiet',
        resultText: 'You keep your head down. Your mental focus improves.',
        effects: { mentality: 3, energy: -5 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET mentality = mentality + 3 WHERE player_id = ?', playerId);
        }
      },
      {
        label: 'Retaliate on Twitter/Social Media',
        resultText: 'You gain fan popularity and confidence, but state scouts are unimpressed by your outburst.',
        effects: { aggression: 5, confidence: 15, reputation: -15 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET aggression = aggression + 5 WHERE player_id = ?', playerId);
          await db.run('UPDATE players SET confidence = MIN(100, confidence + 15), reputation = MAX(0, reputation - 15) WHERE discord_id = ?', playerId);
        }
      },
      {
        label: 'Hit the nets for extra training',
        resultText: 'You burn some sweat. Your technique is sharpened.',
        effects: { technique: 4, energy: -15, xp: 50 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET technique = technique + 4 WHERE player_id = ?', playerId);
          await db.run('UPDATE players SET energy = MAX(0, energy - 15), xp = xp + 50 WHERE discord_id = ?', playerId);
        }
      }
    ]
  },
  {
    id: 'sponsor_offer',
    title: '👟 Bat Sponsor Offer',
    description: 'An upcoming local sports brand offers a mini sponsorship. They will pay you coins, but you must endorse their grip.',
    choices: [
      {
        label: 'Sign the sponsorship contract',
        resultText: 'You secure the bag! You get 250 coins and a free grip.',
        effects: { coins: 250 },
        dbUpdate: async (db, playerId) => {
          await db.run("UPDATE players SET coins = coins + 250, sponsor = 'Sponsor Rubber Grip Co.' WHERE discord_id = ?", playerId);
          // Add a grip to inventory
          const gripBonuses = JSON.stringify({ technique: 3 });
          await db.run(
            `INSERT INTO inventory (player_id, item_id, name, type, rarity, bonuses, equipped)
             VALUES (?, 'sponsor_grip', 'Sponsor Rubber Grip', 'Grip', 'Common', ?, 0)`,
            playerId,
            gripBonuses
          );
        }
      },
      {
        label: 'Decline and wait for major brands',
        resultText: 'You hold out. Your reputation as a serious cricketer increases.',
        effects: { reputation: 25 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE players SET reputation = reputation + 25 WHERE discord_id = ?', playerId);
        }
      }
    ]
  },
  {
    id: 'coach_dispute',
    title: '🤬 Academy Coach Dispute',
    description: 'The coach wants you to play as an Anchor, but you want to smash sixes. He calls you into his cabin.',
    choices: [
      {
        label: 'Apologize and follow his instructions',
        resultText: 'The coach is pleased. You receive a training boost token.',
        effects: { training_tokens: 1, defense: 2 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE players SET training_tokens = training_tokens + 1 WHERE discord_id = ?', playerId);
          await db.run('UPDATE attributes SET defense = defense + 2 WHERE player_id = ?', playerId);
        }
      },
      {
        label: 'Argue your case for attacking cricket',
        resultText: 'You show conviction. Your power increases, but your squad selection rating takes a slight hit.',
        effects: { power: 4, form: -10 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET power = power + 4 WHERE player_id = ?', playerId);
          await db.run('UPDATE players SET form = MAX(0, form - 10) WHERE discord_id = ?', playerId);
        }
      }
    ]
  },
  {
    id: 'injury_scare',
    title: '🤕 Hamstring Strain',
    description: 'During a sprint session, you pull up clutching your hamstring. It feels tight.',
    choices: [
      {
        label: 'Rest and miss the next practice session',
        resultText: 'You recover fully. Fitness XP is earned from rehabilitation.',
        effects: { fitness: 2, energy: 20 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET fitness = fitness + 2 WHERE player_id = ?', playerId);
          await db.run('UPDATE players SET energy = MIN(100, energy + 20) WHERE discord_id = ?', playerId);
        }
      },
      {
        label: 'Take pain killers and push through',
        resultText: 'Risky! You complete the session, but your stamina attributes suffer long-term.',
        effects: { stamina: -3, training_tokens: 2 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET stamina = MAX(10, stamina - 3) WHERE player_id = ?', playerId);
          await db.run('UPDATE players SET training_tokens = training_tokens + 2 WHERE discord_id = ?', playerId);
        }
      }
    ]
  },
  {
    id: 'teammate_rivalry',
    title: '⚔️ Net Rivalry',
    description: 'The academy\'s leading fast bowler challenges you to a 6-ball faceoff in the nets. The loser buys lunch.',
    choices: [
      {
        label: 'Accept the challenge (Cost: 15 Energy)',
        resultText: 'You smash him! Your confidence rises and you learn to read pace better.',
        effects: { confidence: 15, pace: 4, energy: -15 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE players SET confidence = MIN(100, confidence + 15), energy = MAX(0, energy - 15) WHERE discord_id = ?', playerId);
          await db.run('UPDATE attributes SET pace = pace + 4 WHERE player_id = ?', playerId);
        }
      },
      {
        label: 'Decline to focus on fitness',
        resultText: 'You stick to your schedule. The bowler laughs, but your running speed gets a minor boost.',
        effects: { running: 3 },
        dbUpdate: async (db, playerId) => {
          await db.run('UPDATE attributes SET running = running + 3 WHERE player_id = ?', playerId);
        }
      }
    ]
  }
];

/**
 * Gets a random story event
 * @returns {object} A story event definition
 */
export function getRandomEvent() {
  const idx = Math.floor(Math.random() * storyEvents.length);
  return storyEvents[idx];
}

export function getPlayerEvent(player) {
  const baseEvent = getRandomEvent();
  const customEvent = {
    ...baseEvent,
    choices: baseEvent.choices.map(c => ({ ...c }))
  };

  let academyName = 'your academy';
  let coachName = 'the head coach';
  let stateName = 'domestic cricket';
  if (player.academy_id && player.academy_id !== 'pending') {
    const acad = academies[player.academy_id];
    if (acad) {
      academyName = acad.name || 'your academy';
      coachName = (acad.coachRating || 'the head coach').replace(/\(.*?\)/g, '').trim(); // Strip rating e.g. Coach Sachin
      stateName = acad.state || 'domestic cricket';
    }
  }

  const nationality = player.nationality || 'your country';
  const capNation = nationality.charAt(0).toUpperCase() + nationality.slice(1).toLowerCase();

  if (customEvent.id === 'media_criticism') {
    customEvent.description = `A sports journalist in **${stateName}** writes an article claiming your technique is raw and you are too selfish at the crease for **${capNation}** selection.`;
    customEvent.choices[1].resultText = `You gain fan popularity and confidence, but **${stateName}** and **${capNation}** selectors are unimpressed by your outburst.`;
  } else if (customEvent.id === 'coach_dispute') {
    customEvent.description = `Your coach **${coachName}** at **${academyName}** wants you to play as a defensive Anchor, but you want to smash sixes. He calls you into his cabin.`;
    customEvent.choices[0].resultText = `**${coachName}** is pleased with your attitude. You receive a training boost token.`;
  } else if (customEvent.id === 'teammate_rivalry') {
    customEvent.description = `A leading fast bowler at **${academyName}** challenges you to a 6-ball faceoff in the nets. The loser buys lunch.`;
  }

  return customEvent;
}
