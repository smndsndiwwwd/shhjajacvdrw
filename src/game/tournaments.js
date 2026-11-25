/**
 * Tournament Mode definitions, team rosters, and bracket helpers.
 * Designed for Player vs Computer progression.
 * Authentic T20 format: 20 overs per innings, real player rosters, and accurate team structures.
 */

export const QUICK_MATCH_CONFIG = {
  name: '⚡ Quick Exhibition Match',
  description: 'Casual friendly against a real cricket club. Low stakes and 0 coins ("of no worth"), but grants essential XP to level up and unlock major tournaments!',
  overs: 5,
  balls: 30,
  rewardCoins: 0,
  winXP: 250,
  lossXP: 90,
  teams: [
    {
      id: 'mcc_xi',
      name: 'Marylebone Cricket Club (MCC)',
      rating: 40,
      pitch: 'Green',
      difficulty: 'Easy',
      bowlerSkill: 38,
      keyPlayer: 'Kumar Sangakkara (MCC XI)',
      color: '#c0392b',
      roster: ['Kumar Sangakkara', 'Alastair Cook', 'Ian Bell', 'Paul Collingwood', 'Shivnarine Chanderpaul', 'Chris Read', 'Darren Gough', 'Matthew Hoggard', 'Monty Panesar', 'Steve Harmison', 'Simon Jones'],
      bowlers: [
        { name: 'Matthew Hoggard', style: 'Right-Arm Swing Fast', type: 'pace' },
        { name: 'Darren Gough', style: 'Right-Arm Fast', type: 'pace' },
        { name: 'Monty Panesar', style: 'Left-Arm Orthodox Spin', type: 'spin' },
        { name: 'Steve Harmison', style: 'Right-Arm Fast', type: 'pace' },
        { name: 'Simon Jones', style: 'Right-Arm Fast-Medium', type: 'pace' }
      ]
    },
    {
      id: 'yorkshire_ccc',
      name: 'Yorkshire County CC',
      rating: 44,
      pitch: 'Green',
      difficulty: 'Easy',
      bowlerSkill: 42,
      keyPlayer: 'Joe Root (County XI)',
      color: '#3498db',
      roster: ['Adam Lyth', 'Dawid Malan', 'Joe Root', 'Harry Brook', 'Shan Masood', 'Jonathan Tattersall', 'Jordan Thompson', 'Matthew Fisher', 'Ben Coad', 'Adil Rashid', 'Dom Bess'],
      bowlers: [
        { name: 'Ben Coad', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Matthew Fisher', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Adil Rashid', style: 'Right-Arm Leg-Break', type: 'spin' },
        { name: 'Jordan Thompson', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Dom Bess', style: 'Right-Arm Off-Break', type: 'spin' }
      ]
    },
    {
      id: 'mca_xi',
      name: 'Mumbai Cricket Association (MCA XI)',
      rating: 46,
      pitch: 'Dusty',
      difficulty: 'Easy',
      bowlerSkill: 44,
      keyPlayer: 'Ajinkya Rahane (Ranji XI)',
      color: '#f1c40f',
      roster: ['Prithvi Shaw', 'Jay Bista', 'Ajinkya Rahane', 'Shreyas Iyer', 'Shivam Dube', 'Siddhesh Lad', 'Hardik Tamore', 'Shams Mulani', 'Shardul Thakur', 'Tushar Deshpande', 'Dhawal Kulkarni'],
      bowlers: [
        { name: 'Shardul Thakur', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Tushar Deshpande', style: 'Right-Arm Fast', type: 'pace' },
        { name: 'Shams Mulani', style: 'Left-Arm Orthodox Spin', type: 'spin' },
        { name: 'Dhawal Kulkarni', style: 'Right-Arm Medium-Fast', type: 'pace' },
        { name: 'Shivam Dube', style: 'Right-Arm Medium', type: 'pace' }
      ]
    },
    {
      id: 'nsw_blues',
      name: 'New South Wales Blues (NSW Blues)',
      rating: 48,
      pitch: 'Hard',
      difficulty: 'Medium',
      bowlerSkill: 46,
      keyPlayer: 'Steve Smith (Shield XI)',
      color: '#0984e3',
      roster: ['Daniel Hughes', 'Kurtis Patterson', 'Steve Smith', 'Moises Henriques', 'Oliver Davies', 'Baxter Holt', 'Sean Abbott', 'Ben Dwarshuis', 'Chris Tremain', 'Nathan Lyon', 'Jackson Bird'],
      bowlers: [
        { name: 'Sean Abbott', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Ben Dwarshuis', style: 'Left-Arm Fast-Medium', type: 'pace' },
        { name: 'Nathan Lyon', style: 'Right-Arm Off-Break', type: 'spin' },
        { name: 'Chris Tremain', style: 'Right-Arm Fast-Medium', type: 'pace' },
        { name: 'Jackson Bird', style: 'Right-Arm Fast-Medium', type: 'pace' }
      ]
    }
  ]
};

export const TOURNAMENTS = [
  {
    id: 'bbl_championship',
    name: 'Big Bash League (BBL)',
    tier: 1,
    requiredLevel: 2,
    icon: '🦘',
    badge: 'BBL AUSTRALIA',
    color: '#e67e22',
    description: "Australia's premier T20 league! Fast, bouncy pitches and electric franchise rivalries.",
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'Easy',
    bowlerSkill: 48,
    rewards: {
      xp: 600,
      coins: 250,
      reputation: 8,
      trophy: 'Big Bash League Trophy'
    },
    teams: [
      {
        id: 'perth_scorchers',
        name: 'Perth Scorchers',
        rating: 62,
        color: '#e67e22',
        keyPlayer: 'Mitchell Marsh',
        roster: ['Mitchell Marsh', 'Josh Inglis', 'Aaron Hardie', 'Ashton Turner', 'Cooper Connolly', 'Laurie Evans', 'Ashton Agar', 'Jhye Richardson', 'Andrew Tye', 'Jason Behrendorff', 'Lance Morris'],
        bowlers: [
          { name: 'Jason Behrendorff', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Jhye Richardson', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Andrew Tye', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Ashton Agar', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Lance Morris', style: 'Right-Arm Express Fast', type: 'pace' }
        ]
      },
      {
        id: 'sydney_sixers',
        name: 'Sydney Sixers',
        rating: 61,
        color: '#e84393',
        keyPlayer: 'Steve Smith',
        roster: ['Josh Philippe', 'James Vince', 'Daniel Hughes', 'Moises Henriques', 'Jordan Silk', 'Jack Edwards', 'Sean Abbott', 'Ben Dwarshuis', 'Jackson Bird', 'Todd Murphy', "Steve O'Keefe"],
        bowlers: [
          { name: 'Sean Abbott', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Ben Dwarshuis', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Todd Murphy', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Jackson Bird', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: "Steve O'Keefe", style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'brisbane_heat',
        name: 'Brisbane Heat',
        rating: 60,
        color: '#00cec9',
        keyPlayer: 'Usman Khawaja',
        roster: ['Usman Khawaja', 'Josh Brown', 'Nathan McSweeney', 'Matt Renshaw', 'Sam Billings', 'Paul Walter', 'Michael Neser', 'Xavier Bartlett', 'Spencer Johnson', 'Mitchell Swepson', 'Matthew Kuhnemann'],
        bowlers: [
          { name: 'Spencer Johnson', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Xavier Bartlett', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Michael Neser', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Mitchell Swepson', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Matthew Kuhnemann', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'adelaide_strikers',
        name: 'Adelaide Strikers',
        rating: 59,
        color: '#0984e3',
        keyPlayer: 'Rashid Khan',
        roster: ['Matthew Short', "D'Arcy Short", 'Chris Lynn', 'Adam Hose', 'Thomas Kelly', 'Harry Nielsen', 'Jamie Overton', 'David Payne', 'Cameron Boyce', 'Wes Agar', 'Henry Thornton'],
        bowlers: [
          { name: 'David Payne', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Henry Thornton', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Jamie Overton', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Cameron Boyce', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Matthew Short', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'melbourne_stars',
        name: 'Melbourne Stars',
        rating: 58,
        color: '#00b894',
        keyPlayer: 'Glenn Maxwell',
        roster: ['Glenn Maxwell', 'Thomas Rogers', 'Beau Webster', 'Marcus Stoinis', 'Hilton Cartwright', 'Imad Wasim', 'Sam Harper', 'Usama Mir', 'Joel Paris', 'Mark Steketee', 'Haris Rauf'],
        bowlers: [
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Joel Paris', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Mark Steketee', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Usama Mir', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Imad Wasim', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'hobart_hurricanes',
        name: 'Hobart Hurricanes',
        rating: 58,
        color: '#6c5ce7',
        keyPlayer: 'Tim David',
        roster: ['Matthew Wade', 'Ben McDermott', 'Caleb Jewell', 'Mac Wright', 'Corey Anderson', 'Tim David', 'Nikhil Chaudhary', 'Chris Jordan', 'Patrick Dooley', 'Nathan Ellis', 'Riley Meredith'],
        bowlers: [
          { name: 'Riley Meredith', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Nathan Ellis', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Chris Jordan', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Patrick Dooley', style: 'Left-Arm Mystery Spin', type: 'spin' },
          { name: 'Nikhil Chaudhary', style: 'Right-Arm Leg-Break', type: 'spin' }
        ]
      },
      {
        id: 'sydney_thunder',
        name: 'Sydney Thunder',
        rating: 57,
        color: '#a8e6cf',
        keyPlayer: 'David Warner',
        roster: ['David Warner', 'Cameron Bancroft', 'Alex Hales', 'Oliver Davies', 'Alex Ross', 'Daniel Sams', 'Chris Green', 'Nathan McAndrew', 'Gurinder Sandhu', 'Liam Hatcher', 'Tanveer Sangha'],
        bowlers: [
          { name: 'Daniel Sams', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Nathan McAndrew', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Gurinder Sandhu', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Tanveer Sangha', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Chris Green', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'melbourne_renegades',
        name: 'Melbourne Renegades',
        rating: 56,
        color: '#d63031',
        keyPlayer: 'Quinton de Kock',
        roster: ['Quinton de Kock', 'Shaun Marsh', 'Jake Fraser-McGurk', 'Nic Maddinson', 'Will Sutherland', 'Jonathan Wells', 'Akeal Hosein', 'Tom Rogers', 'Kane Richardson', 'Adam Zampa', 'Peter Siddle'],
        bowlers: [
          { name: 'Adam Zampa', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Kane Richardson', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Peter Siddle', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Tom Rogers', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      }
    ]
  },
  {
    id: 'psl_super_league',
    name: 'Pakistan Super League (PSL)',
    tier: 2,
    requiredLevel: 4,
    icon: '🇵🇰',
    badge: 'PSL PAKISTAN',
    color: '#00b894',
    description: 'The premier Pakistani T20 tournament renowned for world-class raw pace and reverse swing.',
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'Medium',
    bowlerSkill: 58,
    rewards: {
      xp: 1100,
      coins: 550,
      reputation: 16,
      trophy: 'PSL Super Trophy'
    },
    teams: [
      {
        id: 'lahore_qalandars',
        name: 'Lahore Qalandars',
        rating: 70,
        color: '#00b894',
        keyPlayer: 'Shaheen Shah Afridi',
        roster: ['Fakhar Zaman', 'Sahibzada Farhan', 'Rassie van der Dussen', 'Abdullah Shafique', 'Sikandar Raza', 'George Linde', 'Shaheen Shah Afridi', 'Jahandad Khan', 'David Wiese', 'Haris Rauf', 'Zaman Khan'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Zaman Khan', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Sikandar Raza', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'David Wiese', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'islamabad_united',
        name: 'Islamabad United',
        rating: 71,
        color: '#e74c3c',
        keyPlayer: 'Shadab Khan',
        roster: ['Alex Hales', 'Colin Munro', 'Agha Salman', 'Shadab Khan', 'Azam Khan', 'Haider Ali', 'Imad Wasim', 'Faheem Ashraf', 'Hunain Shah', 'Naseem Shah', 'Tymal Mills'],
        bowlers: [
          { name: 'Naseem Shah', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Tymal Mills', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Shadab Khan', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Imad Wasim', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Hunain Shah', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'peshawar_zalmi',
        name: 'Peshawar Zalmi',
        rating: 71,
        color: '#f1c40f',
        keyPlayer: 'Babar Azam',
        roster: ['Babar Azam', 'Saim Ayub', 'Mohammad Haris', 'Haseebullah Khan', 'Rovman Powell', 'Asif Ali', 'Paul Walter', 'Aamer Jamal', 'Luke Wood', 'Naveen-ul-Haq', 'Arif Yaqoob'],
        bowlers: [
          { name: 'Luke Wood', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Naveen-ul-Haq', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Aamer Jamal', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Arif Yaqoob', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Saim Ayub', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'multan_sultans',
        name: 'Multan Sultans',
        rating: 72,
        color: '#16a085',
        keyPlayer: 'Mohammad Rizwan',
        roster: ['Mohammad Rizwan', 'Yasir Khan', 'Usman Khan', 'Johnson Charles', 'Iftikhar Ahmed', 'Khushdil Shah', 'David Willey', 'Chris Jordan', 'Usama Mir', 'Abbas Afridi', 'Mohammad Ali'],
        bowlers: [
          { name: 'David Willey', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Mohammad Ali', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Abbas Afridi', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Usama Mir', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Iftikhar Ahmed', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'karachi_kings',
        name: 'Karachi Kings',
        rating: 68,
        color: '#0984e3',
        keyPlayer: 'Shan Masood',
        roster: ['Shan Masood', 'Tim Seifert', 'James Vince', 'Shoaib Malik', 'Irfan Khan', 'Kieron Pollard', 'Anwar Ali', 'Hasan Ali', 'Mir Hamza', 'Zahid Mahmood', 'Blessing Muzarabani'],
        bowlers: [
          { name: 'Hasan Ali', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Mir Hamza', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Blessing Muzarabani', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Zahid Mahmood', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Shoaib Malik', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'quetta_gladiators',
        name: 'Quetta Gladiators',
        rating: 69,
        color: '#8e44ad',
        keyPlayer: 'Rilee Rossouw',
        roster: ['Jason Roy', 'Saud Shakeel', 'Khawaja Nafay', 'Rilee Rossouw', 'Omair Yousuf', 'Sherfane Rutherford', 'Akeal Hosein', 'Mohammad Wasim Jr', 'Mohammad Amir', 'Abrar Ahmed', 'Usman Tariq'],
        bowlers: [
          { name: 'Mohammad Amir', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Mohammad Wasim Jr', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Abrar Ahmed', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Usman Tariq', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'sialkot_stallions',
        name: 'Sialkot Stallions',
        rating: 68,
        color: '#2c3e50',
        keyPlayer: 'Shoaib Malik',
        roster: ['Imran Nazir', 'Mukhtar Ahmed', 'Haris Sohail', 'Shoaib Malik', 'Mansoor Amjad', 'Raza Hasan', 'Bilawal Bhatti', 'Naved-ul-Hasan', 'Abdur Rehman', 'Sarmad Anwar', 'Umaid Asif'],
        bowlers: [
          { name: 'Naved-ul-Hasan', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Bilawal Bhatti', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Abdur Rehman', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Raza Hasan', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Umaid Asif', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'rawalpindi_express',
        name: 'Rawalpindi Kings',
        rating: 69,
        color: '#27ae60',
        keyPlayer: 'Haris Rauf',
        roster: ['Yasir Hameed', 'Umar Amin', 'Babar Naeem', 'Hammad Azam', 'Sohail Tanvir', 'Mohammad Nawaz', 'Yasir Arafat', 'Sohail Khan', 'Haris Rauf', 'Shadab Kabir', 'Najaf Shah'],
        bowlers: [
          { name: 'Sohail Tanvir', style: 'Left-Arm Medium-Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Yasir Arafat', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Mohammad Nawaz', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Sohail Khan', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      }
    ]
  },
  {
    id: 'ipl_premier_league',
    name: 'Indian Premier League (IPL)',
    tier: 3,
    requiredLevel: 6,
    icon: '🇮🇳',
    badge: 'IPL INDIA',
    color: '#f1c40f',
    description: "The world's most star-studded T20 league! The greatest franchise tournament on the planet.",
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'Hard',
    bowlerSkill: 68,
    rewards: {
      xp: 2200,
      coins: 1400,
      reputation: 35,
      trophy: 'IPL Champions Trophy'
    },
    teams: [
      {
        id: 'csk',
        name: 'Chennai Super Kings (CSK)',
        rating: 80,
        color: '#f1c40f',
        keyPlayer: 'MS Dhoni & Ruturaj Gaikwad',
        roster: ['Ruturaj Gaikwad', 'Rachin Ravindra', 'Ajinkya Rahane', 'Daryl Mitchell', 'Shivam Dube', 'Ravindra Jadeja', 'MS Dhoni', 'Mitchell Santner', 'Shardul Thakur', 'Deepak Chahar', 'Matheesha Pathirana'],
        bowlers: [
          { name: 'Matheesha Pathirana', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Deepak Chahar', style: 'Right-Arm Medium Swing', type: 'pace' },
          { name: 'Ravindra Jadeja', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Mitchell Santner', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Shardul Thakur', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'mi',
        name: 'Mumbai Indians (MI)',
        rating: 80,
        color: '#0984e3',
        keyPlayer: 'Rohit Sharma & Jasprit Bumrah',
        roster: ['Rohit Sharma', 'Ishan Kishan', 'Suryakumar Yadav', 'Tilak Varma', 'Hardik Pandya', 'Tim David', 'Mohammad Nabi', 'Gerald Coetzee', 'Piyush Chawla', 'Jasprit Bumrah', 'Nuwan Thushara'],
        bowlers: [
          { name: 'Jasprit Bumrah', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Gerald Coetzee', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Nuwan Thushara', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Piyush Chawla', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Hardik Pandya', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'rcb',
        name: 'Royal Challengers Bengaluru (RCB)',
        rating: 79,
        color: '#d63031',
        keyPlayer: 'Virat Kohli',
        roster: ['Faf du Plessis', 'Virat Kohli', 'Will Jacks', 'Rajat Patidar', 'Glenn Maxwell', 'Cameron Green', 'Dinesh Karthik', 'Mahipal Lomror', 'Karn Sharma', 'Mohammed Siraj', 'Yash Dayal'],
        bowlers: [
          { name: 'Mohammed Siraj', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Yash Dayal', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Glenn Maxwell', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Karn Sharma', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Cameron Green', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'kkr',
        name: 'Kolkata Knight Riders (KKR)',
        rating: 81,
        color: '#574b90',
        keyPlayer: 'Andre Russell & Sunil Narine',
        roster: ['Philip Salt', 'Sunil Narine', 'Venkatesh Iyer', 'Shreyas Iyer', 'Rinku Singh', 'Andre Russell', 'Ramandeep Singh', 'Mitchell Starc', 'Harshit Rana', 'Varun Chakaravarthy', 'Vaibhav Arora'],
        bowlers: [
          { name: 'Mitchell Starc', style: 'Left-Arm Express Fast', type: 'pace' },
          { name: 'Sunil Narine', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Varun Chakaravarthy', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Harshit Rana', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Andre Russell', style: 'Right-Arm Fast', type: 'pace' }
        ]
      },
      {
        id: 'gt',
        name: 'Gujarat Titans (GT)',
        rating: 78,
        color: '#1b1464',
        keyPlayer: 'Shubman Gill & Rashid Khan',
        roster: ['Shubman Gill', 'Wriddhiman Saha', 'Sai Sudharsan', 'David Miller', 'Azmatullah Omarzai', 'Rahul Tewatia', 'Shahrukh Khan', 'Rashid Khan', 'R Sai Kishore', 'Umesh Yadav', 'Mohit Sharma'],
        bowlers: [
          { name: 'Rashid Khan', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Mohit Sharma', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Umesh Yadav', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'R Sai Kishore', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Azmatullah Omarzai', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'rr',
        name: 'Rajasthan Royals (RR)',
        rating: 79,
        color: '#e84393',
        keyPlayer: 'Sanju Samson & Jos Buttler',
        roster: ['Yashasvi Jaiswal', 'Jos Buttler', 'Sanju Samson', 'Riyan Parag', 'Shimron Hetmyer', 'Dhruv Jurel', 'Ravichandran Ashwin', 'Trent Boult', 'Avesh Khan', 'Sandeep Sharma', 'Yuzvendra Chahal'],
        bowlers: [
          { name: 'Trent Boult', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Yuzvendra Chahal', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Ravichandran Ashwin', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Sandeep Sharma', style: 'Right-Arm Medium Swing', type: 'pace' },
          { name: 'Avesh Khan', style: 'Right-Arm Fast', type: 'pace' }
        ]
      },
      {
        id: 'srh',
        name: 'Sunrisers Hyderabad (SRH)',
        rating: 80,
        color: '#e67e22',
        keyPlayer: 'Pat Cummins & Heinrich Klaasen',
        roster: ['Travis Head', 'Abhishek Sharma', 'Aiden Markram', 'Heinrich Klaasen', 'Nitish Kumar Reddy', 'Abdul Samad', 'Shahbaz Ahmed', 'Pat Cummins', 'Bhuvneshwar Kumar', 'Jaydev Unadkat', 'T Natarajan'],
        bowlers: [
          { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Bhuvneshwar Kumar', style: 'Right-Arm Swing Fast', type: 'pace' },
          { name: 'T Natarajan', style: 'Left-Arm Yorker Specialist', type: 'pace' },
          { name: 'Jaydev Unadkat', style: 'Left-Arm Medium-Fast', type: 'pace' },
          { name: 'Shahbaz Ahmed', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'dc',
        name: 'Delhi Capitals (DC)',
        rating: 77,
        color: '#0652dd',
        keyPlayer: 'Rishabh Pant & Axar Patel',
        roster: ['David Warner', 'Prithvi Shaw', 'Jake Fraser-McGurk', 'Rishabh Pant', 'Tristan Stubbs', 'Axar Patel', 'Abishek Porel', 'Kuldeep Yadav', 'Anrich Nortje', 'Khaleel Ahmed', 'Mukesh Kumar'],
        bowlers: [
          { name: 'Anrich Nortje', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist-Spin', type: 'spin' },
          { name: 'Axar Patel', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Khaleel Ahmed', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Mukesh Kumar', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      }
    ]
  },
  {
    id: 'asia_cup',
    name: 'ACC Asia Cup',
    tier: 4,
    requiredLevel: 9,
    icon: '🌏',
    badge: 'ASIA CUP',
    color: '#0984e3',
    description: 'Continental showdown featuring the fiercest international cricket rivalries across Asia.',
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'Expert',
    bowlerSkill: 78,
    rewards: {
      xp: 3500,
      coins: 2400,
      reputation: 55,
      trophy: 'ACC Asia Cup Trophy'
    },
    teams: [
      {
        id: 'india',
        name: 'India',
        rating: 86,
        color: '#0984e3',
        keyPlayer: 'Rohit Sharma & Virat Kohli',
        roster: ['Rohit Sharma', 'Yashasvi Jaiswal', 'Virat Kohli', 'Suryakumar Yadav', 'Rishabh Pant', 'Hardik Pandya', 'Ravindra Jadeja', 'Axar Patel', 'Kuldeep Yadav', 'Arshdeep Singh', 'Jasprit Bumrah'],
        bowlers: [
          { name: 'Jasprit Bumrah', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Arshdeep Singh', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist-Spin', type: 'spin' },
          { name: 'Ravindra Jadeja', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Hardik Pandya', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'pakistan',
        name: 'Pakistan',
        rating: 84,
        color: '#006266',
        keyPlayer: 'Babar Azam & Shaheen Afridi',
        roster: ['Mohammad Rizwan', 'Babar Azam', 'Saim Ayub', 'Fakhar Zaman', 'Usman Khan', 'Shadab Khan', 'Imad Wasim', 'Shaheen Shah Afridi', 'Naseem Shah', 'Haris Rauf', 'Mohammad Amir'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Naseem Shah', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Shadab Khan', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Mohammad Amir', style: 'Left-Arm Fast', type: 'pace' }
        ]
      },
      {
        id: 'sri_lanka',
        name: 'Sri Lanka',
        rating: 81,
        color: '#1b1464',
        keyPlayer: 'Wanindu Hasaranga',
        roster: ['Pathum Nissanka', 'Kusal Mendis', 'Kamindu Mendis', 'Dhananjaya de Silva', 'Charith Asalanka', 'Wanindu Hasaranga', 'Angelo Mathews', 'Dasun Shanaka', 'Maheesh Theekshana', 'Matheesha Pathirana', 'Nuwan Thushara'],
        bowlers: [
          { name: 'Matheesha Pathirana', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Wanindu Hasaranga', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Maheesh Theekshana', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Nuwan Thushara', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Dasun Shanaka', style: 'Right-Arm Medium', type: 'pace' }
        ]
      },
      {
        id: 'afghanistan',
        name: 'Afghanistan',
        rating: 82,
        color: '#0652dd',
        keyPlayer: 'Rashid Khan & Gurbaz',
        roster: ['Rahmanullah Gurbaz', 'Ibrahim Zadran', 'Gulbadin Naib', 'Azmatullah Omarzai', 'Mohammad Nabi', 'Najibullah Zadran', 'Karim Janat', 'Rashid Khan', 'Noor Ahmad', 'Naveen-ul-Haq', 'Fazalhaq Farooqi'],
        bowlers: [
          { name: 'Rashid Khan', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Fazalhaq Farooqi', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Naveen-ul-Haq', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Noor Ahmad', style: 'Left-Arm Wrist-Spin', type: 'spin' },
          { name: 'Mohammad Nabi', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'bangladesh',
        name: 'Bangladesh',
        rating: 79,
        color: '#009432',
        keyPlayer: 'Shakib Al Hasan & Taskin',
        roster: ['Tanzid Hasan', 'Litton Das', 'Najmul Hossain Shanto', 'Towhid Hridoy', 'Shakib Al Hasan', 'Mahmudullah', 'Jaker Ali', 'Rishad Hossain', 'Taskin Ahmed', 'Tanzim Hasan Sakib', 'Mustafizur Rahman'],
        bowlers: [
          { name: 'Mustafizur Rahman', style: 'Left-Arm Cutter Specialist', type: 'pace' },
          { name: 'Taskin Ahmed', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Shakib Al Hasan', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Rishad Hossain', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Tanzim Hasan Sakib', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'nepal',
        name: 'Nepal',
        rating: 74,
        color: '#c0392b',
        keyPlayer: 'Rohit Paudel',
        roster: ['Kushal Bhurtel', 'Aasif Sheikh', 'Anil Sah', 'Rohit Paudel', 'Kushal Malla', 'Dipendra Singh Airee', 'Gulsan Jha', 'Sompal Kami', 'Karan KC', 'Sandeep Lamichhane', 'Abinash Bohara'],
        bowlers: [
          { name: 'Sandeep Lamichhane', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Sompal Kami', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Karan KC', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Dipendra Singh Airee', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Abinash Bohara', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'uae',
        name: 'United Arab Emirates (UAE)',
        rating: 73,
        color: '#2c3e50',
        keyPlayer: 'Muhammad Waseem',
        roster: ['Muhammad Waseem', 'Aryansh Sharma', 'Vriitya Aravind', 'Asif Khan', 'Alishan Sharafu', 'Basil Hameed', 'Aayan Afzal Khan', 'Ali Naseer', 'Zahoor Khan', 'Junaid Siddique', 'Muhammad Jawadullah'],
        bowlers: [
          { name: 'Junaid Siddique', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Zahoor Khan', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Aayan Afzal Khan', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Muhammad Jawadullah', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Basil Hameed', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'oman',
        name: 'Oman',
        rating: 72,
        color: '#d35400',
        keyPlayer: 'Aqib Ilyas',
        roster: ['Kashyap Prajapati', 'Pratik Athavale', 'Aqib Ilyas', 'Zeeshan Maqsood', 'Khalid Kail', 'Ayaan Khan', 'Mehran Khan', 'Rafiullah', 'Shakeel Ahmed', 'Fayyaz Butt', 'Bilal Khan'],
        bowlers: [
          { name: 'Bilal Khan', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Fayyaz Butt', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Zeeshan Maqsood', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Aqib Ilyas', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Shakeel Ahmed', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      }
    ]
  },
  {
    id: 'champions_trophy',
    name: 'ICC Champions Trophy',
    tier: 5,
    requiredLevel: 12,
    icon: '🏆',
    badge: 'ICC CHAMPIONS',
    color: '#8e44ad',
    description: 'The Mini-World Cup! Only the top 8 ranked nations on earth battle for global supremacy.',
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'Legendary',
    bowlerSkill: 86,
    rewards: {
      xp: 5500,
      coins: 4500,
      reputation: 90,
      trophy: 'ICC Champions Trophy'
    },
    teams: [
      {
        id: 'team_india',
        name: 'India',
        rating: 91,
        color: '#0984e3',
        keyPlayer: 'Jasprit Bumrah & Rohit Sharma',
        roster: ['Rohit Sharma', 'Shubman Gill', 'Virat Kohli', 'Shreyas Iyer', 'KL Rahul', 'Hardik Pandya', 'Ravindra Jadeja', 'Kuldeep Yadav', 'Mohammed Shami', 'Jasprit Bumrah', 'Mohammed Siraj'],
        bowlers: [
          { name: 'Jasprit Bumrah', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mohammed Shami', style: 'Right-Arm Seam Fast', type: 'pace' },
          { name: 'Mohammed Siraj', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist-Spin', type: 'spin' },
          { name: 'Ravindra Jadeja', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'team_australia',
        name: 'Australia',
        rating: 91,
        color: '#f1c40f',
        keyPlayer: 'Pat Cummins & Travis Head',
        roster: ['Travis Head', 'David Warner', 'Mitchell Marsh', 'Steve Smith', 'Marnus Labuschagne', 'Glenn Maxwell', 'Josh Inglis', 'Pat Cummins', 'Mitchell Starc', 'Adam Zampa', 'Josh Hazlewood'],
        bowlers: [
          { name: 'Mitchell Starc', style: 'Left-Arm Express Fast', type: 'pace' },
          { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Josh Hazlewood', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Adam Zampa', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Glenn Maxwell', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'team_england',
        name: 'England',
        rating: 88,
        color: '#d63031',
        keyPlayer: 'Jos Buttler & Jofra Archer',
        roster: ['Jonny Bairstow', 'Phil Salt', 'Joe Root', 'Harry Brook', 'Jos Buttler', 'Liam Livingstone', 'Moeen Ali', 'Chris Woakes', 'Jofra Archer', 'Adil Rashid', 'Mark Wood'],
        bowlers: [
          { name: 'Jofra Archer', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mark Wood', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Chris Woakes', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Adil Rashid', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Moeen Ali', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'team_south_africa',
        name: 'South Africa',
        rating: 88,
        color: '#00b894',
        keyPlayer: 'Kagiso Rabada & Klaasen',
        roster: ['Quinton de Kock', 'Temba Bavuma', 'Rassie van der Dussen', 'Aiden Markram', 'Heinrich Klaasen', 'David Miller', 'Marco Jansen', 'Gerald Coetzee', 'Keshav Maharaj', 'Kagiso Rabada', 'Lungi Ngidi'],
        bowlers: [
          { name: 'Kagiso Rabada', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Marco Jansen', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Gerald Coetzee', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Keshav Maharaj', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Lungi Ngidi', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'team_new_zealand',
        name: 'New Zealand',
        rating: 87,
        color: '#2d3436',
        keyPlayer: 'Kane Williamson & Trent Boult',
        roster: ['Devon Conway', 'Rachin Ravindra', 'Kane Williamson', 'Daryl Mitchell', 'Tom Latham', 'Glenn Phillips', 'Mark Chapman', 'Mitchell Santner', 'Matt Henry', 'Lockie Ferguson', 'Trent Boult'],
        bowlers: [
          { name: 'Trent Boult', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Matt Henry', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Lockie Ferguson', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mitchell Santner', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Glenn Phillips', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'team_pakistan',
        name: 'Pakistan',
        rating: 87,
        color: '#006266',
        keyPlayer: 'Shaheen Afridi & Rizwan',
        roster: ['Abdullah Shafique', 'Imam-ul-Haq', 'Babar Azam', 'Mohammad Rizwan', 'Saud Shakeel', 'Iftikhar Ahmed', 'Shadab Khan', 'Mohammad Nawaz', 'Shaheen Shah Afridi', 'Hasan Ali', 'Haris Rauf'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Hasan Ali', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Shadab Khan', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Mohammad Nawaz', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'team_west_indies',
        name: 'West Indies',
        rating: 85,
        color: '#6F1E51',
        keyPlayer: 'Nicholas Pooran & Russell',
        roster: ['Brandon King', 'Kyle Mayers', 'Shai Hope', 'Nicholas Pooran', 'Shimron Hetmyer', 'Rovman Powell', 'Andre Russell', 'Romario Shepherd', 'Akeal Hosein', 'Alzarri Joseph', 'Gudakesh Motie'],
        bowlers: [
          { name: 'Alzarri Joseph', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Andre Russell', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Gudakesh Motie', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Romario Shepherd', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'team_afghanistan',
        name: 'Afghanistan',
        rating: 85,
        color: '#0652DD',
        keyPlayer: 'Rashid Khan & Noor Ahmad',
        roster: ['Rahmanullah Gurbaz', 'Ibrahim Zadran', 'Rahmat Shah', 'Hashmatullah Shahidi', 'Azmatullah Omarzai', 'Mohammad Nabi', 'Ikram Alikhil', 'Rashid Khan', 'Mujeeb Ur Rahman', 'Naveen-ul-Haq', 'Fazalhaq Farooqi'],
        bowlers: [
          { name: 'Rashid Khan', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Fazalhaq Farooqi', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Mujeeb Ur Rahman', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Naveen-ul-Haq', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Mohammad Nabi', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      }
    ]
  },
  {
    id: 'icc_t20_world_cup',
    name: 'ICC T20 World Cup',
    tier: 6,
    requiredLevel: 15,
    icon: '🌍',
    badge: 'T20 WORLD CUP',
    color: '#e74c3c',
    description: 'The pinnacle of international T20 cricket. Become the undisputed Champion of the World!',
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'World Class',
    bowlerSkill: 92,
    rewards: {
      xp: 8000,
      coins: 7000,
      reputation: 150,
      trophy: 'ICC T20 World Cup Trophy'
    },
    teams: [
      {
        id: 'wc_india',
        name: 'India (World Champions)',
        rating: 94,
        color: '#0984e3',
        keyPlayer: 'Rohit, Kohli & Bumrah',
        roster: ['Rohit Sharma', 'Virat Kohli', 'Rishabh Pant', 'Suryakumar Yadav', 'Shivam Dube', 'Hardik Pandya', 'Ravindra Jadeja', 'Axar Patel', 'Kuldeep Yadav', 'Arshdeep Singh', 'Jasprit Bumrah'],
        bowlers: [
          { name: 'Jasprit Bumrah', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Arshdeep Singh', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Hardik Pandya', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist-Spin', type: 'spin' },
          { name: 'Axar Patel', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'wc_australia',
        name: 'Australia',
        rating: 93,
        color: '#f1c40f',
        keyPlayer: 'Cummins, Head & Starc',
        roster: ['Travis Head', 'David Warner', 'Mitchell Marsh', 'Glenn Maxwell', 'Marcus Stoinis', 'Tim David', 'Matthew Wade', 'Pat Cummins', 'Mitchell Starc', 'Nathan Ellis', 'Adam Zampa'],
        bowlers: [
          { name: 'Mitchell Starc', style: 'Left-Arm Express Fast', type: 'pace' },
          { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Adam Zampa', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Nathan Ellis', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Marcus Stoinis', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'wc_south_africa',
        name: 'South Africa',
        rating: 91,
        color: '#00b894',
        keyPlayer: 'Klaasen, Miller & Rabada',
        roster: ['Quinton de Kock', 'Reeza Hendricks', 'Aiden Markram', 'Heinrich Klaasen', 'David Miller', 'Tristan Stubbs', 'Marco Jansen', 'Keshav Maharaj', 'Kagiso Rabada', 'Anrich Nortje', 'Ottneil Baartman'],
        bowlers: [
          { name: 'Anrich Nortje', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Kagiso Rabada', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Marco Jansen', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Keshav Maharaj', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Ottneil Baartman', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'wc_england',
        name: 'England',
        rating: 90,
        color: '#d63031',
        keyPlayer: 'Buttler, Salt & Archer',
        roster: ['Philip Salt', 'Jos Buttler', 'Will Jacks', 'Jonny Bairstow', 'Harry Brook', 'Liam Livingstone', 'Moeen Ali', 'Sam Curran', 'Jofra Archer', 'Adil Rashid', 'Mark Wood'],
        bowlers: [
          { name: 'Jofra Archer', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mark Wood', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Adil Rashid', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Sam Curran', style: 'Left-Arm Medium-Fast', type: 'pace' },
          { name: 'Chris Jordan', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'wc_west_indies',
        name: 'West Indies',
        rating: 89,
        color: '#6F1E51',
        keyPlayer: 'Pooran, Russell & Hetmyer',
        roster: ['Brandon King', 'Johnson Charles', 'Nicholas Pooran', 'Roston Chase', 'Rovman Powell', 'Sherfane Rutherford', 'Andre Russell', 'Romario Shepherd', 'Akeal Hosein', 'Alzarri Joseph', 'Gudakesh Motie'],
        bowlers: [
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Alzarri Joseph', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Andre Russell', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Gudakesh Motie', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Romario Shepherd', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'wc_pakistan',
        name: 'Pakistan',
        rating: 88,
        color: '#006266',
        keyPlayer: 'Babar, Rizwan & Naseem',
        roster: ['Mohammad Rizwan', 'Babar Azam', 'Saim Ayub', 'Fakhar Zaman', 'Usman Khan', 'Shadab Khan', 'Imad Wasim', 'Shaheen Shah Afridi', 'Naseem Shah', 'Haris Rauf', 'Mohammad Amir'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Naseem Shah', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mohammad Amir', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Imad Wasim', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'wc_new_zealand',
        name: 'New Zealand',
        rating: 88,
        color: '#2d3436',
        keyPlayer: 'Williamson, Conway & Boult',
        roster: ['Finn Allen', 'Devon Conway', 'Kane Williamson', 'Daryl Mitchell', 'Glenn Phillips', 'James Neesham', 'Mitchell Santner', 'Matt Henry', 'Lockie Ferguson', 'Trent Boult', 'Tim Southee'],
        bowlers: [
          { name: 'Trent Boult', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Tim Southee', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Lockie Ferguson', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Mitchell Santner', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Matt Henry', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'wc_sri_lanka',
        name: 'Sri Lanka',
        rating: 86,
        color: '#1B1464',
        keyPlayer: 'Hasaranga, Pathirana & Nissanka',
        roster: ['Pathum Nissanka', 'Kusal Mendis', 'Kamindu Mendis', 'Dhananjaya de Silva', 'Charith Asalanka', 'Angelo Mathews', 'Dasun Shanaka', 'Wanindu Hasaranga', 'Maheesh Theekshana', 'Matheesha Pathirana', 'Nuwan Thushara'],
        bowlers: [
          { name: 'Matheesha Pathirana', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Wanindu Hasaranga', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Maheesh Theekshana', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Nuwan Thushara', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Angelo Mathews', style: 'Right-Arm Medium', type: 'pace' }
        ]
      }
    ]
  },
  {
    id: 'all_time_legends_cup',
    name: 'All-Time World Cup Legends Cup',
    tier: 7,
    requiredLevel: 18,
    icon: '👑',
    badge: 'ALL-TIME MASTERS',
    color: '#9b59b6',
    description: 'The ultimate dream competition! Clash against the greatest historic world champion squads ever assembled.',
    overs: 20,
    balls: 120,
    rounds: ['Quarter-Final', 'Semi-Final', 'Grand Final'],
    difficulty: 'God Tier',
    bowlerSkill: 97,
    rewards: {
      xp: 15000,
      coins: 12000,
      reputation: 250,
      trophy: 'All-Time Legends World Trophy'
    },
    teams: [
      {
        id: 'aussies_2003',
        name: 'Australia 2003 (The Invincibles)',
        rating: 98,
        color: '#f1c40f',
        keyPlayer: 'Ricky Ponting & Glenn McGrath',
        roster: ['Adam Gilchrist', 'Matthew Hayden', 'Ricky Ponting', 'Damien Martyn', 'Darren Lehmann', 'Michael Bevan', 'Andrew Symonds', 'Brad Hogg', 'Andy Bichel', 'Brett Lee', 'Glenn McGrath'],
        bowlers: [
          { name: 'Glenn McGrath', style: 'Right-Arm Fast-Medium Metronome', type: 'pace' },
          { name: 'Brett Lee', style: 'Right-Arm Express Fast (155 km/h)', type: 'pace' },
          { name: 'Brad Hogg', style: 'Left-Arm Chinaman Wrist-Spin', type: 'spin' },
          { name: 'Andy Bichel', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Andrew Symonds', style: 'Right-Arm Off-Break / Medium', type: 'spin' }
        ]
      },
      {
        id: 'calypso_1975',
        name: 'West Indies 1975 (Calypso Kings)',
        rating: 97,
        color: '#8e44ad',
        keyPlayer: 'Clive Lloyd & Michael Holding',
        roster: ['Roy Fredericks', 'Gordon Greenidge', 'Alvin Kallicharran', 'Clive Lloyd', 'Rohan Kanhai', 'Viv Richards', 'Deryck Murray', 'Bernard Julien', 'Keith Boyce', 'Andy Roberts', 'Michael Holding'],
        bowlers: [
          { name: 'Michael Holding', style: 'Whispering Death Express Fast', type: 'pace' },
          { name: 'Andy Roberts', style: 'Right-Arm Lethal Bouncer Fast', type: 'pace' },
          { name: 'Keith Boyce', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Bernard Julien', style: 'Left-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'Viv Richards', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'india_2011',
        name: 'India 2011 (World Champions)',
        rating: 97,
        color: '#3498db',
        keyPlayer: 'Sachin Tendulkar & MS Dhoni',
        roster: ['Virender Sehwag', 'Sachin Tendulkar', 'Gautam Gambhir', 'Virat Kohli', 'Yuvraj Singh', 'MS Dhoni', 'Suresh Raina', 'Harbhajan Singh', 'Zaheer Khan', 'Munaf Patel', 'Ashish Nehra'],
        bowlers: [
          { name: 'Zaheer Khan', style: 'Left-Arm Knuckle-Ball Fast-Medium', type: 'pace' },
          { name: 'Harbhajan Singh', style: 'Right-Arm Off-Break Doosra', type: 'spin' },
          { name: 'Munaf Patel', style: 'Right-Arm Medium-Fast Line & Length', type: 'pace' },
          { name: 'Ashish Nehra', style: 'Left-Arm Swing Fast', type: 'pace' },
          { name: 'Yuvraj Singh', style: 'Slow Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'pakistan_1992',
        name: 'Pakistan 1992 (Cornered Tigers)',
        rating: 96,
        color: '#27ae60',
        keyPlayer: 'Imran Khan & Wasim Akram',
        roster: ['Aamer Sohail', 'Rameez Raja', 'Inzamam-ul-Haq', 'Javed Miandad', 'Saleem Malik', 'Imran Khan', 'Wasim Akram', 'Moin Khan', 'Mushtaq Ahmed', 'Aaqib Javed', 'Ijaz Ahmed'],
        bowlers: [
          { name: 'Wasim Akram', style: 'Left-Arm Sultan of Swing Fast', type: 'pace' },
          { name: 'Imran Khan', style: 'Right-Arm Reverse Swing Fast', type: 'pace' },
          { name: 'Aaqib Javed', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Mushtaq Ahmed', style: 'Right-Arm Leg-Break Googly', type: 'spin' },
          { name: 'Aamer Sohail', style: 'Slow Left-Arm Orthodox', type: 'spin' }
        ]
      },
      {
        id: 'england_2019',
        name: 'England 2019 (World Champions)',
        rating: 96,
        color: '#e74c3c',
        keyPlayer: 'Eoin Morgan & Ben Stokes',
        roster: ['Jason Roy', 'Jonny Bairstow', 'Joe Root', 'Eoin Morgan', 'Ben Stokes', 'Jos Buttler', 'Chris Woakes', 'Liam Plunkett', 'Adil Rashid', 'Jofra Archer', 'Mark Wood'],
        bowlers: [
          { name: 'Jofra Archer', style: 'Super-Over Express Fast', type: 'pace' },
          { name: 'Mark Wood', style: 'Right-Arm 95mph Fast', type: 'pace' },
          { name: 'Chris Woakes', style: 'Right-Arm Swing Fast-Medium', type: 'pace' },
          { name: 'Adil Rashid', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'Liam Plunkett', style: 'Right-Arm Cross-Seam Fast', type: 'pace' }
        ]
      },
      {
        id: 'proteas_1999',
        name: 'South Africa 1999 (Golden Era)',
        rating: 95,
        color: '#16a085',
        keyPlayer: 'Jacques Kallis & Allan Donald',
        roster: ['Gary Kirsten', 'Herschelle Gibbs', 'Jacques Kallis', 'Daryll Cullinan', 'Hansie Cronje', 'Jonty Rhodes', 'Shaun Pollock', 'Lance Klusener', 'Mark Boucher', 'Steve Elworthy', 'Allan Donald'],
        bowlers: [
          { name: 'Allan Donald', style: 'White Lightning Express Fast', type: 'pace' },
          { name: 'Shaun Pollock', style: 'Right-Arm Immaculate Seam Fast', type: 'pace' },
          { name: 'Jacques Kallis', style: 'Right-Arm Heavy Ball Fast-Medium', type: 'pace' },
          { name: 'Lance Klusener', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Hansie Cronje', style: 'Right-Arm Medium Seam', type: 'pace' }
        ]
      },
      {
        id: 'srilanka_1996',
        name: 'Sri Lanka 1996 (World Champions)',
        rating: 95,
        color: '#2980b9',
        keyPlayer: 'Arjuna Ranatunga & Jayasuriya',
        roster: ['Sanath Jayasuriya', 'Romesh Kaluwitharana', 'Asanka Gurusinha', 'Aravinda de Silva', 'Arjuna Ranatunga', 'Hashan Tillakaratne', 'Roshan Mahanama', 'Kumar Dharmasena', 'Chaminda Vaas', 'Pramodya Wickramasinghe', 'Muttiah Muralitharan'],
        bowlers: [
          { name: 'Muttiah Muralitharan', style: 'Right-Arm Magician Off-Break', type: 'spin' },
          { name: 'Chaminda Vaas', style: 'Left-Arm Swing Specialist Fast', type: 'pace' },
          { name: 'Sanath Jayasuriya', style: 'Slow Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Kumar Dharmasena', style: 'Right-Arm Off-Break Spin', type: 'spin' },
          { name: 'Pramodya Wickramasinghe', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'aussies_1999',
        name: 'Australia 1999 (World Champions)',
        rating: 96,
        color: '#f39c12',
        keyPlayer: 'Steve Waugh & Shane Warne',
        roster: ['Mark Waugh', 'Adam Gilchrist', 'Ricky Ponting', 'Steve Waugh', 'Michael Bevan', 'Tom Moody', 'Shane Lee', 'Shane Warne', 'Paul Reiffel', 'Damien Fleming', 'Glenn McGrath'],
        bowlers: [
          { name: 'Shane Warne', style: 'King of Spin Leg-Break / Flipper', type: 'spin' },
          { name: 'Glenn McGrath', style: 'Right-Arm In-Ducker Fast-Medium', type: 'pace' },
          { name: 'Damien Fleming', style: 'Right-Arm Outswing Specialist', type: 'pace' },
          { name: 'Paul Reiffel', style: 'Right-Arm Seam Fast-Medium', type: 'pace' },
          { name: 'Tom Moody', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      }
    ]
  }
];

export function getTournamentById(id) {
  return TOURNAMENTS.find(t => t.id === id);
}

export function getTeamRoster(tournamentId, teamName) {
  const tournament = (tournamentId === 'quick_match') ? QUICK_MATCH_CONFIG : getTournamentById(tournamentId);
  if (!tournament) return null;
  const team = tournament.teams.find(t => t.name === teamName || t.id === teamName);
  return team?.roster || null;
}

export function getTeamBowlers(tournamentId, teamName) {
  const tournament = (tournamentId === 'quick_match') ? QUICK_MATCH_CONFIG : getTournamentById(tournamentId);
  if (!tournament) return null;
  const team = tournament.teams.find(t => t.name === teamName || t.id === teamName);
  return team?.bowlers || null;
}

export function isTournamentUnlocked(tournament, playerLevel, wonIds = []) {
  if (!tournament) return false;
  // Always unlock if player level is sufficient
  if (playerLevel >= tournament.requiredLevel) return true;
  // Or unlock Tier N if Tier N-1 has been won
  const prevTournament = TOURNAMENTS.find(t => t.tier === tournament.tier - 1);
  if (prevTournament && wonIds.includes(prevTournament.id)) return true;
  return false;
}

/**
 * Generate a tournament bracket for a given tournament and user's selected team.
 */
export function generateTournamentBracket(tournament, userTeamName) {
  const teams = [...tournament.teams];
  const userTeam = teams.find(t => t.name === userTeamName) || teams[0];
  const otherTeams = teams.filter(t => t.name !== userTeam.name);

  // Shuffle other teams
  for (let i = otherTeams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherTeams[i], otherTeams[j]] = [otherTeams[j], otherTeams[i]];
  }

  const is4Teams = tournament.teams.length === 4;

  if (is4Teams) {
    return {
      roundIndex: 0, // 0 = Semi-Final, 1 = Grand Final
      rounds: [
        {
          name: 'Semi-Final',
          matches: [
            { team1: userTeam.name, team2: otherTeams[0].name, winner: null, isUserMatch: true },
            { team1: otherTeams[1].name, team2: otherTeams[2].name, winner: null, isUserMatch: false }
          ]
        },
        {
          name: 'Grand Final',
          matches: [
            { team1: null, team2: null, winner: null, isUserMatch: true }
          ]
        }
      ]
    };
  } else {
    return {
      roundIndex: 0, // 0 = QF, 1 = SF, 2 = Final
      rounds: [
        {
          name: 'Quarter-Final',
          matches: [
            { team1: userTeam.name, team2: otherTeams[0].name, winner: null, isUserMatch: true },
            { team1: otherTeams[1].name, team2: otherTeams[2].name, winner: null, isUserMatch: false },
            { team1: otherTeams[3].name, team2: otherTeams[4].name, winner: null, isUserMatch: false },
            { team1: otherTeams[5].name, team2: otherTeams[6].name, winner: null, isUserMatch: false }
          ]
        },
        {
          name: 'Semi-Final',
          matches: [
            { team1: null, team2: null, winner: null, isUserMatch: true },
            { team1: null, team2: null, winner: null, isUserMatch: false }
          ]
        },
        {
          name: 'Grand Final',
          matches: [
            { team1: null, team2: null, winner: null, isUserMatch: true }
          ]
        }
      ]
    };
  }
}

/**
 * Progresses the bracket after a user match.
 * Simulates non-user AI matches in the current round.
 */
export function advanceBracket(bracket, userWon) {
  const currentRound = bracket.rounds[bracket.roundIndex];
  const userMatch = currentRound.matches.find(m => m.isUserMatch);
  
  if (userWon) {
    userMatch.winner = userMatch.team1;
  } else {
    userMatch.winner = userMatch.team2;
    return { finished: true, won: false, bracket };
  }

  // Simulate AI matches in this round
  for (const m of currentRound.matches) {
    if (!m.isUserMatch && !m.winner) {
      m.winner = Math.random() < 0.5 ? m.team1 : m.team2;
    }
  }

  // Is this the final round?
  if (bracket.roundIndex === bracket.rounds.length - 1) {
    return { finished: true, won: true, bracket };
  }

  // Populate next round
  const nextRoundIndex = bracket.roundIndex + 1;
  const nextRound = bracket.rounds[nextRoundIndex];

  if (bracket.rounds.length === 2) {
    // Semi -> Final (4 teams)
    nextRound.matches[0].team1 = currentRound.matches[0].winner;
    nextRound.matches[0].team2 = currentRound.matches[1].winner;
  } else {
    // 8 teams: QF -> SF -> Final
    if (nextRoundIndex === 1) {
      // Semi-Finals
      nextRound.matches[0].team1 = currentRound.matches[0].winner;
      nextRound.matches[0].team2 = currentRound.matches[1].winner;
      nextRound.matches[1].team1 = currentRound.matches[2].winner;
      nextRound.matches[1].team2 = currentRound.matches[3].winner;
    } else if (nextRoundIndex === 2) {
      // Grand Final
      nextRound.matches[0].team1 = currentRound.matches[0].winner;
      nextRound.matches[0].team2 = currentRound.matches[1].winner;
    }
  }

  bracket.roundIndex = nextRoundIndex;
  return { finished: false, won: true, bracket };
}
