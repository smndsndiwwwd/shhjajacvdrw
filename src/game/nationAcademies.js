export function generateAcademiesForNation(nationName) {
  const norm = nationName.trim().toLowerCase();

  const data = {
    india: [
      { id: 'ind_mumbai', name: 'Mumbai Cricket Association Academy', state: 'Mumbai', rating: 5, reputation: 'World Class', specialty: 'Batting Technique', coachRating: 'Elite (Coach Sachin)', trainingBonusText: '+10% Batting XP, +8% Technique', bonuses: { batting: 1.10, technique: 1.08 }, graduatesDomestic: 145, graduatesInternational: 42, successRate: '78%', history: 'The legendary training ground producing Mumbai\'s Ranji trophy giants and multiple international batting icons.' },
      { id: 'ind_nca', name: 'National Cricket Academy Bangalore', state: 'Karnataka', rating: 5, reputation: 'World Class', specialty: 'Balanced Fundamentals', coachRating: 'Elite (Coach Rahul)', trainingBonusText: '+8% Batting, +8% Bowling XP', bonuses: { batting: 1.08, bowling: 1.08 }, graduatesDomestic: 198, graduatesInternational: 60, successRate: '82%', history: 'The pinnacle of high performance development in India, coordinating national team rehab and elite junior camps.' },
      { id: 'ind_delhi', name: 'Delhi & District Cricket Academy', state: 'Delhi', rating: 4, reputation: 'Elite', specialty: 'Power Hitting & Aggression', coachRating: 'Excellent (Coach Virat)', trainingBonusText: '+10% Power, +8% Aggression', bonuses: { power: 1.10, aggression: 1.08 }, graduatesDomestic: 112, graduatesInternational: 29, successRate: '68%', history: 'Known for nurturing fearless, aggressive batsmen who thrive under high pressure and fast-paced formats.' },
      { id: 'ind_tnca', name: 'Tamil Nadu Cricket Academy', state: 'Tamil Nadu', rating: 4, reputation: 'Elite', specialty: 'Spin Mastery & Tactics', coachRating: 'Excellent (Coach Ashwin)', trainingBonusText: '+10% Spin Bowler, +8% Mentality', bonuses: { spin_bowling: 1.10, mentality: 1.08 }, graduatesDomestic: 98, graduatesInternational: 18, successRate: '65%', history: 'Situated on the turning decks of Chennai, specializing in producing world-class spinners and tactical run-accumulators.' },
      { id: 'ind_ksca', name: 'KSCA Academy Bengaluru', state: 'Karnataka', rating: 4, reputation: 'Elite', specialty: 'Pace & Athletics', coachRating: 'Excellent (Coach Kumble)', trainingBonusText: '+8% Pace Bowler, +10% Fitness', bonuses: { pace_bowling: 1.08, fitness: 1.10 }, graduatesDomestic: 105, graduatesInternational: 22, successRate: '70%', history: 'Focuses heavily on biomechanics, fitness tracking, and developing fast-bowling stamina.' },
      { id: 'ind_cab', name: 'Cricket Association of Bengal Academy', state: 'Bengal', rating: 4, reputation: 'Elite', specialty: 'Swing Bowling & Leadership', coachRating: 'Excellent (Coach Dada)', trainingBonusText: '+10% Swing, +8% Mentality', bonuses: { swing: 1.10, mentality: 1.08 }, graduatesDomestic: 89, graduatesInternational: 14, successRate: '62%', history: 'Produces swing bowlers capable of moving the red ball both ways under overcast conditions.' },
      { id: 'ind_upca', name: 'UPCA Academy Kanpur', state: 'Uttar Pradesh', rating: 3, reputation: 'Highly Renowned', specialty: 'Seam & Swing Bowling', coachRating: 'Specialist (Coach Bhuvneshwar)', trainingBonusText: '+10% Swing, +6% Seam', bonuses: { swing: 1.10, seam: 1.06 }, graduatesDomestic: 74, graduatesInternational: 11, successRate: '58%', history: 'A famous nursery for swing bowlers who utilize the humid weather and green-tinged tracks of Uttar Pradesh.' },
      { id: 'ind_pca', name: 'Punjab Cricket Academy Mohali', state: 'Punjab', rating: 4, reputation: 'Elite', specialty: 'Aggressive Batting', coachRating: 'Excellent (Coach Yuvi)', trainingBonusText: '+8% Batting, +10% Power', bonuses: { batting: 1.08, power: 1.10 }, graduatesDomestic: 82, graduatesInternational: 16, successRate: '64%', history: 'Known for nurturing tall, heavy-hitting players who clear boundaries at will.' },
      { id: 'ind_baroda', name: 'Baroda Cricket Academy', state: 'Baroda', rating: 3, reputation: 'Highly Renowned', specialty: 'All-Round Development', coachRating: 'Specialist (Coach Hardik)', trainingBonusText: '+6% Batting, +6% Bowling, +6% Fitness', bonuses: { batting: 1.06, bowling: 1.06, fitness: 1.06 }, graduatesDomestic: 68, graduatesInternational: 9, successRate: '55%', history: 'A prestigious academy focused on multi-dimensional training for versatile all-rounders.' },
      { id: 'ind_saurashtra', name: 'Saurashtra Cricket Academy', state: 'Saurashtra', rating: 3, reputation: 'Highly Renowned', specialty: 'Defensive Batting', coachRating: 'Specialist (Coach Cheteshwar)', trainingBonusText: '+10% Defense, +8% Technique', bonuses: { defense: 1.10, technique: 1.08 }, graduatesDomestic: 54, graduatesInternational: 7, successRate: '50%', history: 'Teaches classic test match batting: patience, soft hands, and absolute defensive resilience.' },
      { id: 'ind_rajasthan', name: 'Rajasthan Cricket Academy', state: 'Rajasthan', rating: 3, reputation: 'National Standard', specialty: 'Bowler Accuracy', coachRating: 'Specialist (Coach Chahar)', trainingBonusText: '+10% Accuracy, +6% Swing', bonuses: { accuracy: 1.10, swing: 1.06 }, graduatesDomestic: 49, graduatesInternational: 5, successRate: '48%', history: 'Emphasizes spot bowling, discipline, and building pressure through dot balls.' },
      { id: 'ind_hyderabad', name: 'Hyderabad Cricket Association Academy', state: 'Hyderabad', rating: 3, reputation: 'National Standard', specialty: 'Wristy Batting & Spin Play', coachRating: 'Specialist (Coach Laxman)', trainingBonusText: '+10% Timing, +6% Technique', bonuses: { timing: 1.10, technique: 1.06 }, graduatesDomestic: 61, graduatesInternational: 8, successRate: '52%', history: 'Famed for wristy strokeplay, teaching batsmen to guide deliveries to the boundary with ease.' },
      { id: 'ind_mpca', name: 'Madhya Pradesh Cricket Academy', state: 'Madhya Pradesh', rating: 3, reputation: 'National Standard', specialty: 'Game Mentality', coachRating: 'Specialist (Coach Pandit)', trainingBonusText: '+12% Mentality, +6% Defense', bonuses: { mentality: 1.12, defense: 1.06 }, graduatesDomestic: 57, graduatesInternational: 4, successRate: '51%', history: 'Run like a military camp. Instills discipline, rigorous routine, and mental toughness.' },
      { id: 'ind_gujarat', name: 'Gujarat Cricket Academy Ahmedabad', state: 'Gujarat', rating: 3, reputation: 'National Standard', specialty: 'Speed & Running', coachRating: 'Specialist (Coach Parthiv)', trainingBonusText: '+10% Running, +8% Reflex', bonuses: { running: 1.10, reflex: 1.08 }, graduatesDomestic: 52, graduatesInternational: 6, successRate: '47%', history: 'Uses advanced athletic drills to produce lightning-fast runners and agile fielders.' },
      { id: 'ind_vidarbha', name: 'Vidarbha Cricket Academy Nagpur', state: 'Vidarbha', rating: 3, reputation: 'National Standard', specialty: 'Seam bowling & Discipline', coachRating: 'Specialist (Coach Umesh)', trainingBonusText: '+8% Seam, +8% Accuracy', bonuses: { seam: 1.08, accuracy: 1.08 }, graduatesDomestic: 44, graduatesInternational: 3, successRate: '45%', history: 'Reaped back-to-back Ranji titles through team chemistry and consistent seam bowling.' }
    ],
    australia: [
      { id: 'aus_nsw', name: 'Cricket NSW Academy', state: 'New South Wales', rating: 5, reputation: 'World Class', specialty: 'Fast Bowling & Bounce', coachRating: 'Elite (Coach McGrath)', trainingBonusText: '+10% Pace Bowler, +8% Accuracy', bonuses: { pace_bowling: 1.10, accuracy: 1.08 }, graduatesDomestic: 152, graduatesInternational: 48, successRate: '80%', history: 'The ultimate production line for Australian baggy green caps, known for hostile fast bowling.' },
      { id: 'aus_vic', name: 'Cricket Victoria Academy', state: 'Victoria', rating: 5, reputation: 'World Class', specialty: 'Technical Batting', coachRating: 'Elite (Coach Finch)', trainingBonusText: '+10% Batting, +8% Technique', bonuses: { batting: 1.10, technique: 1.08 }, graduatesDomestic: 139, graduatesInternational: 38, successRate: '75%', history: 'Fosters versatile batsmen who excel in long-form shield cricket and high-octane T20 matches.' },
      { id: 'aus_qas', name: 'Queensland Academy of Sport', state: 'Queensland', rating: 4, reputation: 'Elite', specialty: 'Bouncy Wicket Play', coachRating: 'Excellent (Coach Hayden)', trainingBonusText: '+10% Power, +8% Timing', bonuses: { power: 1.10, timing: 1.08 }, graduatesDomestic: 94, graduatesInternational: 21, successRate: '68%', history: 'Based in Brisbane, teaching players to handle extreme bounce and hook fast deliveries.' },
      { id: 'aus_waca', name: 'Western Australian Cricket Academy', state: 'Western Australia', rating: 4, reputation: 'Elite', specialty: 'Extreme Pace', coachRating: 'Excellent (Coach Langer)', trainingBonusText: '+12% Pace Bowler, +6% Aggression', bonuses: { pace_bowling: 1.12, aggression: 1.06 }, graduatesDomestic: 102, graduatesInternational: 26, successRate: '71%', history: 'Capitalizes on the blistering fast wickets of Perth to shape aggressive, high-velocity fast bowlers.' },
      { id: 'aus_saca', name: 'South Australian Cricket Academy', state: 'South Australia', rating: 4, reputation: 'Elite', specialty: 'Stamina & Swing', coachRating: 'Excellent (Coach Gillespie)', trainingBonusText: '+8% Swing, +10% Stamina', bonuses: { swing: 1.08, stamina: 1.10 }, graduatesDomestic: 81, graduatesInternational: 15, successRate: '61%', history: 'Focuses on classic seam movement, patient batting, and long-term athletic endurance.' },
      { id: 'aus_tas', name: 'Tasmanian Cricket Academy Hobart', state: 'Tasmania', rating: 3, reputation: 'Highly Renowned', specialty: 'Swing Bowling under Clouds', coachRating: 'Specialist (Coach Ponting)', trainingBonusText: '+10% Swing, +8% Mentality', bonuses: { swing: 1.10, mentality: 1.08 }, graduatesDomestic: 56, graduatesInternational: 9, successRate: '54%', history: 'Teaches players to adapt to cold weather, windy grounds, and heavily swinging conditions.' },
      { id: 'aus_act', name: 'Cricket ACT Academy', state: 'ACT', rating: 3, reputation: 'National Standard', specialty: 'Spin Adaptation', coachRating: 'Specialist (Coach Lyon)', trainingBonusText: '+10% Spin Bowler, +6% Accuracy', bonuses: { spin_bowling: 1.10, accuracy: 1.06 }, graduatesDomestic: 42, graduatesInternational: 4, successRate: '46%', history: 'A smaller but highly technical academy specializing in flight, drift, and spin variations.' },
      { id: 'aus_nt', name: 'Northern Territory Academy Darwin', state: 'Northern Territory', rating: 3, reputation: 'National Standard', specialty: 'Fitness & Hard Wickets', coachRating: 'Specialist (Coach Symonds)', trainingBonusText: '+10% Fitness, +8% Power', bonuses: { fitness: 1.10, power: 1.08 }, graduatesDomestic: 38, graduatesInternational: 3, successRate: '43%', history: 'Trains players in tropical heat to build top-tier physical conditioning and raw athletic power.' },
      { id: 'aus_scg', name: 'Sydney Cricket Ground Academy', state: 'SCG', rating: 4, reputation: 'Elite', specialty: 'Spin Bowler & Sweep', coachRating: 'Excellent (Coach Warner)', trainingBonusText: '+10% Spin Bowler, +8% Batting', bonuses: { spin_bowling: 1.10, batting: 1.08 }, graduatesDomestic: 76, graduatesInternational: 12, successRate: '60%', history: 'Famous for dry, abrasive pitches that duplicate subcontinental turning wickets.' },
      { id: 'aus_mcg', name: 'Melbourne Cricket Ground Academy', state: 'MCG', rating: 4, reputation: 'Elite', specialty: 'Match Mentality & Field', coachRating: 'Excellent (Coach Warne)', trainingBonusText: '+10% Mentality, +8% Fielding', bonuses: { mentality: 1.10, fielding: 1.08 }, graduatesDomestic: 85, graduatesInternational: 14, successRate: '62%', history: 'Prepares players for massive stadium crowds, focusing on high-pressure tactical awareness.' },
      { id: 'aus_brisbane', name: 'Brisbane Centre of Excellence', state: 'Queensland', rating: 4, reputation: 'Elite', specialty: 'All-Round Athleticism', coachRating: 'Excellent (Coach Watson)', trainingBonusText: '+8% Fitness, +8% Batting, +6% Bowling', bonuses: { fitness: 1.08, batting: 1.08, bowling: 1.06 }, graduatesDomestic: 91, graduatesInternational: 19, successRate: '66%', history: 'Australia\'s central high-tech indoor facility boasting 3D motion tracking analysis.' },
      { id: 'aus_adelaide', name: 'Adelaide Oval Academy', state: 'South Australia', rating: 3, reputation: 'Highly Renowned', specialty: 'Wrist Spin & Timing', coachRating: 'Specialist (Coach Head)', trainingBonusText: '+10% Timing, +8% Spin Bowler', bonuses: { timing: 1.10, spin_bowling: 1.08 }, graduatesDomestic: 64, graduatesInternational: 8, successRate: '56%', history: 'Teaches attacking strokeplay and traditional wrist spin on flat, drop-in decks.' },
      { id: 'aus_waca_fb', name: 'WACA Fast Bowling Centre', state: 'Western Australia', rating: 4, reputation: 'Elite', specialty: 'Seam & Release', coachRating: 'Excellent (Coach Johnson)', trainingBonusText: '+10% Seam, +8% Pace Bowler', bonuses: { seam: 1.10, pace_bowling: 1.08 }, graduatesDomestic: 79, graduatesInternational: 13, successRate: '60%', history: 'A specialist camp purely focused on fast bowler action, release angle, and wrist position.' },
      { id: 'aus_nsw_spin', name: 'NSW Spin Development Centre', state: 'New South Wales', rating: 3, reputation: 'National Standard', specialty: 'Leg Spin flight', coachRating: 'Specialist (Coach MacGill)', trainingBonusText: '+10% Spin Bowler, +8% Accuracy', bonuses: { spin_bowling: 1.10, accuracy: 1.08 }, graduatesDomestic: 49, graduatesInternational: 5, successRate: '49%', history: 'Focuses on the rare art of leg spin, training bowlers in drift, dip, and revolutions.' },
      { id: 'aus_geelong', name: 'Geelong Youth Cricket Academy', state: 'Victoria', rating: 3, reputation: 'National Standard', specialty: 'Defensive Technique', coachRating: 'Specialist (Coach Rogers)', trainingBonusText: '+10% Defense, +8% Technique', bonuses: { defense: 1.10, technique: 1.08 }, graduatesDomestic: 41, graduatesInternational: 2, successRate: '44%', history: 'An academy focused on constructing tight defensive techniques for top-order batsmen.' }
    ],
    england: [
      { id: 'eng_surrey', name: 'Surrey CCC Academy', state: 'Surrey', rating: 5, reputation: 'World Class', specialty: 'Batting Technique', coachRating: 'Elite (Coach Pietersen)', trainingBonusText: '+10% Batting, +8% Technique', bonuses: { batting: 1.10, technique: 1.08 }, graduatesDomestic: 132, graduatesInternational: 41, successRate: '76%', history: 'Based at The Oval, London. Famous for producing structured, stylish batsmen with high scores.' },
      { id: 'eng_yorkshire', name: 'Yorkshire CCC Academy', state: 'Yorkshire', rating: 5, reputation: 'World Class', specialty: 'Mental Resilience', coachRating: 'Elite (Coach Root)', trainingBonusText: '+10% Mentality, +8% Defense', bonuses: { mentality: 1.10, defense: 1.08 }, graduatesDomestic: 154, graduatesInternational: 45, successRate: '79%', history: 'The historic heartland of English red-ball cricket, building gritty test batsmen and swing bowlers.' },
      { id: 'eng_lancashire', name: 'Lancashire CCC Academy', state: 'Lancashire', rating: 4, reputation: 'Elite', specialty: 'Swing Bowling', coachRating: 'Excellent (Coach Anderson)', trainingBonusText: '+10% Swing, +8% Accuracy', bonuses: { swing: 1.10, accuracy: 1.08 }, graduatesDomestic: 109, graduatesInternational: 24, successRate: '70%', history: 'Based at Old Trafford, Manchester. Specializes in wobble-seam, swing, and bowling under cloud cover.' },
      { id: 'eng_warwickshire', name: 'Warwickshire CCC Academy', state: 'Warwickshire', rating: 4, reputation: 'Elite', specialty: 'Balanced All-Round', coachRating: 'Excellent (Coach Woakes)', trainingBonusText: '+6% Batting, +6% Bowling, +8% Fitness', bonuses: { batting: 1.06, bowling: 1.06, fitness: 1.08 }, graduatesDomestic: 88, graduatesInternational: 16, successRate: '65%', history: 'Develops highly disciplined all-round players suitable for all three international formats.' },
      { id: 'eng_middlesex', name: 'Middlesex CCC Academy', state: 'Middlesex', rating: 4, reputation: 'Elite', specialty: 'Spin Bowler & Sweep', coachRating: 'Excellent (Coach Morgan)', trainingBonusText: '+10% Spin Bowler, +8% Power', bonuses: { spin_bowling: 1.10, power: 1.08 }, graduatesDomestic: 95, graduatesInternational: 20, successRate: '68%', history: 'Located at Lord\'s. Stresses modern, aggressive limited-overs strokeplay and clean spin bowling.' },
      { id: 'eng_notts', name: 'Nottinghamshire CCC Academy', state: 'Nottinghamshire', rating: 4, reputation: 'Elite', specialty: 'Fast Bowler & Aggression', coachRating: 'Excellent (Coach Broad)', trainingBonusText: '+8% Pace Bowler, +10% Aggression', bonuses: { pace_bowling: 1.08, aggression: 1.10 }, graduatesDomestic: 82, graduatesInternational: 15, successRate: '63%', history: 'Based at Trent Bridge. Known for producing tall, hostile fast bowlers and electric fielders.' },
      { id: 'eng_somerset', name: 'Somerset CCC Academy', state: 'Somerset', rating: 3, reputation: 'Highly Renowned', specialty: 'Spin Adaptation', coachRating: 'Specialist (Coach Trescothick)', trainingBonusText: '+10% Spin Bowler, +6% Timing', bonuses: { spin_bowling: 1.10, timing: 1.06 }, graduatesDomestic: 61, graduatesInternational: 9, successRate: '55%', history: 'Famous for its spinning wickets in Taunton, producing spin wizards and aggressive sweepers.' },
      { id: 'eng_hampshire', name: 'Hampshire CCC Academy', state: 'Hampshire', rating: 3, reputation: 'Highly Renowned', specialty: 'Athlete Fitness', coachRating: 'Specialist (Coach KP)', trainingBonusText: '+10% Fitness, +8% Running', bonuses: { fitness: 1.10, running: 1.08 }, graduatesDomestic: 58, graduatesInternational: 7, successRate: '53%', history: 'Features top-tier athletic testing facilities to groom fast, durable, and highly fit fielders.' },
      { id: 'eng_essex', name: 'Essex CCC Academy', state: 'Essex', rating: 4, reputation: 'Elite', specialty: 'Defensive Spin Play', coachRating: 'Excellent (Coach Cook)', trainingBonusText: '+10% Defense, +8% Technique', bonuses: { defense: 1.10, technique: 1.08 }, graduatesDomestic: 71, graduatesInternational: 11, successRate: '61%', history: 'Grooms opening batsmen to defend resolutely against high-quality swing and spin.' },
      { id: 'eng_kent', name: 'Kent CCC Academy', state: 'Kent', rating: 3, reputation: 'Highly Renowned', specialty: 'Wristy Strokeplay', coachRating: 'Specialist (Coach Bell)', trainingBonusText: '+10% Timing, +6% Batting', bonuses: { timing: 1.10, batting: 1.06 }, graduatesDomestic: 63, graduatesInternational: 8, successRate: '54%', history: 'Teaches classic cover drives, cuts, and sweeps on fast, even batting decks.' },
      { id: 'eng_sussex', name: 'Sussex CCC Academy', state: 'Sussex', rating: 3, reputation: 'National Standard', specialty: 'Left-Arm Pace', coachRating: 'Specialist (Coach Archer)', trainingBonusText: '+10% Pace Bowler, +8% Seam', bonuses: { pace_bowling: 1.10, seam: 1.08 }, graduatesDomestic: 54, graduatesInternational: 6, successRate: '48%', history: 'Focuses on left-arm speed, angle of release, and lethal bouncers.' },
      { id: 'eng_gloucs', name: 'Gloucestershire CCC Academy', state: 'Gloucestershire', rating: 3, reputation: 'National Standard', specialty: 'Slow Ball & Seam', coachRating: 'Specialist (Coach Klinger)', trainingBonusText: '+10% Seam, +6% Accuracy', bonuses: { seam: 1.10, accuracy: 1.06 }, graduatesDomestic: 49, graduatesInternational: 4, successRate: '46%', history: 'Develops skilled medium-pacers who rely on cutters, seam movement, and slower balls.' },
      { id: 'eng_durham', name: 'Durham CCC Academy', state: 'Durham', rating: 3, reputation: 'National Standard', specialty: 'Fast Bowler Endurance', coachRating: 'Specialist (Coach Wood)', trainingBonusText: '+10% Stamina, +8% Pace Bowler', bonuses: { stamina: 1.10, pace_bowling: 1.08 }, graduatesDomestic: 52, graduatesInternational: 5, successRate: '47%', history: 'Located in the cold north, prioritizing stamina and explosive speed.' },
      { id: 'eng_leics', name: 'Leicestershire CCC Academy', state: 'Leicestershire', rating: 3, reputation: 'National Standard', specialty: 'Fielding Reflex', coachRating: 'Specialist (Coach Nixon)', trainingBonusText: '+10% Reflex, +8% Fielding', bonuses: { reflex: 1.10, fielding: 1.08 }, graduatesDomestic: 41, graduatesInternational: 2, successRate: '42%', history: 'Known for producing top-class wicketkeepers and sharp slip-catchers.' },
      { id: 'eng_worcs', name: 'Worcestershire CCC Academy', state: 'Worcestershire', rating: 3, reputation: 'National Standard', specialty: 'Spin Drift', coachRating: 'Specialist (Coach Ali)', trainingBonusText: '+10% Spin Bowler, +6% Mentality', bonuses: { spin_bowling: 1.10, mentality: 1.06 }, graduatesDomestic: 46, graduatesInternational: 3, successRate: '45%', history: 'Focuses on building flight, dip, and loop to deceive aggressive batsmen.' }
    ],
    pakistan: [
      { id: 'pak_nhpc', name: 'National High Performance Centre Lahore', state: 'Punjab', rating: 5, reputation: 'World Class', specialty: 'Hostile Fast Bowling', coachRating: 'Elite (Coach Wasim)', trainingBonusText: '+12% Pace Bowler, +8% Swing', bonuses: { pace_bowling: 1.12, swing: 1.08 }, graduatesDomestic: 164, graduatesInternational: 51, successRate: '81%', history: 'The premium cradle of Pakistan speedsters, teaching lethal reverse-swing and high velocity.' },
      { id: 'pak_kca', name: 'Karachi Cricket Academy', state: 'Sindh', rating: 5, reputation: 'World Class', specialty: 'Technical Strokeplay', coachRating: 'Elite (Coach Miandad)', trainingBonusText: '+10% Batting, +8% Technique', bonuses: { batting: 1.10, technique: 1.08 }, graduatesDomestic: 142, graduatesInternational: 39, successRate: '75%', history: 'Develops resilient, spin-loving batsmen who excel at sweep shots and running between wickets.' },
      { id: 'pak_rawalpindi', name: 'Rawalpindi Cricket Academy', state: 'Punjab', rating: 4, reputation: 'Elite', specialty: 'Extreme Velocity', coachRating: 'Excellent (Coach Shoaib)', trainingBonusText: '+12% Pace Bowler, +6% Power', bonuses: { pace_bowling: 1.12, power: 1.06 }, graduatesDomestic: 89, graduatesInternational: 22, successRate: '69%', history: 'Famed for unleashing explosive, raw pacers who clock over 150+ km/h regularly.' },
      { id: 'pak_peshawar', name: 'Peshawar Cricket Academy', state: 'KPK', rating: 4, reputation: 'Elite', specialty: 'Power Hitting', coachRating: 'Excellent (Coach Afridi)', trainingBonusText: '+10% Power, +8% Aggression', bonuses: { power: 1.10, aggression: 1.08 }, graduatesDomestic: 81, graduatesInternational: 17, successRate: '63%', history: 'Teaches players to clear boundaries immediately, focusing on high power and bat speed.' },
      { id: 'pak_multan', name: 'Multan Cricket Academy', state: 'Punjab', rating: 3, reputation: 'Highly Renowned', specialty: 'Spin Variations', coachRating: 'Specialist (Coach Saqlain)', trainingBonusText: '+10% Spin Bowler, +8% Accuracy', bonuses: { spin_bowling: 1.10, accuracy: 1.08 }, graduatesDomestic: 62, graduatesInternational: 8, successRate: '54%', history: 'A spinner\'s haven, specializing in the Doosra, Carrom ball, and spin flight.' },
      { id: 'pak_faisalabad', name: 'Faisalabad Cricket Academy', state: 'Punjab', rating: 3, reputation: 'Highly Renowned', specialty: 'Seam Bowler & Accuracy', coachRating: 'Specialist (Coach Saeed)', trainingBonusText: '+10% Seam, +8% Accuracy', bonuses: { seam: 1.10, accuracy: 1.08 }, graduatesDomestic: 59, graduatesInternational: 7, successRate: '52%', history: 'Emphasizes consistent line and length to stifle run rates on dry wickets.' },
      { id: 'pak_quetta', name: 'Quetta Cricket Academy', state: 'Balochistan', rating: 3, reputation: 'National Standard', specialty: 'Gritty Defense & Stamina', coachRating: 'Specialist (Coach Sarfaraz)', trainingBonusText: '+10% Defense, +8% Stamina', bonuses: { defense: 1.10, stamina: 1.08 }, graduatesDomestic: 41, graduatesInternational: 4, successRate: '45%', history: 'Builds tough cricketers capable of enduring extreme heat and dusty playing conditions.' },
      { id: 'pak_sialkot', name: 'Sialkot Cricket Academy', state: 'Punjab', rating: 3, reputation: 'National Standard', specialty: 'Wristy Strokeplay', coachRating: 'Specialist (Coach Malik)', trainingBonusText: '+10% Timing, +6% Technique', bonuses: { timing: 1.10, technique: 1.06 }, graduatesDomestic: 54, graduatesInternational: 5, successRate: '48%', history: 'Teaches late cuts and soft-handed placement to guide the ball past fielders.' },
      { id: 'pak_islamabad', name: 'Islamabad Cricket Academy', state: 'Islamabad', rating: 4, reputation: 'Elite', specialty: 'Athletics & Mentality', coachRating: 'Excellent (Coach Misbah)', trainingBonusText: '+10% Mentality, +8% Fitness', bonuses: { mentality: 1.10, fitness: 1.08 }, graduatesDomestic: 72, graduatesInternational: 11, successRate: '60%', history: 'Applies modern fitness routines and sports psychology to improve decision-making.' },
      { id: 'pak_abbottabad', name: 'Abbottabad Cricket Academy', state: 'KPK', rating: 3, reputation: 'National Standard', specialty: 'Swing Bowling in Altitude', coachRating: 'Specialist (Coach Junaid)', trainingBonusText: '+10% Swing, +8% Seam', bonuses: { swing: 1.10, seam: 1.08 }, graduatesDomestic: 48, graduatesInternational: 3, successRate: '44%', history: 'Situated in the mountains, utilizing the cool, thin air to develop massive swing.' },
      { id: 'pak_hyderabad', name: 'Hyderabad Sindh Cricket Academy', state: 'Sindh', rating: 3, reputation: 'National Standard', specialty: 'Leg Spin flight', coachRating: 'Specialist (Coach Kaneria)', trainingBonusText: '+10% Spin Bowler, +6% Accuracy', bonuses: { spin_bowling: 1.10, accuracy: 1.06 }, graduatesDomestic: 45, graduatesInternational: 2, successRate: '43%', history: 'Focuses on leg-break accuracy, googlies, and flippers.' },
      { id: 'pak_gujranwala', name: 'Gujranwala Cricket Academy', state: 'Punjab', rating: 3, reputation: 'National Standard', specialty: 'Power Hitting', coachRating: 'Specialist (Coach Inzamam)', trainingBonusText: '+10% Power, +6% Mentality', bonuses: { power: 1.10, mentality: 1.06 }, graduatesDomestic: 49, graduatesInternational: 4, successRate: '46%', history: 'Emphasizes batting weight transfer, stability, and handling heavy spin.' },
      { id: 'pak_lahore_qd', name: 'Lahore Qalandars Player Development Academy', state: 'Punjab', rating: 4, reputation: 'Elite', specialty: 'Fast Bowler & Fitness', coachRating: 'Excellent (Coach Shaheen)', trainingBonusText: '+10% Pace Bowler, +8% Fitness', bonuses: { pace_bowling: 1.10, fitness: 1.08 }, graduatesDomestic: 89, graduatesInternational: 15, successRate: '67%', history: 'A famous talent hunt organization, equipped with elite gym setups.' },
      { id: 'pak_peshawar_zf', name: 'Peshawar Zalmi Foundation Academy', state: 'KPK', rating: 3, reputation: 'Highly Renowned', specialty: 'Aggressive Batting', coachRating: 'Specialist (Coach Sammy)', trainingBonusText: '+10% Aggression, +6% Power', bonuses: { aggression: 1.10, power: 1.06 }, graduatesDomestic: 58, graduatesInternational: 8, successRate: '53%', history: 'Promotes fearless, expressive T20 batting and explosive boundary hitting.' },
      { id: 'pak_karachi_kc', name: 'Karachi Kings Development Centre', state: 'Sindh', rating: 3, reputation: 'National Standard', specialty: 'Death Bowling', coachRating: 'Specialist (Coach Amir)', trainingBonusText: '+10% Seam, +8% Reflex', bonuses: { seam: 1.10, reflex: 1.08 }, graduatesDomestic: 52, graduatesInternational: 5, successRate: '47%', history: 'Teaches yorkers, knuckleballs, and wide bowling to contain batsmen.' }
    ],
    'south africa': [
      { id: 'rsa_titans', name: 'Titans Cricket Academy Centurion', state: 'Gauteng', rating: 5, reputation: 'World Class', specialty: 'Bouncy Pitch Batting', coachRating: 'Elite (Coach AB)', trainingBonusText: '+10% Batting, +8% Power', bonuses: { batting: 1.10, power: 1.08 }, graduatesDomestic: 148, graduatesInternational: 44, successRate: '80%', history: 'Based at SuperSport Park. Trains players to use the fast, high-altitude bounce to score quickly.' },
      { id: 'rsa_lions', name: 'Lions Cricket Academy Johannesburg', state: 'Gauteng', rating: 5, reputation: 'World Class', specialty: 'Hostile Seam & Speed', coachRating: 'Elite (Coach Donald)', trainingBonusText: '+10% Pace Bowler, +8% Seam', bonuses: { pace_bowling: 1.10, seam: 1.08 }, graduatesDomestic: 139, graduatesInternational: 41, successRate: '77%', history: 'Housed at the Wanderers (The Bullring). Famed for producing aggressive, high-pace bowlers.' },
      { id: 'rsa_wp', name: 'Western Province Academy Newlands', state: 'Western Province', rating: 4, reputation: 'Elite', specialty: 'Swing Bowling & Technique', coachRating: 'Excellent (Coach Kallis)', trainingBonusText: '+8% Swing, +10% Technique', bonuses: { swing: 1.08, technique: 1.10 }, graduatesDomestic: 104, graduatesInternational: 25, successRate: '71%', history: 'Nestled beneath Table Mountain, teaching lateral movement on damp, green wickets.' },
      { id: 'rsa_dolphins', name: 'Dolphins Cricket Academy Kingsmead', state: 'KwaZulu-Natal', rating: 4, reputation: 'Elite', specialty: 'Spin Adaptation', coachRating: 'Excellent (Coach Maharaj)', trainingBonusText: '+10% Spin Bowler, +8% Mentality', bonuses: { spin_bowling: 1.10, mentality: 1.08 }, graduatesDomestic: 91, graduatesInternational: 18, successRate: '65%', history: 'Based in humid Durban. Teaches slow bowling and sweep shots to counter low bounce.' },
      { id: 'rsa_knights', name: 'Knights Cricket Academy Bloemfontein', state: 'Free State', rating: 3, reputation: 'Highly Renowned', specialty: 'Defensive Batting', coachRating: 'Specialist (Coach Elgar)', trainingBonusText: '+10% Defense, +8% Stamina', bonuses: { defense: 1.10, stamina: 1.08 }, graduatesDomestic: 68, graduatesInternational: 9, successRate: '56%', history: 'Teaches old-school resilience and batting long hours on dry, abrasive outfields.' },
      { id: 'rsa_warriors', name: 'Warriors Cricket Academy Gqeberha', state: 'Eastern Province', rating: 3, reputation: 'Highly Renowned', specialty: 'Windy Conditions Seam', coachRating: 'Specialist (Coach Pollock)', trainingBonusText: '+10% Seam, +8% Accuracy', bonuses: { seam: 1.10, accuracy: 1.08 }, graduatesDomestic: 72, graduatesInternational: 8, successRate: '54%', history: 'Located in St George\'s Park, specializing in wobble seam and flighting balls into heavy wind.' },
      { id: 'rsa_boland', name: 'Boland Cricket Academy Paarl', state: 'Boland', rating: 3, reputation: 'National Standard', specialty: 'Stamina & Dry Spin', coachRating: 'Specialist (Coach Adams)', trainingBonusText: '+10% Stamina, +8% Spin Bowler', bonuses: { stamina: 1.10, spin_bowling: 1.08 }, graduatesDomestic: 49, graduatesInternational: 4, successRate: '46%', history: 'Prepares players in scorching heat, prioritizing fitness and slow-pitch skills.' },
      { id: 'rsa_border', name: 'Border Cricket Academy East London', state: 'Border', rating: 3, reputation: 'National Standard', specialty: 'Fielding Reflex', coachRating: 'Specialist (Coach Boucher)', trainingBonusText: '+10% Reflex, +8% Fielding', bonuses: { reflex: 1.10, fielding: 1.08 }, graduatesDomestic: 44, graduatesInternational: 3, successRate: '45%', history: 'Instills world-class reflexes, diving techniques, and wicketkeeping fundamentals.' },
      { id: 'rsa_easterns', name: 'Eastern Province Cricket Academy', state: 'Eastern Province', rating: 3, reputation: 'National Standard', specialty: 'Medium Pace Cutters', coachRating: 'Specialist (Coach Ntini)', trainingBonusText: '+10% Seam, +6% Accuracy', bonuses: { seam: 1.10, accuracy: 1.06 }, graduatesDomestic: 52, graduatesInternational: 5, successRate: '48%', history: 'Focuses on heavy balls, hitting the deck hard, and containing batsmen.' },
      { id: 'rsa_nw', name: 'North West Dragons Academy', state: 'North West', rating: 3, reputation: 'National Standard', specialty: 'Power Hitting', coachRating: 'Specialist (Coach Miller)', trainingBonusText: '+10% Power, +6% Aggression', bonuses: { power: 1.10, aggression: 1.06 }, graduatesDomestic: 47, graduatesInternational: 3, successRate: '44%', history: 'Develops power hitting and clears midwicket boundaries with strong wristwork.' },
      { id: 'rsa_nc', name: 'Northern Cape Heat Academy Kimberley', state: 'Northern Cape', rating: 3, reputation: 'National Standard', specialty: 'Defensive Spin Play', coachRating: 'Specialist (Coach Boje)', trainingBonusText: '+10% Defense, +6% Technique', bonuses: { defense: 1.10, technique: 1.06 }, graduatesDomestic: 39, graduatesInternational: 2, successRate: '42%', history: 'Teaches defensive blocks, leave-alone routines, and patience against spin.' },
      { id: 'rsa_swd', name: 'South Western Districts Academy Oudtshoorn', state: 'South Western Districts', rating: 3, reputation: 'National Standard', specialty: 'Bowler Accuracy', coachRating: 'Specialist (Coach Nortje)', trainingBonusText: '+10% Accuracy, +6% Pace Bowler', bonuses: { accuracy: 1.10, pace_bowling: 1.06 }, graduatesDomestic: 41, graduatesInternational: 3, successRate: '43%', history: 'Focuses on mechanical bowling actions and consistently hitting top-of-off stump.' },
      { id: 'rsa_limpopo', name: 'Limpopo Impalas Academy Polokwane', state: 'Limpopo', rating: 3, reputation: 'National Standard', specialty: 'Running & Agility', coachRating: 'Specialist (Coach Gibbs)', trainingBonusText: '+10% Running, +8% Fielding', bonuses: { running: 1.10, fielding: 1.08 }, graduatesDomestic: 36, graduatesInternational: 1, successRate: '41%', history: 'Grooms fast, athletic fielders capable of converting half-chances into run outs.' },
      { id: 'rsa_mpumalanga', name: 'Mpumalanga Rhinos Academy Secunda', state: 'Mpumalanga', rating: 3, reputation: 'National Standard', specialty: 'Mentality & Strategy', coachRating: 'Specialist (Coach Smith)', trainingBonusText: '+10% Mentality, +6% Defense', bonuses: { mentality: 1.10, defense: 1.06 }, graduatesDomestic: 38, graduatesInternational: 2, successRate: '42%', history: 'Focuses on field placements, captaincy skills, and high-pressure defense.' },
      { id: 'rsa_national', name: 'SA National Academy Pretoria', state: 'Gauteng', rating: 4, reputation: 'Elite', specialty: 'All-Round Mastery', coachRating: 'Excellent (Coach Steyn)', trainingBonusText: '+8% Batting, +8% Bowling, +8% Fitness', bonuses: { batting: 1.08, bowling: 1.08, fitness: 1.08 }, graduatesDomestic: 88, graduatesInternational: 21, successRate: '68%', history: 'The national board\'s elite training program for fast-tracking franchise stars.' }
    ]
  };

  // Predefined lists for 5 more major nations
  data['new zealand'] = [
    { id: 'nz_auckland', name: 'Auckland Cricket Academy', state: 'Auckland', rating: 4, specialty: 'Technical Batting' },
    { id: 'nz_canterbury', name: 'Canterbury Cricket Academy', state: 'Canterbury', rating: 4, specialty: 'Swing Bowling' },
    { id: 'nz_otago', name: 'Otago Cricket Academy', state: 'Otago', rating: 3, specialty: 'Fitness & Power' },
    { id: 'nz_wellington', name: 'Wellington Cricket Academy', state: 'Wellington', rating: 4, specialty: 'Seam Accuracy' },
    { id: 'nz_nd', name: 'Northern Districts Academy', state: 'Northern Districts', rating: 4, specialty: 'Spin Bowler & Sweep' },
    { id: 'nz_cd', name: 'Central Districts Academy', state: 'Central Districts', rating: 3, specialty: 'Pace & Bounce' },
    { id: 'nz_waikato', name: 'Waikato Cricket Academy', state: 'Waikato', rating: 3, specialty: 'Balanced All-Round' },
    { id: 'nz_bop', name: 'Bay of Plenty Academy', state: 'Bay of Plenty', rating: 3, specialty: 'Swing Bowling' },
    { id: 'nz_chch', name: 'Christchurch Cricket Academy', state: 'Christchurch', rating: 4, specialty: 'Tactical Mentality' },
    { id: 'nz_dunedin', name: 'Dunedin High Performance Centre', state: 'Dunedin', rating: 3, specialty: 'Green Pitch Defense' },
    { id: 'nz_hamilton', name: 'Hamilton Cricket Academy', state: 'Hamilton', rating: 3, specialty: 'All-Rounder Play' },
    { id: 'nz_napier', name: 'Napier Cricket Academy', state: 'Napier', rating: 3, specialty: 'Batting Technique' },
    { id: 'nz_nelson', name: 'Nelson Cricket Academy', state: 'Nelson', rating: 3, specialty: 'Medium Pace Cutters' },
    { id: 'nz_queenstown', name: 'Queenstown Cricket Academy', state: 'Queenstown', rating: 3, specialty: 'Running & Fielding' },
    { id: 'nz_eden', name: 'Eden Park Development Centre', state: 'Eden Park', rating: 4, specialty: 'Power Hitting' }
  ].map((ac, idx) => fillAcademyDefaults(ac, 'nz', idx, nationName));

  data['west indies'] = [
    { id: 'wi_barbados', name: 'Barbados Cricket Academy', state: 'Barbados', rating: 5, specialty: 'Hostile Pace Bowling' },
    { id: 'wi_guyana', name: 'Guyana Cricket Academy', state: 'Guyana', rating: 4, specialty: 'Spin Mastery' },
    { id: 'wi_jamaica', name: 'Jamaica Cricket Academy', state: 'Jamaica', rating: 5, specialty: 'Extreme Power Hitting' },
    { id: 'wi_trinidad', name: 'Trinidad & Tobago Academy', state: 'Trinidad & Tobago', rating: 4, specialty: 'Wristy Strokeplay' },
    { id: 'wi_leeward', name: 'Leeward Islands Academy', state: 'Leeward Islands', rating: 3, specialty: 'Swing Bowling' },
    { id: 'wi_windward', name: 'Windward Islands Academy', state: 'Windward Islands', rating: 3, specialty: 'Medium Pace Seam' },
    { id: 'wi_antigua', name: 'Antigua Cricket Academy', state: 'Antigua', rating: 4, specialty: 'Batting Technique' },
    { id: 'wi_stlucia', name: 'St Lucia Cricket Academy', state: 'St Lucia', rating: 3, specialty: 'All-Round Play' },
    { id: 'wi_grenada', name: 'Grenada Cricket Academy', state: 'Grenada', rating: 3, specialty: 'Stamina & Running' },
    { id: 'wi_stvincent', name: 'St Vincent Cricket Academy', state: 'St Vincent', rating: 3, specialty: 'Bowler Accuracy' },
    { id: 'wi_barbados_hpc', name: 'Barbados High Performance Centre', state: 'Barbados HPC', rating: 4, specialty: 'Balanced Fundamentals' },
    { id: 'wi_stkitts', name: 'St Kitts Cricket Academy', state: 'St Kitts', rating: 3, specialty: 'Reflex & Catching' },
    { id: 'wi_nevis', name: 'Nevis Cricket Academy', state: 'Nevis', rating: 3, specialty: 'Aggressive Batting' },
    { id: 'wi_dominica', name: 'Dominica Cricket Academy', state: 'Dominica', rating: 3, specialty: 'Defensive Mentality' },
    { id: 'wi_georgetown', name: 'Georgetown Development Academy', state: 'Georgetown', rating: 3, specialty: 'Spin Adaptation' }
  ].map((ac, idx) => fillAcademyDefaults(ac, 'wi', idx, nationName));

  data['sri lanka'] = [
    { id: 'sl_colombo', name: 'Colombo Cricket Academy', state: 'Colombo', rating: 5, specialty: 'Spin Mastery' },
    { id: 'sl_kandy', name: 'Kandy Cricket Academy', state: 'Kandy', rating: 4, specialty: 'Wristy Batting' },
    { id: 'sl_galle', name: 'Galle Cricket Academy', state: 'Galle', rating: 4, specialty: 'Dry Pitch Spin' },
    { id: 'sl_jaffna', name: 'Jaffna Cricket Academy', state: 'Jaffna', rating: 3, specialty: 'Defensive Technique' },
    { id: 'sl_dambulla', name: 'Dambulla Cricket Academy', state: 'Dambulla', rating: 3, specialty: 'Medium Pace Seam' },
    { id: 'sl_ssc', name: 'Sinhalese Sports Club Academy', state: 'Colombo', rating: 4, specialty: 'Technical Batting' },
    { id: 'sl_ncc', name: 'Nondescripts Cricket Club Academy', state: 'Colombo', rating: 4, specialty: 'Pace & Bounce' },
    { id: 'sl_colts', name: 'Colts Cricket Club Academy', state: 'Colombo', rating: 3, specialty: 'All-Round Play' },
    { id: 'sl_tamil', name: 'Tamil Union Academy', state: 'Colombo', rating: 3, specialty: 'Stamina & Mentality' },
    { id: 'sl_moratuwa', name: 'Moratuwa Cricket Academy', state: 'Moratuwa', rating: 3, specialty: 'Aggressive Batting' },
    { id: 'sl_kurunegala', name: 'Kurunegala Cricket Academy', state: 'Kurunegala', rating: 3, specialty: 'Left-Arm Spin' },
    { id: 'sl_matara', name: 'Matara Cricket Academy', state: 'Matara', rating: 3, specialty: 'Power Hitting' },
    { id: 'sl_negombo', name: 'Negombo Cricket Academy', state: 'Negombo', rating: 3, specialty: 'Swing Bowling' },
    { id: 'sl_batticaloa', name: 'Batticaloa Cricket Academy', state: 'Batticaloa', rating: 3, specialty: 'Reflex & Fielding' },
    { id: 'sl_trincomalee', name: 'Trincomalee Cricket Academy', state: 'Trincomalee', rating: 3, specialty: 'Bowler Accuracy' }
  ].map((ac, idx) => fillAcademyDefaults(ac, 'sl', idx, nationName));

  data['bangladesh'] = [
    { id: 'bd_dhaka', name: 'Dhaka Cricket Academy', state: 'Dhaka', rating: 5, specialty: 'Spin Bowler & Sweep' },
    { id: 'bd_chittagong', name: 'Chittagong Cricket Academy', state: 'Chittagong', rating: 4, specialty: 'Batting Technique' },
    { id: 'bd_sylhet', name: 'Sylhet Cricket Academy', state: 'Sylhet', rating: 4, specialty: 'Swing Bowling' },
    { id: 'bd_khulna', name: 'Khulna Cricket Academy', state: 'Khulna', rating: 3, specialty: 'Pace & Bounce' },
    { id: 'bd_rajshahi', name: 'Rajshahi Cricket Academy', state: 'Rajshahi', rating: 3, specialty: 'All-Round Play' },
    { id: 'bd_rangpur', name: 'Rangpur Cricket Academy', state: 'Rangpur', rating: 3, specialty: 'Defensive Mentality' },
    { id: 'bd_barisal', name: 'Barisal Cricket Academy', state: 'Barisal', rating: 3, specialty: 'Stamina & Running' },
    { id: 'bd_mymensingh', name: 'Mymensingh Cricket Academy', state: 'Mymensingh', rating: 3, specialty: 'Bowler Accuracy' },
    { id: 'bd_coxsbazar', name: 'Cox\'s Bazar Academy', state: 'Cox\'s Bazar', rating: 3, specialty: 'Windy Conditions' },
    { id: 'bd_comilla', name: 'Comilla Cricket Academy', state: 'Comilla', rating: 3, specialty: 'Power Hitting' },
    { id: 'bd_bogra', name: 'Bogra Cricket Academy', state: 'Bogra', rating: 3, specialty: 'Seam & Spin' },
    { id: 'bd_jessore', name: 'Jessore Cricket Academy', state: 'Jessore', rating: 3, specialty: 'Reflex & Catching' },
    { id: 'bd_narayanganj', name: 'Narayanganj Cricket Academy', state: 'Narayanganj', rating: 3, specialty: 'Tactical Mentality' },
    { id: 'bd_gazipur', name: 'Gazipur Cricket Academy', state: 'Gazipur', rating: 3, specialty: 'Athlete Fitness' },
    { id: 'bd_bksp', name: 'BKSP National Sports Academy', state: 'Dhaka', rating: 5, reputation: 'World Class', specialty: 'Balanced Fundamentals' }
  ].map((ac, idx) => fillAcademyDefaults(ac, 'bd', idx, nationName));

  data['afghanistan'] = [
    { id: 'afg_kabul', name: 'Kabul Cricket Academy', state: 'Kabul', rating: 5, specialty: 'Wrist Spin & Googly' },
    { id: 'afg_nangarhar', name: 'Nangarhar Cricket Academy', state: 'Nangarhar', rating: 4, specialty: 'Power Hitting' },
    { id: 'afg_kandahar', name: 'Kandahar Cricket Academy', state: 'Kandahar', rating: 4, specialty: 'Speed Bowling' },
    { id: 'afg_khost', name: 'Khost Cricket Academy', state: 'Khost', rating: 3, specialty: 'All-Round Development' },
    { id: 'afg_balkh', name: 'Balkh Cricket Academy', state: 'Balkh', rating: 3, specialty: 'Seam Accuracy' },
    { id: 'afg_kunduz', name: 'Kunduz Cricket Academy', state: 'Kunduz', rating: 3, specialty: 'Defensive Batting' },
    { id: 'afg_helmand', name: 'Helmand Cricket Academy', state: 'Helmand', rating: 3, specialty: 'Stamina & Running' },
    { id: 'afg_herat', name: 'Herat Cricket Academy', state: 'Herat', rating: 3, specialty: 'Spin Adaptation' },
    { id: 'afg_laghman', name: 'Laghman Cricket Academy', state: 'Laghman', rating: 3, specialty: 'Reflex & Fielding' },
    { id: 'afg_paktia', name: 'Paktia Cricket Academy', state: 'Paktia', rating: 3, specialty: 'Aggressive Mentality' },
    { id: 'afg_logar', name: 'Logar Cricket Academy', state: 'Logar', rating: 3, specialty: 'Swing Bowling' },
    { id: 'afg_ghazni', name: 'Ghazni Cricket Academy', state: 'Ghazni', rating: 3, specialty: 'Bowler Accuracy' },
    { id: 'afg_wardak', name: 'Wardak Cricket Academy', state: 'Wardak', rating: 3, specialty: 'Batting Technique' },
    { id: 'afg_baghlan', name: 'Baghlan Cricket Academy', state: 'Baghlan', rating: 3, specialty: 'Seam Movement' },
    { id: 'afg_kunar', name: 'Kunar Cricket Academy', state: 'Kunar', rating: 3, specialty: 'Extreme Pace' }
  ].map((ac, idx) => fillAcademyDefaults(ac, 'afg', idx, nationName));


  // Return if predefined exists
  if (data[norm]) {
    return data[norm];
  }

  // Otherwise, dynamically generate 15 academies for any other nation!
  const capitalizedNation = nationName.split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  const shortCode = norm.replace(/[^a-z]/g, '').substring(0, 3) || 'nat';

  const specialties = [
    { specialty: 'Balanced Fundamentals', bonuses: { batting: 1.08, bowling: 1.08 } },
    { specialty: 'Batting Technique', bonuses: { batting: 1.10, technique: 1.08 } },
    { specialty: 'Hostile Pace Bowling', bonuses: { pace_bowling: 1.10, accuracy: 1.08 } },
    { specialty: 'Spin Mastery', bonuses: { spin_bowling: 1.10, technique: 1.08 } },
    { specialty: 'Power Hitting', bonuses: { power: 1.10, aggression: 1.08 } },
    { specialty: 'Swing & Seam Movement', bonuses: { swing: 1.10, seam: 1.08 } },
    { specialty: 'Athlete Fitness & Stamina', bonuses: { fitness: 1.10, stamina: 1.08 } },
    { specialty: 'Tactical Mentality', bonuses: { mentality: 1.12, defense: 1.08 } }
  ];

  const generated = [];
  const stateNames = [
    'Capital Territory', 'Northern Province', 'Southern Coast', 'Eastern Districts',
    'Western Plains', 'Central Valley', 'Highland Region', 'Coastal Deltas',
    'Lakeside Territory', 'Summit County', 'Riverlands Province', 'Pioneer Region',
    'Grand Peninsula', 'Borderlands District', 'Emerald Valley'
  ];

  for (let i = 0; i < 15; i++) {
    const stateName = stateNames[i];
    const specIndex = i % specialties.length;
    const spec = specialties[specIndex];
    
    // Ratings: 5 stars for index 0, 4 stars for index 1-3, 3 stars for rest
    const rating = i === 0 ? 5 : (i < 4 ? 4 : 3);
    const repMap = { 5: 'World Class', 4: 'Elite', 3: 'National Standard' };

    generated.push({
      id: `${shortCode}_state_${i + 1}`,
      name: `${capitalizedNation} ${stateName} Academy`,
      state: `${capitalizedNation} ${stateName}`,
      rating: rating,
      reputation: repMap[rating],
      specialty: spec.specialty,
      coachRating: `${rating === 5 ? 'Elite' : (rating === 4 ? 'Excellent' : 'Specialist')} (Coach ${capitalizedNation} Legend)`,
      trainingBonusText: getBonusText(spec.bonuses),
      bonuses: spec.bonuses,
      graduatesDomestic: Math.floor(Math.random() * 50) + (rating * 15),
      graduatesInternational: Math.floor(Math.random() * 15) + (rating * 4),
      successRate: `${Math.floor(Math.random() * 20) + (rating * 12)}%`,
      history: `The premier developmental facilities in the ${stateName} region, providing high-quality training and pitches.`
    });
  }

  return generated;
}

function fillAcademyDefaults(academy, code, idx, nation) {
  const rating = academy.rating || 3;
  const repMap = { 5: 'World Class', 4: 'Elite', 3: 'Highly Renowned', 2: 'National Standard' };
  
  const specialtiesBonuses = {
    'Technical Batting': { batting: 1.10, technique: 1.08 },
    'Swing Bowling': { swing: 1.10, accuracy: 1.08 },
    'Fitness & Power': { fitness: 1.10, power: 1.08 },
    'Seam Accuracy': { seam: 1.10, accuracy: 1.08 },
    'Spin Bowler & Sweep': { spin_bowling: 1.10, batting: 1.08 },
    'Pace & Bounce': { pace_bowling: 1.10, power: 1.08 },
    'Balanced All-Round': { batting: 1.06, bowling: 1.06, fitness: 1.06 },
    'Tactical Mentality': { mentality: 1.12, defense: 1.08 },
    'Green Pitch Defense': { defense: 1.10, technique: 1.08 },
    'All-Rounder Play': { batting: 1.06, bowling: 1.06, technique: 1.06 },
    'Medium Pace Cutters': { seam: 1.10, accuracy: 1.08 },
    'Running & Fielding': { running: 1.10, fielding: 1.08 },
    'Power Hitting': { power: 1.10, aggression: 1.08 },
    'Hostile Pace Bowling': { pace_bowling: 1.10, accuracy: 1.08 },
    'Spin Mastery': { spin_bowling: 1.10, technique: 1.08 },
    'Wristy Strokeplay': { timing: 1.10, technique: 1.08 },
    'Medium Pace Seam': { seam: 1.10, swing: 1.08 },
    'Stamina & Running': { stamina: 1.10, running: 1.08 },
    'Bowler Accuracy': { accuracy: 1.10, mentality: 1.08 },
    'Balanced Fundamentals': { batting: 1.08, bowling: 1.08 },
    'Reflex & Catching': { reflex: 1.10, fielding: 1.08 },
    'Defensive Mentality': { defense: 1.10, mentality: 1.08 },
    'Dry Pitch Spin': { spin_bowling: 1.10, technique: 1.08 },
    'Left-Arm Spin': { spin_bowling: 1.10, accuracy: 1.08 },
    'Windy Conditions': { seam: 1.10, swing: 1.08 },
    'Seam & Spin': { seam: 1.08, spin_bowling: 1.08 },
    'Athlete Fitness': { fitness: 1.10, stamina: 1.08 },
    'Wrist Spin & Googly': { spin_bowling: 1.10, variations: 1.08 },
    'Speed Bowling': { pace_bowling: 1.10, reflex: 1.08 },
    'Seam Movement': { seam: 1.10, swing: 1.08 },
    'Extreme Pace': { pace_bowling: 1.12, aggression: 1.06 }
  };

  const bonuses = specialtiesBonuses[academy.specialty] || { batting: 1.08, fitness: 1.05 };

  return {
    id: academy.id || `${code}_state_${idx + 1}`,
    name: academy.name,
    state: academy.state,
    rating: rating,
    reputation: academy.reputation || repMap[rating] || 'Highly Renowned',
    specialty: academy.specialty,
    coachRating: academy.coachRating || `${rating === 5 ? 'Elite' : (rating === 4 ? 'Excellent' : 'Specialist')} (Coach ${nation} Legend)`,
    trainingBonusText: getBonusText(bonuses),
    bonuses: bonuses,
    graduatesDomestic: academy.graduatesDomestic || Math.floor(Math.random() * 40) + (rating * 10),
    graduatesInternational: academy.graduatesInternational || Math.floor(Math.random() * 10) + (rating * 3),
    successRate: academy.successRate || `${Math.floor(Math.random() * 20) + (rating * 10)}%`,
    history: academy.history || `Located in ${academy.state}, this facilities is dedicated to nurturing regional talent to transition to domestic first class cricket.`
  };
}

function getBonusText(bonuses) {
  const parts = [];
  for (const [k, v] of Object.entries(bonuses)) {
    const cleanKey = k.replace('_', ' ').split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    parts.push(`+${Math.round((v - 1) * 100)}% ${cleanKey} XP`);
  }
  return parts.join(', ');
}
