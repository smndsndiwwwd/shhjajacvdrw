import db from '../database/db.js';

export const shopEquipment = {
  // BATS
  willow_starter: {
    id: 'willow_starter',
    name: 'Willow Starter Bat',
    type: 'Bat',
    rarity: 'Common',
    cost: 150,
    bonuses: { power: 3, timing: 2 }
  },
  english_willow_pro: {
    id: 'english_willow_pro',
    name: 'English Willow Pro',
    type: 'Bat',
    rarity: 'Rare',
    cost: 600,
    bonuses: { power: 8, timing: 6, technique: 4 }
  },
  kookaburra_gold: {
    id: 'kookaburra_gold',
    name: 'Kookaburra Gold Blade',
    type: 'Bat',
    rarity: 'Epic',
    cost: 2000,
    bonuses: { power: 15, timing: 12, technique: 10 }
  },
  beast_bat: {
    id: 'beast_bat',
    name: '🔴 The Beast (Custom SH)',
    type: 'Bat',
    rarity: 'Legendary',
    cost: 5000,
    bonuses: { power: 25, timing: 15, aggression: 15 }
  },

  // GRIPS
  rubber_grip: {
    id: 'rubber_grip',
    name: 'Standard Rubber Grip',
    type: 'Grip',
    rarity: 'Common',
    cost: 80,
    bonuses: { technique: 2 }
  },
  leather_grip: {
    id: 'leather_grip',
    name: 'Premium Leather Grip',
    type: 'Grip',
    rarity: 'Common',
    cost: 120,
    bonuses: { technique: 4 }
  },
  spiral_pro_grip: {
    id: 'spiral_pro_grip',
    name: 'Spiral Pro Grip',
    type: 'Grip',
    rarity: 'Rare',
    cost: 300,
    bonuses: { technique: 7, timing: 3 }
  },

  // GLOVES
  club_gloves: {
    id: 'club_gloves',
    name: 'Club Protection Gloves',
    type: 'Gloves',
    rarity: 'Common',
    cost: 100,
    bonuses: { timing: 3 }
  },
  carbon_gloves: {
    id: 'carbon_gloves',
    name: 'Carbon Elite Gloves',
    type: 'Gloves',
    rarity: 'Rare',
    cost: 500,
    bonuses: { timing: 8, reflex: 4 }
  },
  impact_gloves: {
    id: 'impact_gloves',
    name: 'Impact Armor Gloves',
    type: 'Gloves',
    rarity: 'Epic',
    cost: 1500,
    bonuses: { timing: 15, reflex: 10, fitness: 5 }
  },

  // PADS
  light_pads: {
    id: 'light_pads',
    name: 'Lite-Run Club Pads',
    type: 'Pads',
    rarity: 'Common',
    cost: 120,
    bonuses: { running: 3, defense: 2 }
  },
  pro_pads: {
    id: 'pro_pads',
    name: 'Pro-Guard Pads',
    type: 'Pads',
    rarity: 'Rare',
    cost: 550,
    bonuses: { defense: 6, running: 4 }
  },
  test_level_pads: {
    id: 'test_level_pads',
    name: 'Elite Test Spec Pads',
    type: 'Pads',
    rarity: 'Epic',
    cost: 1800,
    bonuses: { defense: 15, running: 10, reflex: 5 }
  },

  // HELMETS
  poly_helmet: {
    id: 'poly_helmet',
    name: 'Club Poly Helmet',
    type: 'Helmet',
    rarity: 'Common',
    cost: 130,
    bonuses: { defense: 3, mentality: 2 }
  },
  titanium_helmet: {
    id: 'titanium_helmet',
    name: 'Titanium Air Helmet',
    type: 'Helmet',
    rarity: 'Epic',
    cost: 1700,
    bonuses: { defense: 12, mentality: 12, reflex: 8 }
  },
  legend_helmet: {
    id: 'legend_helmet',
    name: 'Grandmaster Carbon Helmet',
    type: 'Helmet',
    rarity: 'Legendary',
    cost: 6000,
    bonuses: { mentality: 20, defense: 15, reflex: 15 }
  },

  // SHOES
  club_spikes: {
    id: 'club_spikes',
    name: 'Standard Spike Shoes',
    type: 'Shoes',
    rarity: 'Common',
    cost: 140,
    bonuses: { running: 4, fitness: 2 }
  },
  gel_spikes: {
    id: 'gel_spikes',
    name: 'Gel-Active Pro Spikes',
    type: 'Shoes',
    rarity: 'Rare',
    cost: 650,
    bonuses: { running: 8, fitness: 6, stamina: 4 }
  },
  vector_spikes: {
    id: 'vector_spikes',
    name: 'Vector Ultra Spike Shoes',
    type: 'Shoes',
    rarity: 'Epic',
    cost: 2200,
    bonuses: { running: 15, fitness: 12, stamina: 10 }
  }
};

export function getItemById(id) {
  return shopEquipment[id];
}

const originalShopEquipment = { ...shopEquipment };

export function loadCustomItems() {
  Object.keys(shopEquipment).forEach(key => {
    if (!originalShopEquipment[key]) {
      delete shopEquipment[key];
    }
  });

  try {
    const customRows = db.prepare('SELECT * FROM custom_items').all();
    customRows.forEach(row => {
      shopEquipment[row.id] = {
        id: row.id,
        name: row.name,
        type: row.type,
        rarity: row.rarity,
        cost: row.cost,
        bonuses: JSON.parse(row.bonuses_json || '{}')
      };
    });
  } catch (e) {
    console.error('Error loading custom items from database:', e);
  }
}

loadCustomItems();
