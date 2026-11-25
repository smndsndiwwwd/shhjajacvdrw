export const franchiseLeagues = {
  ipl: {
    id: 'ipl',
    name: 'Indian Premier League',
    shortName: 'IPL',
    emoji: '🇮🇳',
    prestige: 5,
    difficulty: 'Hard',
    prizeMoney: 10000,
    overseasSlots: 4,
    avgSalary: 2500,
    seasonLength: 14,
    history: 'The richest and most prestigious T20 league in the world, founded in 2008. Features extreme competition, roaring crowds, and spin-friendly pitches.',
    teams: [
      {
        id: 'mi',
        name: 'Mumbai Indians',
        short: 'MI',
        primaryColor: '#004ba0',
        roster: ['Rohit Sharma', 'Ishan Kishan', 'Suryakumar Yadav', 'Tilak Varma', 'Hardik Pandya', 'Tim David', 'Mohammad Nabi', 'Gerald Coetzee', 'Piyush Chawla', 'Jasprit Bumrah', 'Nuwan Thushara'],
        bowlers: [
          { name: 'Jasprit Bumrah', style: 'Right-Arm Fast-Yorker', type: 'pace' },
          { name: 'Gerald Coetzee', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Piyush Chawla', style: 'Right-Arm Leg-Spin', type: 'spin' },
          { name: 'Hardik Pandya', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Nuwan Thushara', style: 'Right-Arm Sling Fast', type: 'pace' }
        ]
      },
      {
        id: 'csk',
        name: 'Chennai Super Kings',
        short: 'CSK',
        primaryColor: '#fdb813',
        roster: ['Ruturaj Gaikwad', 'Rachin Ravindra', 'Ajinkya Rahane', 'Daryl Mitchell', 'Shivam Dube', 'Ravindra Jadeja', 'MS Dhoni', 'Mitchell Santner', 'Shardul Thakur', 'Deepak Chahar', 'Matheesha Pathirana'],
        bowlers: [
          { name: 'Matheesha Pathirana', style: 'Right-Arm Sling Yorker', type: 'pace' },
          { name: 'Deepak Chahar', style: 'Right-Arm Swing Fast-Medium', type: 'pace' },
          { name: 'Ravindra Jadeja', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Shardul Thakur', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Mitchell Santner', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'rcb',
        name: 'Royal Challengers Bengaluru',
        short: 'RCB',
        primaryColor: '#2b2b2b',
        roster: ['Virat Kohli', 'Faf du Plessis', 'Rajat Patidar', 'Glenn Maxwell', 'Cameron Green', 'Dinesh Karthik', 'Mahipal Lomror', 'Karn Sharma', 'Lockie Ferguson', 'Mohammed Siraj', 'Yash Dayal'],
        bowlers: [
          { name: 'Mohammed Siraj', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Lockie Ferguson', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Yash Dayal', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Glenn Maxwell', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Karn Sharma', style: 'Right-Arm Leg-Break', type: 'spin' }
        ]
      },
      {
        id: 'kkr',
        name: 'Kolkata Knight Riders',
        short: 'KKR',
        primaryColor: '#3a225d',
        roster: ['Sunil Narine', 'Phil Salt', 'Venkatesh Iyer', 'Shreyas Iyer', 'Rinku Singh', 'Andre Russell', 'Ramandeep Singh', 'Mitchell Starc', 'Harshit Rana', 'Varun Chakravarthy', 'Vaibhav Arora'],
        bowlers: [
          { name: 'Mitchell Starc', style: 'Left-Arm Inswing Fast', type: 'pace' },
          { name: 'Varun Chakravarthy', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Sunil Narine', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Harshit Rana', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Andre Russell', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'gt',
        name: 'Gujarat Titans',
        short: 'GT',
        primaryColor: '#0b2240',
        roster: ['Shubman Gill', 'Wriddhiman Saha', 'Sai Sudharsan', 'David Miller', 'Azmatullah Omarzai', 'Rahul Tewatia', 'Rashid Khan', 'Ravisrinivasan Sai Kishore', 'Umesh Yadav', 'Spencer Johnson', 'Mohit Sharma'],
        bowlers: [
          { name: 'Rashid Khan', style: 'Right-Arm Leg-Spin Googly', type: 'spin' },
          { name: 'Mohit Sharma', style: 'Right-Arm Medium Knuckleball', type: 'pace' },
          { name: 'Spencer Johnson', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Sai Kishore', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Umesh Yadav', style: 'Right-Arm Fast', type: 'pace' }
        ]
      },
      {
        id: 'rr',
        name: 'Rajasthan Royals',
        short: 'RR',
        primaryColor: '#ea1a85',
        roster: ['Yashasvi Jaiswal', 'Jos Buttler', 'Sanju Samson', 'Riyan Parag', 'Shimron Hetmyer', 'Dhruv Jurel', 'Ravichandran Ashwin', 'Trent Boult', 'Avesh Khan', 'Yuzvendra Chahal', 'Sandeep Sharma'],
        bowlers: [
          { name: 'Trent Boult', style: 'Left-Arm Swing Fast', type: 'pace' },
          { name: 'Yuzvendra Chahal', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Sandeep Sharma', style: 'Right-Arm Medium Knuckleball', type: 'pace' },
          { name: 'Avesh Khan', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Ravichandran Ashwin', style: 'Right-Arm Carrom Spin', type: 'spin' }
        ]
      },
      {
        id: 'lsg',
        name: 'Lucknow Super Giants',
        short: 'LSG',
        primaryColor: '#0057b8',
        roster: ['KL Rahul', 'Quinton de Kock', 'Devdutt Padikkal', 'Marcus Stoinis', 'Nicholas Pooran', 'Ayush Badoni', 'Krunal Pandya', 'Ravi Bishnoi', 'Naveen-ul-Haq', 'Mayank Yadav', 'Mohsin Khan'],
        bowlers: [
          { name: 'Mayank Yadav', style: 'Right-Arm Thunderbolt Express (155 km/h)', type: 'pace' },
          { name: 'Ravi Bishnoi', style: 'Right-Arm Leg-Spin Googly', type: 'spin' },
          { name: 'Naveen-ul-Haq', style: 'Right-Arm Medium Cutter', type: 'pace' },
          { name: 'Mohsin Khan', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Krunal Pandya', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'dc',
        name: 'Delhi Capitals',
        short: 'DC',
        primaryColor: '#005ea6',
        roster: ['David Warner', 'Prithvi Shaw', 'Mitchell Marsh', 'Rishabh Pant', 'Tristan Stubbs', 'Axar Patel', 'Abishek Porel', 'Kuldeep Yadav', 'Anrich Nortje', 'Khaleel Ahmed', 'Mukesh Kumar'],
        bowlers: [
          { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist Spin (Chinaman)', type: 'spin' },
          { name: 'Anrich Nortje', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Khaleel Ahmed', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Axar Patel', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Mukesh Kumar', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'pbks',
        name: 'Punjab Kings',
        short: 'PBKS',
        primaryColor: '#d71920',
        roster: ['Shikhar Dhawan', 'Jonny Bairstow', 'Prabhsimran Singh', 'Sam Curran', 'Liam Livingstone', 'Jitesh Sharma', 'Ashutosh Sharma', 'Shashank Singh', 'Harpreet Brar', 'Kagiso Rabada', 'Arshdeep Singh'],
        bowlers: [
          { name: 'Kagiso Rabada', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Arshdeep Singh', style: 'Left-Arm Yorker Specialist', type: 'pace' },
          { name: 'Sam Curran', style: 'Left-Arm Medium-Fast', type: 'pace' },
          { name: 'Harpreet Brar', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Liam Livingstone', style: 'Right-Arm Leg-Break Spin', type: 'spin' }
        ]
      },
      {
        id: 'srh',
        name: 'Sunrisers Hyderabad',
        short: 'SRH',
        primaryColor: '#f26522',
        roster: ['Travis Head', 'Abhishek Sharma', 'Aiden Markram', 'Heinrich Klaasen', 'Nitish Kumar Reddy', 'Abdul Samad', 'Shahbaz Ahmed', 'Pat Cummins', 'Bhuvneshwar Kumar', 'Jaydev Unadkat', 'T Natarajan'],
        bowlers: [
          { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Bhuvneshwar Kumar', style: 'Right-Arm Inswing Fast', type: 'pace' },
          { name: 'T Natarajan', style: 'Left-Arm Yorker Specialist', type: 'pace' },
          { name: 'Jaydev Unadkat', style: 'Left-Arm Slower Cutter', type: 'pace' },
          { name: 'Shahbaz Ahmed', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      }
    ]
  },
  bbl: {
    id: 'bbl',
    name: 'Big Bash League',
    shortName: 'BBL',
    emoji: '🇦🇺',
    prestige: 4,
    difficulty: 'Medium-Hard',
    prizeMoney: 5000,
    overseasSlots: 3,
    avgSalary: 1200,
    seasonLength: 10,
    history: 'Australia\'s premier T20 tournament. Famous for fast, bouncy pitches, large outfields, family entertainment, and intense local rivalries.',
    teams: [
      {
        id: 'as',
        name: 'Adelaide Strikers',
        short: 'ADS',
        primaryColor: '#00a3e0',
        roster: ['Matthew Short', 'D\'Arcy Short', 'Chris Lynn', 'Adam Hose', 'Thomas Kelly', 'Harry Nielsen', 'James Bazley', 'Cameron Boyce', 'Wes Agar', 'David Payne', 'Henry Thornton'],
        bowlers: [
          { name: 'Wes Agar', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Henry Thornton', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Cameron Boyce', style: 'Right-Arm Leg-Break', type: 'spin' },
          { name: 'David Payne', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Matthew Short', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'ms',
        name: 'Melbourne Stars',
        short: 'MLS',
        primaryColor: '#00843d',
        roster: ['Thomas Rogers', 'Dan Lawrence', 'Beau Webster', 'Glenn Maxwell', 'Marcus Stoinis', 'Hilton Cartwright', 'Peter Handscomb', 'Usama Mir', 'Joel Paris', 'Haris Rauf', 'Scott Boland'],
        bowlers: [
          { name: 'Haris Rauf', style: 'Right-Arm Thunderbolt Fast', type: 'pace' },
          { name: 'Scott Boland', style: 'Right-Arm Fast-Medium Seam', type: 'pace' },
          { name: 'Usama Mir', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Glenn Maxwell', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Marcus Stoinis', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'mr',
        name: 'Melbourne Renegades',
        short: 'MLR',
        primaryColor: '#e31b23',
        roster: ['Quinton de Kock', 'Shaun Marsh', 'Jake Fraser-McGurk', 'Jordan Cox', 'Jonathan Wells', 'Will Sutherland', 'Akeal Hosein', 'Tom Rogers', 'Kane Richardson', 'Adam Zampa', 'Peter Siddle'],
        bowlers: [
          { name: 'Adam Zampa', style: 'Right-Arm Leg-Spin', type: 'spin' },
          { name: 'Kane Richardson', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Tom Rogers', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Will Sutherland', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'ss',
        name: 'Sydney Sixers',
        short: 'SYS',
        primaryColor: '#e03a70',
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
        id: 'st',
        name: 'Sydney Thunder',
        short: 'SYT',
        primaryColor: '#78be20',
        roster: ['David Warner', 'Alex Hales', 'Cameron Bancroft', 'Oliver Davies', 'Alex Ross', 'Daniel Sams', 'Nathan McAndrew', 'Chris Green', 'Liam Hatcher', 'Tanveer Sangha', 'Gurinder Sandhu'],
        bowlers: [
          { name: 'Daniel Sams', style: 'Left-Arm Fast-Medium Cutter', type: 'pace' },
          { name: 'Tanveer Sangha', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Gurinder Sandhu', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Chris Green', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Nathan McAndrew', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'ps',
        name: 'Perth Scorchers',
        short: 'PTS',
        primaryColor: '#f15a24',
        roster: ['Mitchell Marsh', 'Josh Inglis', 'Aaron Hardie', 'Ashton Turner', 'Cooper Connolly', 'Laurie Evans', 'Ashton Agar', 'Jhye Richardson', 'Andrew Tye', 'Jason Behrendorff', 'Lance Morris'],
        bowlers: [
          { name: 'Jason Behrendorff', style: 'Left-Arm Swing Fast', type: 'pace' },
          { name: 'Jhye Richardson', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Andrew Tye', style: 'Right-Arm Knuckleball Specialist', type: 'pace' },
          { name: 'Lance Morris', style: 'Right-Arm Express Fast (150 km/h)', type: 'pace' },
          { name: 'Ashton Agar', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'bh',
        name: 'Brisbane Heat',
        short: 'BRH',
        primaryColor: '#00859b',
        roster: ['Usman Khawaja', 'Josh Brown', 'Nathan McSweeney', 'Matt Renshaw', 'Sam Billings', 'Paul Walter', 'Michael Neser', 'Xavier Bartlett', 'Spencer Johnson', 'Mitchell Swepson', 'Matthew Kuhnemann'],
        bowlers: [
          { name: 'Spencer Johnson', style: 'Left-Arm Fast', type: 'pace' },
          { name: 'Xavier Bartlett', style: 'Right-Arm Fast-Medium Outswing', type: 'pace' },
          { name: 'Michael Neser', style: 'Right-Arm Swing Fast-Medium', type: 'pace' },
          { name: 'Mitchell Swepson', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Matthew Kuhnemann', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'hh',
        name: 'Hobart Hurricanes',
        short: 'HBH',
        primaryColor: '#4d2279',
        roster: ['Matthew Wade', 'Ben McDermott', 'Macalister Wright', 'Sam Hain', 'Corey Anderson', 'Tim David', 'Chris Jordan', 'Patrick Dooley', 'Nathan Ellis', 'Riley Meredith', 'Billy Stanlake'],
        bowlers: [
          { name: 'Nathan Ellis', style: 'Right-Arm Fast-Medium Yorker', type: 'pace' },
          { name: 'Riley Meredith', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Chris Jordan', style: 'Right-Arm Fast Death Specialist', type: 'pace' },
          { name: 'Patrick Dooley', style: 'Left-Arm Mystery Spin', type: 'spin' },
          { name: 'Tim David', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      }
    ]
  },
  psl: {
    id: 'psl',
    name: 'Pakistan Super League',
    shortName: 'PSL',
    emoji: '🇵🇰',
    prestige: 4,
    difficulty: 'Medium-Hard',
    prizeMoney: 4500,
    overseasSlots: 4,
    avgSalary: 1100,
    seasonLength: 10,
    history: 'A league renowned for producing high-velocity fast bowlers and electric batting contests. The atmosphere is passionate and highly energetic.',
    teams: [
      {
        id: 'lq',
        name: 'Lahore Qalandars',
        short: 'LHQR',
        primaryColor: '#00a651',
        roster: ['Fakhar Zaman', 'Sahibzada Farhan', 'Rassie van der Dussen', 'Shai Hope', 'Sikandar Raza', 'George Linde', 'David Wiese', 'Shaheen Shah Afridi', 'Haris Rauf', 'Zaman Khan', 'Jahandad Khan'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Inswing Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Zaman Khan', style: 'Right-Arm Sling Yorker', type: 'pace' },
          { name: 'Sikandar Raza', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'David Wiese', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'kk',
        name: 'Karachi Kings',
        short: 'KCK',
        primaryColor: '#0f2c59',
        roster: ['Shan Masood', 'Tim Seifert', 'James Vince', 'Shoaib Malik', 'Kieron Pollard', 'Mohammad Nawaz', 'Irfan Khan Niazi', 'Hasan Ali', 'Mir Hamza', 'Tabraiz Shamsi', 'Zahid Mahmood'],
        bowlers: [
          { name: 'Hasan Ali', style: 'Right-Arm Fast-Medium Reverse Swing', type: 'pace' },
          { name: 'Mir Hamza', style: 'Left-Arm Fast-Medium Seam', type: 'pace' },
          { name: 'Tabraiz Shamsi', style: 'Left-Arm Wrist Spin (Chinaman)', type: 'spin' },
          { name: 'Mohammad Nawaz', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Shoaib Malik', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'iu',
        name: 'Islamabad United',
        short: 'ISU',
        primaryColor: '#c8102e',
        roster: ['Alex Hales', 'Colin Munro', 'Agha Salman', 'Shadab Khan', 'Azam Khan', 'Haider Ali', 'Imad Wasim', 'Faheem Ashraf', 'Naseem Shah', 'Hunain Shah', 'Tymal Mills'],
        bowlers: [
          { name: 'Naseem Shah', style: 'Right-Arm Outswing Fast', type: 'pace' },
          { name: 'Shadab Khan', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Imad Wasim', style: 'Left-Arm Arm-Ball Spin', type: 'spin' },
          { name: 'Tymal Mills', style: 'Left-Arm Fast Slower Ball', type: 'pace' },
          { name: 'Faheem Ashraf', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'pz',
        name: 'Peshawar Zalmi',
        short: 'PWZ',
        primaryColor: '#ffcd00',
        roster: ['Babar Azam', 'Saim Ayub', 'Mohammad Haris', 'Tom Kohler-Cadmore', 'Rovman Powell', 'Asif Ali', 'Aamer Jamal', 'Luke Wood', 'Naveen-ul-Haq', 'Mehran Mumtaz', 'Arif Yaqoob'],
        bowlers: [
          { name: 'Luke Wood', style: 'Left-Arm Fast Swing', type: 'pace' },
          { name: 'Aamer Jamal', style: 'Right-Arm Fast-Medium Yorker', type: 'pace' },
          { name: 'Naveen-ul-Haq', style: 'Right-Arm Slower Cutter', type: 'pace' },
          { name: 'Arif Yaqoob', style: 'Right-Arm Leg-Spin', type: 'spin' },
          { name: 'Saim Ayub', style: 'Right-Arm Mystery Off-Spin', type: 'spin' }
        ]
      },
      {
        id: 'ms_p',
        name: 'Multan Sultans',
        short: 'MTS',
        primaryColor: '#005ea6',
        roster: ['Mohammad Rizwan', 'Yasir Khan', 'Usman Khan', 'Johnson Charles', 'Iftikhar Ahmed', 'Khushdil Shah', 'David Willey', 'Usama Mir', 'Abbas Afridi', 'Mohammad Ali', 'Chris Jordan'],
        bowlers: [
          { name: 'Usama Mir', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Mohammad Ali', style: 'Right-Arm Seam Fast', type: 'pace' },
          { name: 'David Willey', style: 'Left-Arm Inswing Fast', type: 'pace' },
          { name: 'Abbas Afridi', style: 'Right-Arm Fast Slower Ball', type: 'pace' },
          { name: 'Iftikhar Ahmed', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'qg',
        name: 'Quetta Gladiators',
        short: 'QTG',
        primaryColor: '#4d2179',
        roster: ['Jason Roy', 'Saud Shakeel', 'Rilee Rossouw', 'Khawaja Nafay', 'Sarfaraz Ahmed', 'Sherfane Rutherford', 'Akeal Hosein', 'Mohammad Wasim Jr', 'Mohammad Amir', 'Abrar Ahmed', 'Usman Tariq'],
        bowlers: [
          { name: 'Mohammad Amir', style: 'Left-Arm Fast Swing & Seam', type: 'pace' },
          { name: 'Abrar Ahmed', style: 'Right-Arm Mystery Leg-Spin', type: 'spin' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Mohammad Wasim Jr', style: 'Right-Arm Fast Reverse Yorker', type: 'pace' },
          { name: 'Usman Tariq', style: 'Right-Arm Mystery Carrom Spin', type: 'spin' }
        ]
      }
    ]
  },
  sa20: {
    id: 'sa20',
    name: 'SA20',
    shortName: 'SA20',
    emoji: '🇿🇦',
    prestige: 3.5,
    difficulty: 'Medium',
    prizeMoney: 3500,
    overseasSlots: 4,
    avgSalary: 850,
    seasonLength: 10,
    history: 'South Africa\'s explosive new league. Pitches offer a great bounce and swing, testing batting technique against international quality pacers.',
    teams: [
      {
        id: 'mict',
        name: 'MI Cape Town',
        short: 'MICT',
        primaryColor: '#004ba0',
        roster: ['Rassie van der Dussen', 'Ryan Rickelton', 'Dewald Brevis', 'Liam Livingstone', 'Sam Curran', 'Kieron Pollard', 'George Linde', 'Thomas Kaber', 'Kagiso Rabada', 'Nuwan Thushara', 'Beuran Hendricks'],
        bowlers: [
          { name: 'Kagiso Rabada', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Nuwan Thushara', style: 'Right-Arm Sling Yorker', type: 'pace' },
          { name: 'Sam Curran', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Thomas Kaber', style: 'Left-Arm Wrist Spin', type: 'spin' },
          { name: 'George Linde', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'jsk',
        name: 'Joburg Super Kings',
        short: 'JSK',
        primaryColor: '#fdb813',
        roster: ['Faf du Plessis', 'Leus du Plooy', 'Reeza Hendricks', 'Moeen Ali', 'Sibonelo Makhanya', 'Donovan Ferreira', 'Romario Shepherd', 'Doug Bracewell', 'Lizaad Williams', 'Nandre Burger', 'Imran Tahir'],
        bowlers: [
          { name: 'Nandre Burger', style: 'Left-Arm Thunderbolt Fast (150 km/h)', type: 'pace' },
          { name: 'Lizaad Williams', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Imran Tahir', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Romario Shepherd', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Moeen Ali', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      },
      {
        id: 'pc',
        name: 'Pretoria Capitals',
        short: 'PC',
        primaryColor: '#1bb1e7',
        roster: ['Philip Salt', 'Will Jacks', 'Kyle Verreynne', 'Rilee Rossouw', 'Colin Ingram', 'James Neesham', 'Senuran Muthusamy', 'Wayne Parnell', 'Eathan Bosch', 'Adil Rashid', 'Daryn Dupavillon'],
        bowlers: [
          { name: 'Wayne Parnell', style: 'Left-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'Adil Rashid', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Eathan Bosch', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Daryn Dupavillon', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Senuran Muthusamy', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'sec',
        name: 'Sunrisers Eastern Cape',
        short: 'SEC',
        primaryColor: '#f26522',
        roster: ['Jordan Hermann', 'Dawid Malan', 'Tom Abell', 'Aiden Markram', 'Tristan Stubbs', 'Patrick Kruger', 'Marco Jansen', 'Liam Dawson', 'Simon Harmer', 'Ottniel Baartman', 'Daniel Worrall'],
        bowlers: [
          { name: 'Marco Jansen', style: 'Left-Arm Bounce Fast', type: 'pace' },
          { name: 'Ottniel Baartman', style: 'Right-Arm Fast-Medium Seam', type: 'pace' },
          { name: 'Daniel Worrall', style: 'Right-Arm Inswing Fast', type: 'pace' },
          { name: 'Simon Harmer', style: 'Right-Arm Off-Break Spin', type: 'spin' },
          { name: 'Liam Dawson', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'pr',
        name: 'Paarl Royals',
        short: 'PR',
        primaryColor: '#ea1a85',
        roster: ['Jason Roy', 'Jos Buttler', 'Wihan Lubbe', 'David Miller', 'Mitchell Van Buuren', 'Fabian Allen', 'Andile Phehlukwayo', 'Bjorn Fortuin', 'Lungi Ngidi', 'Tabraiz Shamsi', 'Obed McCoy'],
        bowlers: [
          { name: 'Lungi Ngidi', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Tabraiz Shamsi', style: 'Left-Arm Wrist Spin', type: 'spin' },
          { name: 'Bjorn Fortuin', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Obed McCoy', style: 'Left-Arm Fast-Medium Slower Ball', type: 'pace' },
          { name: 'Andile Phehlukwayo', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'dsg',
        name: 'Durban Super Giants',
        short: 'DSG',
        primaryColor: '#00859b',
        roster: ['Matthew Breetzke', 'Tony de Zorzi', 'Quinton de Kock', 'JJ Smuts', 'Heinrich Klaasen', 'Marcus Stoinis', 'Wiaan Mulder', 'Keshav Maharaj', 'Junior Dala', 'Noor Ahmad', 'Reece Topley'],
        bowlers: [
          { name: 'Keshav Maharaj', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Noor Ahmad', style: 'Left-Arm Wrist Spin (Chinaman)', type: 'spin' },
          { name: 'Reece Topley', style: 'Left-Arm Fast Swing', type: 'pace' },
          { name: 'Junior Dala', style: 'Right-Arm Fast', type: 'pace' },
          { name: 'Marcus Stoinis', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      }
    ]
  },
  cpl: {
    id: 'cpl',
    name: 'Caribbean Premier League',
    shortName: 'CPL',
    emoji: '🏝️',
    prestige: 3.5,
    difficulty: 'Medium',
    prizeMoney: 3000,
    overseasSlots: 4,
    avgSalary: 750,
    seasonLength: 10,
    history: 'Known as the "Biggest Party in Sport." Characterized by slow, spinning pitches, massive hitting, reggae music, and vibrant Caribbean passion.',
    teams: [
      {
        id: 'tkr',
        name: 'Trinbago Knight Riders',
        short: 'TKR',
        primaryColor: '#d71920',
        roster: ['Sunil Narine', 'Martin Guptill', 'Nicholas Pooran', 'Kieron Pollard', 'Andre Russell', 'Dwayne Bravo', 'Akeal Hosein', 'Mark Deyal', 'Ali Khan', 'Waqar Salamkheil', 'Jayden Seales'],
        bowlers: [
          { name: 'Sunil Narine', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Andre Russell', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Waqar Salamkheil', style: 'Left-Arm Wrist Spin', type: 'spin' },
          { name: 'Ali Khan', style: 'Right-Arm Fast Yorker', type: 'pace' }
        ]
      },
      {
        id: 'gaw',
        name: 'Guyana Amazon Warriors',
        short: 'GAW',
        primaryColor: '#008542',
        roster: ['Saim Ayub', 'Chandrapaul Hemraj', 'Shai Hope', 'Shimron Hetmyer', 'Azam Khan', 'Dwaine Pretorius', 'Romario Shepherd', 'Odean Smith', 'Gudakesh Motie', 'Imran Tahir', 'Shamar Joseph'],
        bowlers: [
          { name: 'Imran Tahir', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Gudakesh Motie', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Shamar Joseph', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Romario Shepherd', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Dwaine Pretorius', style: 'Right-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'br',
        name: 'Barbados Royals',
        short: 'BR',
        primaryColor: '#0057b8',
        roster: ['Rahkeem Cornwall', 'Kyle Mayers', 'Alick Athanaze', 'Rovman Powell', 'Jason Holder', 'Carlos Brathwaite', 'Nyeem Young', 'Roelof van der Merwe', 'Maheesh Theekshana', 'Obed McCoy', 'Qais Ahmad'],
        bowlers: [
          { name: 'Maheesh Theekshana', style: 'Right-Arm Carrom Mystery Spin', type: 'spin' },
          { name: 'Jason Holder', style: 'Right-Arm Bounce Fast-Medium', type: 'pace' },
          { name: 'Obed McCoy', style: 'Left-Arm Slower Ball Fast', type: 'pace' },
          { name: 'Qais Ahmad', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Roelof van der Merwe', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'sknp',
        name: 'St Kitts & Nevis Patriots',
        short: 'SKNP',
        primaryColor: '#00a3e0',
        roster: ['Evin Lewis', 'Andre Fletcher', 'Ambati Rayudu', 'Sherfane Rutherford', 'Joshua Da Silva', 'George Linde', 'Dominic Drakes', 'Sheldon Cottrell', 'Oshane Thomas', 'Anrich Nortje', 'Tabraiz Shamsi'],
        bowlers: [
          { name: 'Anrich Nortje', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Tabraiz Shamsi', style: 'Left-Arm Wrist Spin', type: 'spin' },
          { name: 'Sheldon Cottrell', style: 'Left-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'Oshane Thomas', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Dominic Drakes', style: 'Left-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'jt',
        name: 'Jamaica Tallawahs',
        short: 'JT',
        primaryColor: '#fdb813',
        roster: ['Brandon King', 'Kirk McKenzie', 'Shamarh Brooks', 'Raymon Reifer', 'Fabian Allen', 'Imad Wasim', 'Chris Green', 'Mohammad Amir', 'Nicholson Gordon', 'Salman Irshad', 'Hayden Walsh'],
        bowlers: [
          { name: 'Mohammad Amir', style: 'Left-Arm Fast Swing', type: 'pace' },
          { name: 'Imad Wasim', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Chris Green', style: 'Right-Arm Off-Break', type: 'spin' },
          { name: 'Salman Irshad', style: 'Right-Arm Sling Fast', type: 'pace' },
          { name: 'Hayden Walsh', style: 'Right-Arm Leg-Break Spin', type: 'spin' }
        ]
      },
      {
        id: 'slk',
        name: 'Saint Lucia Kings',
        short: 'SLK',
        primaryColor: '#38bdf8',
        roster: ['Faf du Plessis', 'Johnson Charles', 'Bhanuka Rajapaksa', 'Sean Dickson', 'Roston Chase', 'Sikandar Raza', 'David Wiese', 'Matthew Forde', 'Alzarri Joseph', 'Noor Ahmad', 'Peter Hatzoglou'],
        bowlers: [
          { name: 'Alzarri Joseph', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Noor Ahmad', style: 'Left-Arm Wrist Spin', type: 'spin' },
          { name: 'Matthew Forde', style: 'Right-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'David Wiese', style: 'Right-Arm Medium-Fast', type: 'pace' },
          { name: 'Roston Chase', style: 'Right-Arm Off-Break', type: 'spin' }
        ]
      }
    ]
  },
  hundred: {
    id: 'hundred',
    name: 'The Hundred',
    shortName: 'Hundred',
    emoji: '🇬🇧',
    prestige: 3.5,
    difficulty: 'Medium',
    prizeMoney: 3000,
    overseasSlots: 3,
    avgSalary: 700,
    seasonLength: 8,
    history: 'England\'s unique 100-ball format. Features rapid gameplay, strategic timeouts, and matches that are over in just two hours.',
    teams: [
      {
        id: 'tr',
        name: 'Trent Rockets',
        short: 'TR',
        primaryColor: '#ffcd00',
        roster: ['Alex Hales', 'Dawid Malan', 'Tom Banton', 'Joe Root', 'Colin Munro', 'Lewis Gregory', 'Daniel Sams', 'Rashid Khan', 'Luke Wood', 'Sam Cook', 'John Turner'],
        bowlers: [
          { name: 'Rashid Khan', style: 'Right-Arm Leg-Spin Googly', type: 'spin' },
          { name: 'Luke Wood', style: 'Left-Arm Fast Swing', type: 'pace' },
          { name: 'Sam Cook', style: 'Right-Arm Fast-Medium Seam', type: 'pace' },
          { name: 'Daniel Sams', style: 'Left-Arm Fast-Medium Cutter', type: 'pace' },
          { name: 'Lewis Gregory', style: 'Right-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'sb',
        name: 'Southern Brave',
        short: 'SB',
        primaryColor: '#00843d',
        roster: ['Finn Allen', 'Devon Conway', 'James Vince', 'Leus du Plooy', 'Alex Davies', 'Chris Jordan', 'George Garton', 'Craig Overton', 'Jofra Archer', 'Tymal Mills', 'Akeal Hosein'],
        bowlers: [
          { name: 'Jofra Archer', style: 'Right-Arm Express Fast (150+ km/h)', type: 'pace' },
          { name: 'Tymal Mills', style: 'Left-Arm Fast Slower Ball', type: 'pace' },
          { name: 'Chris Jordan', style: 'Right-Arm Fast Death Specialist', type: 'pace' },
          { name: 'Craig Overton', style: 'Right-Arm Fast-Medium Bounce', type: 'pace' },
          { name: 'Akeal Hosein', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'oi',
        name: 'Oval Invincibles',
        short: 'OI',
        primaryColor: '#00a3e0',
        roster: ['Jason Roy', 'Will Jacks', 'Heinrich Klaasen', 'Sam Curran', 'Sam Billings', 'Tom Curran', 'Ross Whiteley', 'Sunil Narine', 'Adam Zampa', 'Saqib Mahmood', 'Nathan Sowter'],
        bowlers: [
          { name: 'Adam Zampa', style: 'Right-Arm Leg-Spin', type: 'spin' },
          { name: 'Sunil Narine', style: 'Right-Arm Mystery Spin', type: 'spin' },
          { name: 'Sam Curran', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Saqib Mahmood', style: 'Right-Arm Reverse Fast', type: 'pace' },
          { name: 'Tom Curran', style: 'Right-Arm Fast-Medium Cutter', type: 'pace' }
        ]
      },
      {
        id: 'ls',
        name: 'London Spirit',
        short: 'LS',
        primaryColor: '#0f2c59',
        roster: ['Zak Crawley', 'Adam Rossington', 'Dan Lawrence', 'Matthew Wade', 'Daryl Mitchell', 'Ravi Bopara', 'Liam Dawson', 'Nathan Ellis', 'Daniel Worrall', 'Richard Gleeson', 'Mason Crane'],
        bowlers: [
          { name: 'Nathan Ellis', style: 'Right-Arm Yorker Specialist', type: 'pace' },
          { name: 'Richard Gleeson', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Daniel Worrall', style: 'Right-Arm Swing Fast', type: 'pace' },
          { name: 'Liam Dawson', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Mason Crane', style: 'Right-Arm Leg-Break Spin', type: 'spin' }
        ]
      },
      {
        id: 'wf',
        name: 'Welsh Fire',
        short: 'WF',
        primaryColor: '#c8102e',
        roster: ['Jonny Bairstow', 'Luke Wells', 'Joe Clarke', 'Glenn Phillips', 'Tom Abell', 'David Willey', 'Roelof van der Merwe', 'Shaheen Shah Afridi', 'Haris Rauf', 'David Payne', 'Jake Ball'],
        bowlers: [
          { name: 'Shaheen Shah Afridi', style: 'Left-Arm Inswing Fast', type: 'pace' },
          { name: 'Haris Rauf', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'David Willey', style: 'Left-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'David Payne', style: 'Left-Arm Fast-Medium', type: 'pace' },
          { name: 'Roelof van der Merwe', style: 'Left-Arm Orthodox Spin', type: 'spin' }
        ]
      },
      {
        id: 'ns',
        name: 'Northern Superchargers',
        short: 'NS',
        primaryColor: '#4d2279',
        roster: ['Harry Brook', 'Tom Kohler-Cadmore', 'Adam Hose', 'Nicholas Pooran', 'David Wiese', 'Brydon Carse', 'Wayne Parnell', 'Adil Rashid', 'Reece Topley', 'Matthew Potts', 'Callum Parkinson'],
        bowlers: [
          { name: 'Adil Rashid', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Reece Topley', style: 'Left-Arm Fast Swing', type: 'pace' },
          { name: 'Matthew Potts', style: 'Right-Arm Fast-Medium Seam', type: 'pace' },
          { name: 'Brydon Carse', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Wayne Parnell', style: 'Left-Arm Fast-Medium', type: 'pace' }
        ]
      },
      {
        id: 'mo',
        name: 'Manchester Originals',
        short: 'MO',
        primaryColor: '#2b2b2b',
        roster: ['Philip Salt', 'Jos Buttler', 'Laurie Evans', 'Max Holden', 'Ashton Turner', 'Paul Walter', 'Jamie Overton', 'Usama Mir', 'Tom Hartley', 'Josh Tongue', 'Fazalhaq Farooqi'],
        bowlers: [
          { name: 'Fazalhaq Farooqi', style: 'Left-Arm Fast-Medium Swing', type: 'pace' },
          { name: 'Usama Mir', style: 'Right-Arm Leg-Break Spin', type: 'spin' },
          { name: 'Tom Hartley', style: 'Left-Arm Orthodox Spin', type: 'spin' },
          { name: 'Jamie Overton', style: 'Right-Arm Express Fast', type: 'pace' },
          { name: 'Paul Walter', style: 'Left-Arm Medium-Fast', type: 'pace' }
        ]
      },
      {
        id: 'bp',
        name: 'Birmingham Phoenix',
        short: 'BP',
        primaryColor: '#ea1a85',
        roster: ['Will Smeed', 'Ben Duckett', 'Moeen Ali', 'Liam Livingstone', 'Dan Mousley', 'Jacob Bethell', 'Benny Howell', 'Chris Woakes', 'Sean Abbott', 'Adam Milne', 'Tim Southee'],
        bowlers: [
          { name: 'Tim Southee', style: 'Right-Arm Outswing Fast', type: 'pace' },
          { name: 'Adam Milne', style: 'Right-Arm Express Fast (150 km/h)', type: 'pace' },
          { name: 'Chris Woakes', style: 'Right-Arm Swing Fast-Medium', type: 'pace' },
          { name: 'Sean Abbott', style: 'Right-Arm Fast-Medium', type: 'pace' },
          { name: 'Liam Livingstone', style: 'Right-Arm Leg-Break Spin', type: 'spin' }
        ]
      }
    ]
  }
};

/**
 * Retrieve a team object from any league by ID or name
 */
export function getFranchiseTeam(leagueId, teamIdOrName) {
  const league = franchiseLeagues[leagueId?.toLowerCase()];
  if (!league) return null;
  const search = (teamIdOrName || '').toLowerCase().trim();
  return league.teams.find(t =>
    t.id.toLowerCase() === search ||
    t.name.toLowerCase() === search ||
    t.short.toLowerCase() === search ||
    t.name.toLowerCase().includes(search)
  ) || league.teams[0];
}

/**
 * Get authentic Playing XI roster for a franchise team
 */
export function getFranchiseTeamRoster(leagueId, teamIdOrName) {
  const team = getFranchiseTeam(leagueId, teamIdOrName);
  return team?.roster || [
    'Rohit Sharma', 'Virat Kohli', 'KL Rahul', 'Suryakumar Yadav',
    'Hardik Pandya', 'Ravindra Jadeja', 'Rishabh Pant', 'Axar Patel',
    'Jasprit Bumrah', 'Mohammed Siraj', 'Kuldeep Yadav'
  ];
}

/**
 * Get authentic 5-bowler attack for a franchise team
 */
export function getFranchiseTeamBowlers(leagueId, teamIdOrName) {
  const team = getFranchiseTeam(leagueId, teamIdOrName);
  return team?.bowlers || [
    { name: 'Jasprit Bumrah', style: 'Right-Arm Fast-Yorker', type: 'pace' },
    { name: 'Mohammed Siraj', style: 'Right-Arm Fast-Medium', type: 'pace' },
    { name: 'Kuldeep Yadav', style: 'Left-Arm Wrist Spin', type: 'spin' },
    { name: 'Ravindra Jadeja', style: 'Left-Arm Orthodox Spin', type: 'spin' },
    { name: 'Hardik Pandya', style: 'Right-Arm Fast-Medium', type: 'pace' }
  ];
}
