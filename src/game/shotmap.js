import db from '../database/db.js';

/**
 * Shot Map & Preset System
 * Every batting combination of (Footwork, Intent, Zone) has 3 to 4 possible cricket shots.
 * Players configure and equip 1 shot per combination in their active preset.
 */

export const FOOTWORK_OPTIONS = ['Front Foot', 'Back Foot', 'Advanced'];
export const INTENT_OPTIONS = ['Push', 'Stroke', 'Loft', 'Leave'];
export const ZONE_OPTIONS = [
  'Third Man',
  'Point',
  'Cover',
  'Long Off',
  'Long On',
  'Mid Wicket',
  'Square Leg',
  'Fine Leg'
];

export function getComboKey(footwork, intent, zone) {
  if (intent === 'Leave') {
    return `${footwork}_Leave_In Line`;
  }
  return `${footwork}_${intent}_${zone}`;
}

/**
 * Master Shot Catalog: 72 combinations with 3-4 authentic shots each
 */
export const SHOT_CATALOG = {
  // ==========================================
  // FRONT FOOT + STROKE
  // ==========================================
  'Front Foot_Stroke_Cover': [
    { id: 'SHOT_101', num: '#101', name: 'Classic Cover Drive', style: 'Classical', risk: 'Low', timingMod: 3, powerMod: 0, desc: 'High front elbow, bending onto front knee, driven along the carpet through extra cover.' },
    { id: 'SHOT_102', num: '#102', name: 'Inside-Out Cover Drive', style: 'Attacking', risk: 'Medium', timingMod: 1, powerMod: 3, desc: 'Opening the shoulders and batting face, carved gracefully through extra cover.' },
    { id: 'SHOT_103', num: '#103', name: 'Punchy Check Drive', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Firm wrists and soft hands, punched delicately into the gap for placement.' },
    { id: 'SHOT_104', num: '#104', name: 'Flowing High-Elbow Drive', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Full extension through the line with textbook flourish piercing the infield.' }
  ],
  'Front Foot_Stroke_Long Off': [
    { id: 'SHOT_105', num: '#105', name: 'Classical Off-Drive', style: 'Classical', risk: 'Low', timingMod: 3, powerMod: 1, desc: 'Pitched right up, presented with a straight bat piercing between bowler and mid-off.' },
    { id: 'SHOT_106', num: '#106', name: 'On-the-Up Off-Drive', style: 'Attacking', risk: 'Medium', timingMod: 1, powerMod: 4, desc: 'Met on the rise with magnificent timing straight past mid-off.' },
    { id: 'SHOT_107', num: '#107', name: 'Controlled Straight Push-Drive', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Firm forward press, steered along the turf past the non-striker.' },
    { id: 'SHOT_108', num: '#108', name: 'Flowing Off-Punch', style: 'Power', risk: 'Low', timingMod: 2, powerMod: 2, desc: 'Solid punch past mid-off with high elbow follow-through.' }
  ],
  'Front Foot_Stroke_Long On': [
    { id: 'SHOT_109', num: '#109', name: 'Textbook On-Drive', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Showing the maker\'s name down the pitch, stroked smoothly past mid-on.' },
    { id: 'SHOT_110', num: '#110', name: 'Wristy Straight Clip', style: 'Placement', risk: 'Low', timingMod: 3, powerMod: 1, desc: 'Slight turn of the wrists on contact, guiding the ball wide of mid-on.' },
    { id: 'SHOT_111', num: '#111', name: 'Firm On-Side Punch', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Hard punch off the front knee piercing the long-on ring.' },
    { id: 'SHOT_112', num: '#112', name: 'Flowing Mid-On Stroke', style: 'Classical', risk: 'Low', timingMod: 3, powerMod: 1, desc: 'Pure balance and posture, stroked smoothly along the grass.' }
  ],
  'Front Foot_Stroke_Mid Wicket': [
    { id: 'SHOT_113', num: '#113', name: 'Whippy Wrist Flick', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Sublime Indian-style wrist roll flicking the ball through mid-wicket.' },
    { id: 'SHOT_114', num: '#114', name: 'Front Foot On-Drive to Mid-Wicket', style: 'Placement', risk: 'Low', timingMod: 3, powerMod: 2, desc: 'Leaning forward, stroked firmly into the spacious mid-wicket pocket.' },
    { id: 'SHOT_115', num: '#115', name: 'Rolling Wrist Clip', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -1, desc: 'Closing the face just at impact, rolling along the carpet for four.' },
    { id: 'SHOT_116', num: '#116', name: 'Power Clip to Cow Corner', style: 'Power', risk: 'Medium', timingMod: 1, powerMod: 4, desc: 'Bottom-hand heavy whip piercing the inner ring to the fence.' }
  ],
  'Front Foot_Stroke_Square Leg': [
    { id: 'SHOT_117', num: '#117', name: 'Front Foot Leg Glance', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Deflected off the front pad with a subtle turn of the blade behind square.' },
    { id: 'SHOT_118', num: '#118', name: 'Forward Sweep along Grass', style: 'Innovative', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Kneeling low on the front knee, swept hard along the turf.' },
    { id: 'SHOT_119', num: '#119', name: 'Rolling Paddle to Square Leg', style: 'Placement', risk: 'Low', timingMod: 3, powerMod: 0, desc: 'Soft hands paddle nudging the ball into the deep square leg vacancy.' },
    { id: 'SHOT_120', num: '#120', name: 'Crisp Pad Clip', style: 'Classical', risk: 'Low', timingMod: 3, powerMod: 1, desc: 'Neat clip off the shoelaces beating the short mid-wicket fielder.' }
  ],
  'Front Foot_Stroke_Fine Leg': [
    { id: 'SHOT_121', num: '#121', name: 'Delicate Fine Leg Tickle', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Brushing the ball off the front leg fine of the wicketkeeper.' },
    { id: 'SHOT_122', num: '#122', name: 'Paddle Sweep to Fine Leg', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 2, desc: 'Dropping down to paddle the delivery fine past 45 degrees.' },
    { id: 'SHOT_123', num: '#123', name: 'Fine Glance off the Toes', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Using the bowler\'s high pace to flick it down to the fine leg boundary.' },
    { id: 'SHOT_124', num: '#124', name: 'Reverse Paddle to Fine Leg', style: 'Innovative', risk: 'High', timingMod: 1, powerMod: 4, desc: 'Angling the reverse blade to redirect pace to fine leg.' }
  ],
  'Front Foot_Stroke_Point': [
    { id: 'SHOT_125', num: '#125', name: 'Square Drive through Point', style: 'Classical', risk: 'Low', timingMod: 3, powerMod: 2, desc: 'Front knee bent, slashing a full delivery squarely through point.' },
    { id: 'SHOT_126', num: '#126', name: 'Carved Slice past Backward Point', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Opening the blade face to carve the ball past the diving point fielder.' },
    { id: 'SHOT_127', num: '#127', name: 'Soft Hands Steer to Point', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Dabbed softly into the gully-point pocket for an easy run.' },
    { id: 'SHOT_128', num: '#128', name: 'Crisp Front Foot Punch to Point', style: 'Power', risk: 'Low', timingMod: 3, powerMod: 1, desc: 'Solid forward punch beating the point ring along the deck.' }
  ],
  'Front Foot_Stroke_Third Man': [
    { id: 'SHOT_129', num: '#129', name: 'Front Foot Late Glide', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Allowing the ball to arrive and angling late past the slip cordon.' },
    { id: 'SHOT_130', num: '#130', name: 'Opened Blade Steer', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Using pure pace, guiding the delivery safely down to third man.' },
    { id: 'SHOT_131', num: '#131', name: 'Dabbed Deflection to Third Man', style: 'Placement', risk: 'Low', timingMod: 3, powerMod: 0, desc: 'Soft hands deflection finding the gap between gully and third man.' },
    { id: 'SHOT_132', num: '#132', name: 'Edge-Free Late Dab', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Late touch steering cleanly along the carpet to the boundary.' }
  ],

  // ==========================================
  // FRONT FOOT + LOFT
  // ==========================================
  'Front Foot_Loft_Cover': [
    { id: 'SHOT_133', num: '#133', name: 'Lofted High Cover Drive', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Soaring aerial extension with high elbow, sailing over extra cover for six.' },
    { id: 'SHOT_134', num: '#134', name: 'Inside-Out Aerial Loft', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Stepping away slightly, carving high over deep extra cover into the stands.' },
    { id: 'SHOT_135', num: '#135', name: 'Carved Fly over Infield', style: 'Placement', risk: 'Medium', timingMod: 4, powerMod: 1, desc: 'High backlift chip beating the cover ring cleanly for a one-bounce four.' },
    { id: 'SHOT_136', num: '#136', name: 'Sliced Aerial Power Drive', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Brute force off the front foot soaring over the cover-point boundary.' }
  ],
  'Front Foot_Loft_Long Off': [
    { id: 'SHOT_137', num: '#137', name: 'Towering Straight Loft', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Holding the pose, launching straight down the ground over long-off.' },
    { id: 'SHOT_138', num: '#138', name: 'Lofted Off-Drive over Mid-Off', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Pitched up, lifted clean over the mid-off fielder into the crowd.' },
    { id: 'SHOT_139', num: '#139', name: 'Aerial Extension Chip', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: 0, desc: 'Clean chip finding the vacant boundary at long-off.' },
    { id: 'SHOT_140', num: '#140', name: 'Brute Force Long-Off Bomb', style: 'Power', risk: 'High', timingMod: 0, powerMod: 7, desc: 'Massive front knee heave sailing into the top deck.' }
  ],
  'Front Foot_Loft_Long On': [
    { id: 'SHOT_141', num: '#141', name: 'Downtown Loft over Long On', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Full swing through the arc, sending the ball towering over long-on.' },
    { id: 'SHOT_142', num: '#142', name: 'Wristy Aerial Whip to Long On', style: 'Innovative', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Flicking wrists at impact, lifting over mid-on into the stands.' },
    { id: 'SHOT_143', num: '#143', name: 'High Arching Loft over Mid-On', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'High trajectory loft clearing the infield with safe cushion.' },
    { id: 'SHOT_144', num: '#144', name: 'Power Cleared Long-On Shot', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Explosive hit down the ground clearing the ropes easily.' }
  ],
  'Front Foot_Loft_Mid Wicket': [
    { id: 'SHOT_145', num: '#145', name: 'Pick-Up Flick over Mid-Wicket', style: 'Classical', risk: 'Medium', timingMod: 4, powerMod: 3, desc: 'Effortless pick-up flick sailing into the deep mid-wicket stands.' },
    { id: 'SHOT_146', num: '#146', name: 'Lofted Slog Sweep', style: 'Power', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Kneeling down on one knee, clobbered deep over cow corner.' },
    { id: 'SHOT_147', num: '#147', name: 'Front Foot Aerial Pull', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Meeting the ball in front of the pad, pulling high over mid-wicket.' },
    { id: 'SHOT_148', num: '#148', name: 'Swinging Arc to Cow Corner', style: 'Power', risk: 'High', timingMod: 1, powerMod: 5, desc: 'Huge swing across the line sailing way back into the crowd.' }
  ],
  'Front Foot_Loft_Square Leg': [
    { id: 'SHOT_149', num: '#149', name: 'Aerial Slog over Square Leg', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Heaved with immense forearm power over backward square leg.' },
    { id: 'SHOT_150', num: '#150', name: 'Lofted Sweep over Square', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Classic front-knee sweep soaring high over the square leg boundary.' },
    { id: 'SHOT_151', num: '#151', name: 'Wrist Snap Aerial Whip', style: 'Innovative', risk: 'Medium', timingMod: 4, powerMod: 2, desc: 'Snap of the wrists deflecting the ball high into the square stands.' },
    { id: 'SHOT_152', num: '#152', name: 'Hook-Sweep over Square Leg', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Rising high off the front foot, hooked aerially over square.' }
  ],
  'Front Foot_Loft_Fine Leg': [
    { id: 'SHOT_153', num: '#153', name: 'Aerial Scoop over Fine Leg', style: 'Innovative', risk: 'High', timingMod: 3, powerMod: 3, desc: 'Dropping to one knee, getting under the ball and scooping over the keeper.' },
    { id: 'SHOT_154', num: '#154', name: 'Lofted Paddle over Keeper', style: 'Innovative', risk: 'Medium', timingMod: 4, powerMod: 2, desc: 'Angling the full blade face high over the wicketkeeper for six.' },
    { id: 'SHOT_155', num: '#155', name: 'Lofted Flick over Fine Leg', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Flicked off the shoelaces high and handsome into the deep backward fence.' },
    { id: 'SHOT_156', num: '#156', name: 'Ramped Upper Sail', style: 'Innovative', risk: 'High', timingMod: 1, powerMod: 5, desc: 'Using the 140km/h pace, ramped directly over the fine leg rope.' }
  ],
  'Front Foot_Loft_Point': [
    { id: 'SHOT_157', num: '#157', name: 'Aerial Slash over Point', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Flashing blade over backward point, clearing the boundary rider.' },
    { id: 'SHOT_158', num: '#158', name: 'Lofted Square Drive', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Front foot bent, driven aerially over deep point for four.' },
    { id: 'SHOT_159', num: '#159', name: 'Sliced Aerial Carve', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 4, desc: 'Carved over gully with an open bat face into the terraces.' },
    { id: 'SHOT_160', num: '#160', name: 'Upper Slash over Point', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Brutal cut sailing way over backward point for a maximum.' }
  ],
  'Front Foot_Loft_Third Man': [
    { id: 'SHOT_161', num: '#161', name: 'Lofted Slash to Third Man', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 4, desc: 'Slicing aerially on the front foot over the slip cordon for six.' },
    { id: 'SHOT_162', num: '#162', name: 'Airborne Glide over Third Man', style: 'Placement', risk: 'Medium', timingMod: 4, powerMod: 1, desc: 'Delicate aerial deflection flying over short third man for four.' },
    { id: 'SHOT_163', num: '#163', name: 'Lofted Ramp to Third Man', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Ramping the delivery high over the slips down to third man.' },
    { id: 'SHOT_164', num: '#164', name: 'Slashed Aerial Guide', style: 'Power', risk: 'High', timingMod: 1, powerMod: 5, desc: 'Heavy edge-free slash flying over the third man boundary.' }
  ],

  // ==========================================
  // FRONT FOOT + PUSH
  // ==========================================
  'Front Foot_Push_Cover': [
    { id: 'SHOT_165', num: '#165', name: 'Forward Defensive Push to Cover', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft hands, meeting the ball under the eyes and rolling to cover for a single.' },
    { id: 'SHOT_166', num: '#166', name: 'Checked Push past Extra Cover', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Pushed gently into the gap between cover and mid-off for strike rotation.' },
    { id: 'SHOT_167', num: '#167', name: 'Tapped Block to Cover', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -4, desc: 'Solid defensive wall, dropping dead into the cover ring for a quick run.' }
  ],
  'Front Foot_Push_Long Off': [
    { id: 'SHOT_168', num: '#168', name: 'Straight Forward Push', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Dead straight bat, pushing gently down past the non-striker for an easy one.' },
    { id: 'SHOT_169', num: '#169', name: 'Soft Hands Drive to Long Off', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Controlled push-drive finding the long-off sweeper without risk.' },
    { id: 'SHOT_170', num: '#170', name: 'Forward Block past Bowler', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Smothering the movement, tapping past the bowler\'s follow-through.' }
  ],
  'Front Foot_Push_Long On': [
    { id: 'SHOT_171', num: '#171', name: 'Front Foot On-Side Push', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Front knee forward, pushed softly to long-on for a sharp run.' },
    { id: 'SHOT_172', num: '#172', name: 'Soft Wrist Roll to Long On', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Gentle roll of the wrists guiding the ball smoothly to mid-on.' },
    { id: 'SHOT_173', num: '#173', name: 'Tapped Push past Mid-On', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Neat push beating the inner ring fielder for an easy single.' }
  ],
  'Front Foot_Push_Mid Wicket': [
    { id: 'SHOT_174', num: '#174', name: 'Gentle Clip to Mid-Wicket', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Turning the bat face at the last second, rolling to mid-wicket.' },
    { id: 'SHOT_175', num: '#175', name: 'Front Foot Pad Tuck', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Tucked softly off the pads into the ring for a brisk single.' },
    { id: 'SHOT_176', num: '#176', name: 'Soft Face Deflection to Mid-Wicket', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Nudged into the vacant mid-wicket pocket without breaking a sweat.' }
  ],
  'Front Foot_Push_Square Leg': [
    { id: 'SHOT_177', num: '#177', name: 'Nudged Leg Glance Single', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Brushed off the thigh pad gently towards backward square leg.' },
    { id: 'SHOT_178', num: '#178', name: 'Forward Pad Push to Square', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Controlled push down to deep backward square for an easy single.' },
    { id: 'SHOT_179', num: '#179', name: 'Defensive Sweep Tap', style: 'Innovative', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Soft sweep tap dropping right into the leg-side pocket.' }
  ],
  'Front Foot_Push_Fine Leg': [
    { id: 'SHOT_180', num: '#180', name: 'Fine Pad Deflection Tap', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Deflected fine of the keeper with minimal bat angle.' },
    { id: 'SHOT_181', num: '#181', name: 'Gentle Paddle to Fine Leg', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Soft paddle into the deep fine leg area for strike rotation.' },
    { id: 'SHOT_182', num: '#182', name: 'Ticked Glance behind Wicket', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Glanced off the toes straight down to deep fine leg.' }
  ],
  'Front Foot_Push_Point': [
    { id: 'SHOT_183', num: '#183', name: 'Forward Point Dab', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft-hands dab towards backward point calling for a fast single.' },
    { id: 'SHOT_184', num: '#184', name: 'Pushed Defense to Point', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -4, desc: 'Solid defensive block placed into the point pocket.' },
    { id: 'SHOT_185', num: '#185', name: 'Steered Push through Gully', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Angled bat push finding the vacant gully gap for one run.' }
  ],
  'Front Foot_Push_Third Man': [
    { id: 'SHOT_186', num: '#186', name: 'Delicate Third Man Dab', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft touch guiding the ball down to third man for a simple single.' },
    { id: 'SHOT_187', num: '#187', name: 'Opened Face Touch to Third', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Using pace with soft wrists to rotate strike effortlessly.' },
    { id: 'SHOT_188', num: '#188', name: 'Bunted Glide to Third Man', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Controlled bunt running down the third man alley.' }
  ],

  // ==========================================
  // BACK FOOT + STROKE
  // ==========================================
  'Back Foot_Stroke_Cover': [
    { id: 'SHOT_189', num: '#189', name: 'Back Foot Punch through Cover', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Standing tall on toes, punching a short-of-length ball through extra cover.' },
    { id: 'SHOT_190', num: '#190', name: 'Rocking Back Cover Drive', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Transferring weight back and driving through the off-side gap.' },
    { id: 'SHOT_191', num: '#191', name: 'Checked Back Foot Punch', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Firm wrists and compact stance, pierced between cover and point.' },
    { id: 'SHOT_192', num: '#192', name: 'High-Bounce Cover Slash', style: 'Power', risk: 'Medium', timingMod: 1, powerMod: 4, desc: 'Riding the bounce off the back foot, slashing hard along the turf.' }
  ],
  'Back Foot_Stroke_Long Off': [
    { id: 'SHOT_193', num: '#193', name: 'Back Foot Straight Punch', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Standing tall, punched past the bowler towards long-off.' },
    { id: 'SHOT_194', num: '#194', name: 'Rear Foot Off-Drive', style: 'Attacking', risk: 'Low', timingMod: 3, powerMod: 3, desc: 'Crisp rear-foot punch beating mid-off to the boundary.' },
    { id: 'SHOT_195', num: '#195', name: 'Firm Stance Drive to Long Off', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'High front elbow off the back foot guiding the ball for two.' },
    { id: 'SHOT_196', num: '#196', name: 'Punched Push-Drive', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Punched hard down the ground off the back foot.' }
  ],
  'Back Foot_Stroke_Long On': [
    { id: 'SHOT_197', num: '#197', name: 'Back Foot On-Drive', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Swiveling weight back, stroked straight past mid-on to long-on.' },
    { id: 'SHOT_198', num: '#198', name: 'Rocking Back Mid-On Punch', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Punched firmly between mid-on and bowler along the grass.' },
    { id: 'SHOT_199', num: '#199', name: 'Punched Wrist Stroke', style: 'Placement', risk: 'Low', timingMod: 3, powerMod: 2, desc: 'Rolling wrists off the back leg down the ground.' },
    { id: 'SHOT_200', num: '#200', name: 'Deep Crease Push-Drive', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Deep in the crease, driven firmly through long-on.' }
  ],
  'Back Foot_Stroke_Mid Wicket': [
    { id: 'SHOT_201', num: '#201', name: 'Classic Pull Shot', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 3, desc: 'Rocking back onto the rear foot, swiveling wrists cleanly through mid-wicket.' },
    { id: 'SHOT_202', num: '#202', name: 'Rolling Wrist Ground Pull', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: 1, desc: 'Rolling the wrists over the ball, drilling it along the carpet for four.' },
    { id: 'SHOT_203', num: '#203', name: 'Short-Arm Jab to Mid-Wicket', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Snapping forearms, rocketing through mid-wicket to the fence.' },
    { id: 'SHOT_204', num: '#204', name: 'Deep Crease Pull to Cow Corner', style: 'Power', risk: 'Medium', timingMod: 1, powerMod: 5, desc: 'Hefted off the back foot with power into the deep mid-wicket pocket.' }
  ],
  'Back Foot_Stroke_Square Leg': [
    { id: 'SHOT_205', num: '#205', name: 'Square Pull Shot', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Whipped horizontally across the chest behind square leg.' },
    { id: 'SHOT_206', num: '#206', name: 'Back Foot Leg Glance', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Standing tall on toes, tucked off the ribs behind square.' },
    { id: 'SHOT_207', num: '#207', name: 'Swivel Pull along Grass', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: 1, desc: 'Rolling the ball to the deep square fence along the turf.' },
    { id: 'SHOT_208', num: '#208', name: 'Glanced Hook along Carpet', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Controlled hook kept down along the grass to square leg.' }
  ],
  'Back Foot_Stroke_Fine Leg': [
    { id: 'SHOT_209', num: '#209', name: 'Back Foot Hook Shot', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Quick swivel on the back foot, rolling wrists down to fine leg.' },
    { id: 'SHOT_210', num: '#210', name: 'Fine Leg Deflection off Ribs', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Rising on toes, glanced off the hip fine of the deep fielder.' },
    { id: 'SHOT_211', num: '#211', name: 'Controlled Hook to Fine Leg', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 2, desc: 'Riding the bouncer, keeping it down along the ground for four.' },
    { id: 'SHOT_212', num: '#212', name: 'Tucked Rib Glance', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -1, desc: 'Guided deftly off the chest down to the fine leg boundary.' }
  ],
  'Back Foot_Stroke_Point': [
    { id: 'SHOT_213', num: '#213', name: 'Textbook Square Cut', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 3, desc: 'Leaping onto the back foot, slashing hard through point along the ground.' },
    { id: 'SHOT_214', num: '#214', name: 'Back Foot Scythe through Point', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Carved through the backward point gap with open bat face.' },
    { id: 'SHOT_215', num: '#215', name: 'Delicate Cut through Gully', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: 0, desc: 'Using the extra bounce to beat point towards third man.' },
    { id: 'SHOT_216', num: '#216', name: 'Chopped Cut through Point', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 3, desc: 'Steep angle chop finding the backward point boundary.' }
  ],
  'Back Foot_Stroke_Third Man': [
    { id: 'SHOT_217', num: '#217', name: 'Classic Late Cut', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: 0, desc: 'Opening the blade face late, dabbing right past first slip to third man.' },
    { id: 'SHOT_218', num: '#218', name: 'Back Foot Steer to Third', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Using the bowler\'s speed to glide the ball to the third man rope.' },
    { id: 'SHOT_219', num: '#219', name: 'Dabbed Cut to Third Man', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Delicate touch running down to the boundary without risk.' },
    { id: 'SHOT_220', num: '#220', name: 'Upper Glide to Third Man', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 2, desc: 'Riding the bouncer with an open bat face down to third man.' }
  ],

  // ==========================================
  // BACK FOOT + LOFT
  // ==========================================
  'Back Foot_Loft_Cover': [
    { id: 'SHOT_221', num: '#221', name: 'Lofted Back Foot Punch', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Rising tall on toes, lofting a short ball high over extra cover.' },
    { id: 'SHOT_222', num: '#222', name: 'Carved Back Foot Loft', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Powerful heave clearing the cover ropes into the stands.' },
    { id: 'SHOT_223', num: '#223', name: 'Inside-Out Back Foot Loft', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Backing away to clear the off-side ring with aerial majesty.' }
  ],
  'Back Foot_Loft_Long Off': [
    { id: 'SHOT_224', num: '#224', name: 'Lofted Straight Punch', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'High aerial punch clearing mid-off for a towering maximum.' },
    { id: 'SHOT_225', num: '#225', name: 'Standing Tall Off-Side Loft', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 5, desc: 'Towering straight hit off the back foot sailing over long-off.' },
    { id: 'SHOT_226', num: '#226', name: 'Power Cleared Mid-Off Bomb', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Raw muscle off the back leg sailing deep into the stands.' }
  ],
  'Back Foot_Loft_Long On': [
    { id: 'SHOT_227', num: '#227', name: 'Back Foot Power Heave to Long On', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Deep in crease, muscular heave sailing clean over long-on.' },
    { id: 'SHOT_228', num: '#228', name: 'Towering Lofted On-Drive', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Sailing high and deep over mid-on for an effortless six.' },
    { id: 'SHOT_229', num: '#229', name: 'Rear-Leg Cleared Long On', style: 'Attacking', risk: 'Medium', timingMod: 2, powerMod: 5, desc: 'Huge swing off the back leg beating the deep boundary fielder.' }
  ],
  'Back Foot_Loft_Mid Wicket': [
    { id: 'SHOT_230', num: '#230', name: 'Monstrous Aerial Pull Shot', style: 'Power', risk: 'High', timingMod: 2, powerMod: 7, desc: 'Cracking hook-pull hit deep into the second tier of mid-wicket!' },
    { id: 'SHOT_231', num: '#231', name: 'Explosive Short-Arm Jab', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 5, desc: 'Explosive forearms clearing mid-wicket into the crowd.' },
    { id: 'SHOT_232', num: '#232', name: 'Swivel Pull over Cow Corner', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 5, desc: 'Effortless swivel rotation over cow corner for a massive hit.' }
  ],
  'Back Foot_Loft_Square Leg': [
    { id: 'SHOT_233', num: '#233', name: 'Hook Shot into the Crowd', style: 'Power', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Top-spin bouncer launched high over backward square leg.' },
    { id: 'SHOT_234', num: '#234', name: 'Aerial Swivel Pull Shot', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Helicopter-like swivel turn sending the ball over the square fence.' },
    { id: 'SHOT_235', num: '#235', name: 'Upper Swat over Square Leg', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Powerful top-hand hook sailing into the square leg stands.' }
  ],
  'Back Foot_Loft_Fine Leg': [
    { id: 'SHOT_236', num: '#236', name: 'Top-Edge Hook over Fine Leg', style: 'Innovative', risk: 'High', timingMod: 3, powerMod: 4, desc: 'Flicked off the nose into the stands behind square.' },
    { id: 'SHOT_237', num: '#237', name: 'Hook over Wicketkeeper', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Blistering ramp over the fine leg boundary for six.' },
    { id: 'SHOT_238', num: '#238', name: 'Helicopter Hook Shot', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Twisting hook sending the bouncer soaring over fine leg.' }
  ],
  'Back Foot_Loft_Point': [
    { id: 'SHOT_239', num: '#239', name: 'Slashed Upper Cut over Point', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Flying slash over backward point clearing the deep boundary.' },
    { id: 'SHOT_240', num: '#240', name: 'Carved Lofted Square Cut', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Carved high over the point ropes with textbook horizontal blade.' },
    { id: 'SHOT_241', num: '#241', name: 'Rising Aerial Slash to Point', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Rising high over the infield ring into the stands.' }
  ],
  'Back Foot_Loft_Third Man': [
    { id: 'SHOT_242', num: '#242', name: 'Upper Cut over Third Man', style: 'Classical', risk: 'High', timingMod: 3, powerMod: 4, desc: 'Guiding the 145km/h bouncer over the slip cordon for six.' },
    { id: 'SHOT_243', num: '#243', name: 'Lofted Late Cut', style: 'Placement', risk: 'Medium', timingMod: 4, powerMod: 2, desc: 'High deflection clearing the third man rope for four.' },
    { id: 'SHOT_244', num: '#244', name: 'Slashed Ramp to Third Man', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Ramping the fast delivery cleanly over third man.' }
  ],

  // ==========================================
  // BACK FOOT + PUSH
  // ==========================================
  'Back Foot_Push_Cover': [
    { id: 'SHOT_245', num: '#245', name: 'Back Foot Defense to Cover', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Solid wall, dropping dead at feet towards cover for one.' },
    { id: 'SHOT_246', num: '#246', name: 'Checked Back Foot Tap', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Soft touch into cover for a quick single.' },
    { id: 'SHOT_247', num: '#247', name: 'Rocking Back Block', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -4, desc: 'Steering the ball gently into the off-side ring.' }
  ],
  'Back Foot_Push_Long Off': [
    { id: 'SHOT_248', num: '#248', name: 'Straight Back Foot Block', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Dead bat, rolling softly past the bowler towards long-off.' },
    { id: 'SHOT_249', num: '#249', name: 'Punched Single to Long Off', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Solid contact off the back foot for strike rotation.' },
    { id: 'SHOT_250', num: '#250', name: 'High Elbow Rear Defense', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Textbook back foot block finding the mid-off gap.' }
  ],
  'Back Foot_Push_Long On': [
    { id: 'SHOT_251', num: '#251', name: 'Back Foot Mid-On Tap', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Nudged straight to mid-on with soft hands for a run.' },
    { id: 'SHOT_252', num: '#252', name: 'Soft Wrists Rear Push', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Rolled off the hips safely down to long-on.' },
    { id: 'SHOT_253', num: '#253', name: 'Controlled Back Foot Bunt', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Solid block into the leg-side for an easy rotation.' }
  ],
  'Back Foot_Push_Mid Wicket': [
    { id: 'SHOT_254', num: '#254', name: 'Back Foot Tuck to Mid-Wicket', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Glanced off the thigh pad towards mid-wicket.' },
    { id: 'SHOT_255', num: '#255', name: 'Soft Hands Pull Tap', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Controlled drop into mid-wicket for a quick single.' },
    { id: 'SHOT_256', num: '#256', name: 'Rolling Pad Block', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Tapped softly into the inner circle without danger.' }
  ],
  'Back Foot_Push_Square Leg': [
    { id: 'SHOT_257', num: '#257', name: 'Rear Leg Glance Tap', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft touch behind the stumps rolling to square leg.' },
    { id: 'SHOT_258', num: '#258', name: 'Tucked Single to Square Leg', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Turn of the wrists behind square for a comfortable run.' },
    { id: 'SHOT_259', num: '#259', name: 'Defensive Rear Swivel', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Controlled nudge behind square leg keeping strike moving.' }
  ],
  'Back Foot_Push_Fine Leg': [
    { id: 'SHOT_260', num: '#260', name: 'Fine Deflection Tap', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Guided off the toes fine of the keeper for a run.' },
    { id: 'SHOT_261', num: '#261', name: 'Back Foot Tickle to Fine Leg', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Soft edge-free glance down to deep fine leg.' },
    { id: 'SHOT_262', num: '#262', name: 'Behind Stumps Rear Touch', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Brushed lightly behind the wicket for a single.' }
  ],
  'Back Foot_Push_Point': [
    { id: 'SHOT_263', num: '#263', name: 'Back Foot Point Dab', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft hands dab towards backward point calling for a run.' },
    { id: 'SHOT_264', num: '#264', name: 'Solid Square Defense', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -4, desc: 'Squaring up to block softly towards the point fielder.' },
    { id: 'SHOT_265', num: '#265', name: 'Guided Chop into Ground', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Chopped safely into the turf past point.' }
  ],
  'Back Foot_Push_Third Man': [
    { id: 'SHOT_266', num: '#266', name: 'Late Glide Single to Third', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Deft touch to third man for a simple single.' },
    { id: 'SHOT_267', num: '#267', name: 'Dabbed Touch to Deep Third', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Using the bowler\'s speed to push safely down.' },
    { id: 'SHOT_268', num: '#268', name: 'Soft Face Rear Steer', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Guiding the ball safely past slip to third man.' }
  ],

  // ==========================================
  // ADVANCED + STROKE
  // ==========================================
  'Advanced_Stroke_Cover': [
    { id: 'SHOT_269', num: '#269', name: 'Dancing Down Inside-Out Drive', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Stepping out, caressing along the turf through cover for four.' },
    { id: 'SHOT_270', num: '#270', name: 'Charged Cover Stroke', style: 'Classical', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Meeting the ball on the half-volley through extra cover.' },
    { id: 'SHOT_271', num: '#271', name: 'Stepped-Out Check Drive', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Dancing forward, placing into the cover gap with elegance.' }
  ],
  'Advanced_Stroke_Long Off': [
    { id: 'SHOT_272', num: '#272', name: 'Charging Straight Stroke', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Stepping out, punching along the carpet past mid-off for four.' },
    { id: 'SHOT_273', num: '#273', name: 'Advanced Off-Drive', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Reaching to the pitch of the ball, driven along the turf.' },
    { id: 'SHOT_274', num: '#274', name: 'Flowing Charge to Long Off', style: 'Power', risk: 'Medium', timingMod: 2, powerMod: 4, desc: 'Classy footwork piercing the inner ring to the boundary.' }
  ],
  'Advanced_Stroke_Long On': [
    { id: 'SHOT_275', num: '#275', name: 'Charging On-Drive', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Dancing down, presenting full face past mid-on for four.' },
    { id: 'SHOT_276', num: '#276', name: 'Stepped-Out Straight Stroke', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Meeting on the full, stroked down the ground to long-on.' },
    { id: 'SHOT_277', num: '#277', name: 'Advanced Wristy Drive', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Rolling wrists along the grass to long-on for two.' }
  ],
  'Advanced_Stroke_Mid Wicket': [
    { id: 'SHOT_278', num: '#278', name: 'Dancing Wrist Whip', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 3, desc: 'Dancing down, whipping through mid-wicket to the fence.' },
    { id: 'SHOT_279', num: '#279', name: 'Stepped-Out Flick to Cow Corner', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Flicked off the pads along the deck to cow corner.' },
    { id: 'SHOT_280', num: '#280', name: 'Advanced Clip through Mid-Wicket', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Picking the length early, piercing mid-wicket for four.' }
  ],
  'Advanced_Stroke_Square Leg': [
    { id: 'SHOT_281', num: '#281', name: 'Advanced Paddle Sweep', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 2, desc: 'Stepping across, paddling along the turf to square leg.' },
    { id: 'SHOT_282', num: '#282', name: 'Dancing Leg Glance', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Dancing out, clipping cleanly behind square for two.' },
    { id: 'SHOT_283', num: '#283', name: 'Stepped-Out Deflection', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Meeting early and angling the ball safely to square leg.' }
  ],
  'Advanced_Stroke_Fine Leg': [
    { id: 'SHOT_284', num: '#284', name: 'Stepped-Out Fine Paddle', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 2, desc: 'Walking down and across, guided fine to the boundary.' },
    { id: 'SHOT_285', num: '#285', name: 'Advanced Tickle past Keeper', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Flicked off the pads past the keeper for a boundary.' },
    { id: 'SHOT_286', num: '#286', name: 'Walking Flick to Fine Leg', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Using the pace of the delivery down to deep fine leg.' }
  ],
  'Advanced_Stroke_Point': [
    { id: 'SHOT_287', num: '#287', name: 'Dancing Square Punch', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Stepping out, punched squarely through point for four.' },
    { id: 'SHOT_288', num: '#288', name: 'Advanced Slice to Point', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Clever angle finding the backward point gap.' },
    { id: 'SHOT_289', num: '#289', name: 'Charged Drive through Point', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 2, desc: 'Piercing cleanly between point and cover.' }
  ],
  'Advanced_Stroke_Third Man': [
    { id: 'SHOT_290', num: '#290', name: 'Dancing Late Guide', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Stepping out, angling late to third man for two.' },
    { id: 'SHOT_291', num: '#291', name: 'Advanced Steer to Third', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 1, desc: 'Using the open blade to run it fine to the fence.' },
    { id: 'SHOT_292', num: '#292', name: 'Walking Dab to Third Man', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -1, desc: 'Delicate placement to deep third man.' }
  ],

  // ==========================================
  // ADVANCED + LOFT
  // ==========================================
  'Advanced_Loft_Cover': [
    { id: 'SHOT_293', num: '#293', name: 'Dancing Inside-Out Loft over Cover', style: 'Attacking', risk: 'High', timingMod: 3, powerMod: 5, desc: 'Charging down, carving majestically over extra cover for six!' },
    { id: 'SHOT_294', num: '#294', name: 'Stepped-Out Aerial Cover Drive', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Lofted clean over the 30-yard ring into the fence.' },
    { id: 'SHOT_295', num: '#295', name: 'Walking High Drive over Cover', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Massive aerial extension over deep cover into the crowd.' }
  ],
  'Advanced_Loft_Long Off': [
    { id: 'SHOT_296', num: '#296', name: 'Downtown Towering Loft over Long Off', style: 'Power', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Full swing of the bat dancing down the track into the stands!' },
    { id: 'SHOT_297', num: '#297', name: 'Dancing Straight Loft over Mid-Off', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Sailing high and true over mid-off for a clean six.' },
    { id: 'SHOT_298', num: '#298', name: 'Charging Lofted Drive', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Reaching the pitch, launching into orbit over long-off.' }
  ],
  'Advanced_Loft_Long On': [
    { id: 'SHOT_299', num: '#299', name: 'Monstrous Downtown Loft over Long On', style: 'Power', risk: 'High', timingMod: 2, powerMod: 7, desc: 'Dancing down the track, a monstrous 105m hit over long-on!' },
    { id: 'SHOT_300', num: '#300', name: 'Helicopter Loft over Long On', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Step-out wrist whip over mid-on directly into the roof!' },
    { id: 'SHOT_301', num: '#301', name: 'Step-Out Clean Launch to Long On', style: 'Classical', risk: 'Medium', timingMod: 4, powerMod: 4, desc: 'Lofted with supreme confidence straight back over the bowler.' }
  ],
  'Advanced_Loft_Mid Wicket': [
    { id: 'SHOT_302', num: '#302', name: 'Dancing Aerial Slog Sweep', style: 'Power', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Advancing and kneeling, deposited into the top tier of mid-wicket!' },
    { id: 'SHOT_303', num: '#303', name: 'Stepped-Out Heave over Mid-Wicket', style: 'Attacking', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Clobbered high and handsome over cow corner.' },
    { id: 'SHOT_304', num: '#304', name: 'Dancing Aerial Pick-Up Shot', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Flicked high off the hips into the mid-wicket crowd.' }
  ],
  'Advanced_Loft_Square Leg': [
    { id: 'SHOT_305', num: '#305', name: 'Walking Slog over Square Leg', style: 'Power', risk: 'High', timingMod: 2, powerMod: 6, desc: 'Charging out and pulling with ferocity over deep square for six.' },
    { id: 'SHOT_306', num: '#306', name: 'Dancing Aerial Sweep', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Launched high over the square leg fence for a maximum.' },
    { id: 'SHOT_307', num: '#307', name: 'Stepped-Out Hook Shot', style: 'Attacking', risk: 'High', timingMod: 1, powerMod: 5, desc: 'Swiveled high over the square boundary into the second tier.' }
  ],
  'Advanced_Loft_Fine Leg': [
    { id: 'SHOT_308', num: '#308', name: 'Dilscoop / Ramp over Fine Leg', style: 'Innovative', risk: 'High', timingMod: 3, powerMod: 5, desc: 'Dropping to one knee, ramping directly over the wicketkeeper for six!' },
    { id: 'SHOT_309', num: '#309', name: 'Dancing Scoop Shot', style: 'Innovative', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Walking across stumps, scooped gracefully over fine leg.' },
    { id: 'SHOT_310', num: '#310', name: 'Stepped-Out Aerial Flick to Fine Leg', style: 'Classical', risk: 'Medium', timingMod: 3, powerMod: 4, desc: 'Flicked high over the fine leg ropes for a maximum.' }
  ],
  'Advanced_Loft_Point': [
    { id: 'SHOT_311', num: '#311', name: 'Stepped-Out Slash over Point', style: 'Attacking', risk: 'High', timingMod: 2, powerMod: 5, desc: 'Dancing out, sliced over deep backward point into the crowd.' },
    { id: 'SHOT_312', num: '#312', name: 'Dancing Aerial Carve to Point', style: 'Innovative', risk: 'High', timingMod: 3, powerMod: 4, desc: 'Stepping away, lofted over the point boundary for six.' },
    { id: 'SHOT_313', num: '#313', name: 'Carved Aerial Loft over Point', style: 'Power', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Clearing the boundary rider with immense power.' }
  ],
  'Advanced_Loft_Third Man': [
    { id: 'SHOT_314', num: '#314', name: 'Dancing Ramp to Third Man', style: 'Innovative', risk: 'High', timingMod: 3, powerMod: 4, desc: 'Walking across, ramping over the slip cordon for a maximum.' },
    { id: 'SHOT_315', num: '#315', name: 'Stepped-Out Reverse Ramp', style: 'Innovative', risk: 'High', timingMod: 1, powerMod: 6, desc: 'Reverse angled ramp sailing way over third man into the stands.' },
    { id: 'SHOT_316', num: '#316', name: 'Lofted Upper Glide to Third Man', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 3, desc: 'Stepping out, slicing high over third man for four.' }
  ],

  // ==========================================
  // ADVANCED + PUSH
  // ==========================================
  'Advanced_Push_Cover': [
    { id: 'SHOT_317', num: '#317', name: 'Stepped-Out Push to Cover', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Dancing down, gentle tap into the cover ring for a single.' },
    { id: 'SHOT_318', num: '#318', name: 'Charged Smother Block', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Advancing to smother the spin and pushing safely for one.' },
    { id: 'SHOT_319', num: '#319', name: 'Walking Cover Defense', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Meeting the ball on the half volley towards cover.' }
  ],
  'Advanced_Push_Long Off': [
    { id: 'SHOT_320', num: '#320', name: 'Dancing Push to Long Off', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Pushed firmly past the bowler to rotate strike.' },
    { id: 'SHOT_321', num: '#321', name: 'Smothered Drive to Mid-Off', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Advancing, pushing softly past mid-off for a single.' },
    { id: 'SHOT_322', num: '#322', name: 'Charged Straight Push', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Straight bat push down the ground to long-off.' }
  ],
  'Advanced_Push_Long On': [
    { id: 'SHOT_323', num: '#323', name: 'Stepped-Out On-Push', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Advancing down, rolled to long-on for an easy run.' },
    { id: 'SHOT_324', num: '#324', name: 'Dancing Single to Long On', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -1, desc: 'Meeting on the pitch, guided for a comfortable single.' },
    { id: 'SHOT_325', num: '#325', name: 'Smothered On-Drive', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft hands push into mid-on without risk.' }
  ],
  'Advanced_Push_Mid Wicket': [
    { id: 'SHOT_326', num: '#326', name: 'Dancing Push to Mid-Wicket', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Stepped out, turned softly into the leg side.' },
    { id: 'SHOT_327', num: '#327', name: 'Advanced Pad Nudge', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Nudged gently into the ring for a brisk single.' },
    { id: 'SHOT_328', num: '#328', name: 'Walking Flick Tap', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Soft touch past the bowler\'s legs into mid-wicket.' }
  ],
  'Advanced_Push_Square Leg': [
    { id: 'SHOT_329', num: '#329', name: 'Stepped-Out Square Nudge', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Walking across, nudged behind square for a single.' },
    { id: 'SHOT_330', num: '#330', name: 'Advanced Paddle Tap', style: 'Innovative', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Soft paddle for a single down to square leg.' },
    { id: 'SHOT_331', num: '#331', name: 'Dancing Glance to Square', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Deflected softly along the ground behind square.' }
  ],
  'Advanced_Push_Fine Leg': [
    { id: 'SHOT_332', num: '#332', name: 'Walking Deflection to Fine Leg', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -2, desc: 'Walking across, steered fine of the keeper for one.' },
    { id: 'SHOT_333', num: '#333', name: 'Dancing Paddle Single', style: 'Innovative', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Tapped gently behind the keeper for a quick run.' },
    { id: 'SHOT_334', num: '#334', name: 'Stepped-Out Fine Glance', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Brushed softly towards deep fine leg.' }
  ],
  'Advanced_Push_Point': [
    { id: 'SHOT_335', num: '#335', name: 'Stepped-Out Dab to Point', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Advancing, dabbed with soft wrists into the point pocket.' },
    { id: 'SHOT_336', num: '#336', name: 'Dancing Chop into Pitch', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Chopped safely into the turf towards point for one.' },
    { id: 'SHOT_337', num: '#337', name: 'Walking Push through Gully', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Guided past point for a brisk single.' }
  ],
  'Advanced_Push_Third Man': [
    { id: 'SHOT_338', num: '#338', name: 'Dancing Glide to Third Man', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Walking forward, angling late to third man for one.' },
    { id: 'SHOT_339', num: '#339', name: 'Stepped-Out Late Dab', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: -2, desc: 'Opened face guidance down the ground to third man.' },
    { id: 'SHOT_340', num: '#340', name: 'Walking Steer to Deep Third', style: 'Placement', risk: 'Low', timingMod: 5, powerMod: -3, desc: 'Using the pace of the bowler for an easy rotation.' }
  ],

  // ==========================================
  // LEAVE TECHNIQUES (Front Foot, Back Foot, Advanced)
  // ==========================================
  'Front Foot_Leave_In Line': [
    { id: 'SHOT_341', num: '#341', name: 'Textbook High-Elbow Leave', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: 0, desc: 'High front elbow, bat raised high above the shoulder, watching the ball pass safely outside off-stump.' },
    { id: 'SHOT_342', num: '#342', name: 'Shoulder Arms Outside Off', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Classic Test match shoulder-arms, tucking the bat behind the pads to let the outswinger pass.' },
    { id: 'SHOT_343', num: '#343', name: 'Forward Pad-Away Deflection', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Thrusting the front pad forward outside off-stump with bat hidden safely behind to cover the corridor.' },
    { id: 'SHOT_344', num: '#344', name: 'Flowing Decoy Leave', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 0, desc: 'Feigning a cover drive before withdrawing the hands late with supreme bat control.' }
  ],
  'Back Foot_Leave_In Line': [
    { id: 'SHOT_345', num: '#345', name: 'Sway & Duck Under Bouncer', style: 'Classical', risk: 'Low', timingMod: 5, powerMod: 0, desc: 'Arched spine and smooth neck tuck, swaying effortlessly underneath the searing bouncer.' },
    { id: 'SHOT_346', num: '#346', name: 'Deep-Crease High Hands Leave', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Standing tall on toes deep in the crease, keeping hands high and letting the ball sail over bails.' },
    { id: 'SHOT_347', num: '#347', name: 'Backward Body Weave', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Weaving upper body backward away from the corridor of uncertainty with eagle-eyed vigilance.' },
    { id: 'SHOT_348', num: '#348', name: 'Crease-Depth Drop Leave', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 0, desc: 'Dropping wrists at the very last millisecond as the ball cuts past off-stump.' }
  ],
  'Advanced_Leave_In Line': [
    { id: 'SHOT_349', num: '#349', name: 'Stepped-Out Spin Pad-Away', style: 'Classical', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Dancing out of the crease to reach the pitch of the turning ball, offering pad well outside off.' },
    { id: 'SHOT_350', num: '#350', name: 'Charge & Watch Through', style: 'Placement', risk: 'Low', timingMod: 4, powerMod: 0, desc: 'Advancing two steps, reading flight and drift, then lifting the bat up high to let it pass.' },
    { id: 'SHOT_351', num: '#351', name: 'Drift-Cover Spin Leave', style: 'Innovative', risk: 'Medium', timingMod: 3, powerMod: 0, desc: 'Walking down the deck, smothering the trajectory and letting the turning delivery safely miss.' },
    { id: 'SHOT_352', num: '#352', name: 'Decoy Step Shoulder Arms', style: 'Attacking', risk: 'Medium', timingMod: 3, powerMod: 0, desc: 'Stepping down like preparing for a straight launch, then decisively shouldering arms to confuse bowler.' }
  ]
};

// Build flat index by Shot ID
export const SHOTS_BY_ID = {};
for (const [comboKey, shots] of Object.entries(SHOTALOG_OR_CATALOG())) {
  shots.forEach(shot => {
    SHOTS_BY_ID[shot.id] = { ...shot, comboKey };
  });
}

function SHOTALOG_OR_CATALOG() {
  return SHOT_CATALOG;
}

/**
 * Returns the list of 3-4 shots available for a combination
 */
export function getShotsForCombo(footwork, intent, zone) {
  const key = getComboKey(footwork, intent, zone);
  return SHOT_CATALOG[key] || [
    { id: 'SHOT_DEF', num: '#100', name: `${intent} towards ${zone}`, style: 'Classical', risk: 'Low', timingMod: 0, powerMod: 0, desc: `Executed with a standard ${intent.toLowerCase()} stroke towards ${zone}.` }
  ];
}

/**
 * Returns the default shot for a combination (index 0)
 */
export function getDefaultShot(footwork, intent, zone) {
  const list = getShotsForCombo(footwork, intent, zone);
  return list[0];
}

export function getShotById(shotId) {
  if (!shotId) return null;
  if (SHOTS_BY_ID[shotId]) return SHOTS_BY_ID[shotId];
  const sStr = String(shotId).trim();
  // Try clean uppercase replacement of # -> SHOT_
  if (sStr.startsWith('#')) {
    const numPart = sStr.slice(1);
    if (SHOTS_BY_ID[`SHOT_${numPart}`]) return SHOTS_BY_ID[`SHOT_${numPart}`];
  }
  if (SHOTS_BY_ID[`SHOT_${sStr}`]) return SHOTS_BY_ID[`SHOT_${sStr}`];
  // Search by num or name
  for (const s of Object.values(SHOTS_BY_ID)) {
    if (s.num === sStr || s.name.toLowerCase() === sStr.toLowerCase()) {
      return s;
    }
  }
  return null;
}

/**
 * Gets the player's equipped shot for a specific combination.
 * Checks SQLite table `player_shot_presets`. If none equipped, returns default.
 */
export function getPlayerEquippedShot(playerId, footwork, intent, zone) {
  const comboKey = getComboKey(footwork, intent, zone);
  try {
    const row = db.prepare('SELECT shot_id FROM player_shot_presets WHERE player_id = ? AND combo_key = ?').get(playerId, comboKey);
    if (row && row.shot_id && SHOTS_BY_ID[row.shot_id]) {
      return SHOTS_BY_ID[row.shot_id];
    }
  } catch (err) {
    console.error('Error fetching player equipped shot:', err);
  }
  return getDefaultShot(footwork, intent, zone);
}

/**
 * Equips a specific shot for a combination in the player's preset.
 */
export function setPlayerEquippedShot(playerId, footwork, intent, zone, shotId) {
  const comboKey = getComboKey(footwork, intent, zone);
  const shot = getShotById(shotId);
  if (!shot) {
    throw new Error(`Invalid Shot ID: ${shotId}`);
  }

  db.prepare(`
    INSERT INTO player_shot_presets (player_id, combo_key, shot_id)
    VALUES (?, ?, ?)
    ON CONFLICT(player_id, combo_key) DO UPDATE SET shot_id = excluded.shot_id
  `).run(playerId, comboKey, shotId);

  return shot;
}

/**
 * Get all customized shots for a player
 */
export function getPlayerCustomPreset(playerId) {
  try {
    const rows = db.prepare('SELECT combo_key, shot_id FROM player_shot_presets WHERE player_id = ?').all(playerId);
    const map = {};
    for (const r of rows) {
      if (SHOTS_BY_ID[r.shot_id]) {
        map[r.combo_key] = SHOTS_BY_ID[r.shot_id];
      }
    }
    return map;
  } catch (err) {
    console.error('Error getting player custom preset:', err);
    return {};
  }
}

/**
 * Reset player preset to defaults
 */
export function resetPlayerPreset(playerId) {
  db.prepare('DELETE FROM player_shot_presets WHERE player_id = ?').run(playerId);
}
