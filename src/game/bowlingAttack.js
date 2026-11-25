/**
 * Authentic T20 Bowling Attack and Over Management Engine.
 * Enforces:
 * - Exactly 4 overs max per bowler in 20-over T20s (or proportional in shorter matches)
 * - Strict over-boundary transitions (bowler NEVER changes mid-over)
 * - No consecutive overs for any bowler
 * - Persistent bowling figures (overs, balls, runs, wickets, dots)
 * - Authentic phase tactics (Powerplay, Middle Overs, Death Overs)
 */

export class BowlingAttackManager {
  constructor(bowlersList = [], totalOvers = 20, pitch = 'Balanced Sporting Pitch') {
    this.totalOvers = totalOvers;
    this.pitch = pitch;
    this.maxOversPerBowler = totalOvers >= 15 ? 4 : Math.max(1, Math.ceil(totalOvers / 5));

    // Ensure we have at least 5 distinct bowlers
    const defaultBowlers = [
      { name: 'Mitchell Starc', style: 'Left-Arm Fast', type: 'pace' },
      { name: 'Pat Cummins', style: 'Right-Arm Fast-Medium', type: 'pace' },
      { name: 'Adam Zampa', style: 'Right-Arm Leg-Spin', type: 'spin' },
      { name: 'Josh Hazlewood', style: 'Right-Arm Fast-Medium', type: 'pace' },
      { name: 'Glenn Maxwell', style: 'Right-Arm Off-Break', type: 'spin' }
    ];

    const source = (bowlersList && bowlersList.length >= 3) ? bowlersList : defaultBowlers;
    
    // Initialize bowler records
    this.bowlers = source.slice(0, 5).map((b, idx) => ({
      id: idx + 1,
      name: b.name,
      type: b.type || (b.style?.toLowerCase().includes('spin') ? 'spin' : 'pace'),
      style: b.style || 'Right-Arm Medium',
      oversBowled: 0,
      ballsBowled: 0,
      runsConceded: 0,
      wicketsTaken: 0,
      dotsCount: 0
    }));

    // If fewer than 5 bowlers, fill up to 5 so 20 overs can be bowled cleanly (5 * 4 = 20)
    while (this.bowlers.length < 5) {
      const fallback = defaultBowlers[this.bowlers.length];
      this.bowlers.push({
        id: this.bowlers.length + 1,
        name: fallback.name,
        type: fallback.type,
        style: fallback.style,
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0,
        dotsCount: 0
      });
    }

    this.currentBowlerIndex = 0; // Bowler 1 takes new ball
    this.previousBowlerIndex = null;
    this.completedOvers = 0;
    this.ballsInOver = 0;
  }

  getCurrentBowler() {
    return this.bowlers[this.currentBowlerIndex];
  }

  getPreviousBowler() {
    return this.previousBowlerIndex !== null ? this.bowlers[this.previousBowlerIndex] : null;
  }

  /**
   * Selects the next bowler for a new over.
   * Strictly enforces:
   * 1. Bowler has not exceeded max quota (4 overs in T20)
   * 2. Bowler is NOT the previous bowler (no back-to-back overs)
   * 3. Authentic phase selection (pacers in PP, spinners in middle, death pacers at end)
   */
  pickNextBowler(overNumber) {
    const prevIdx = this.currentBowlerIndex;
    const eligible = this.bowlers
      .map((b, idx) => ({ ...b, originalIndex: idx }))
      .filter(b => b.originalIndex !== prevIdx && b.oversBowled < this.maxOversPerBowler);

    if (eligible.length === 0) {
      // Fallback in case of exhausted quota (should not happen in normal 20-over match with 5 bowlers)
      const nonConsecutive = this.bowlers
        .map((b, idx) => ({ ...b, originalIndex: idx }))
        .filter(b => b.originalIndex !== prevIdx);
      const chosen = nonConsecutive[0] || this.bowlers[0];
      this.previousBowlerIndex = this.currentBowlerIndex;
      this.currentBowlerIndex = chosen.originalIndex;
      return this.getCurrentBowler();
    }

    // Authentic T20 phase selection
    const isDeathOvers = overNumber >= 16;
    const isPowerplay = overNumber <= 6;
    const pLower = (this.pitch || '').toLowerCase();
    const isSpinPitch = pLower.includes('dry') || pLower.includes('dust') || pLower.includes('turn');

    let preferred = eligible;
    if (isPowerplay) {
      // Prefer pacers for new ball
      const pacers = eligible.filter(b => b.type === 'pace');
      if (pacers.length > 0) preferred = pacers;
    } else if (isDeathOvers) {
      // Prefer pacers for yorkers/slower balls at death
      const pacers = eligible.filter(b => b.type === 'pace');
      if (pacers.length > 0) preferred = pacers;
    } else if (isSpinPitch) {
      // Middle overs on turners -> spin
      const spinners = eligible.filter(b => b.type === 'spin');
      if (spinners.length > 0) preferred = spinners;
    }

    // Pick bowler with lowest overs or least runs conceded
    preferred.sort((a, b) => a.oversBowled - b.oversBowled || a.runsConceded - b.runsConceded);
    const selected = preferred[0];

    this.previousBowlerIndex = this.currentBowlerIndex;
    this.currentBowlerIndex = selected.originalIndex;
    return this.getCurrentBowler();
  }

  /**
   * Records ball outcome on the active bowler
   */
  recordBall(runs = 0, wicket = false, isRebowl = false) {
    const bowler = this.getCurrentBowler();
    bowler.runsConceded += runs;
    if (wicket) {
      bowler.wicketsTaken += 1;
    }
    if (runs === 0 && !wicket && !isRebowl) {
      bowler.dotsCount += 1;
    }
    if (!isRebowl) {
      bowler.ballsBowled += 1;
      this.ballsInOver += 1;
    }
  }

  /**
   * Called strictly when ballsInOver reaches 6.
   * Increments completedOvers and rotates to a new bowler with quota remaining.
   */
  completeOver() {
    const finishedBowler = this.getCurrentBowler();
    finishedBowler.oversBowled += 1;
    this.completedOvers += 1;
    this.ballsInOver = 0;

    if (this.completedOvers < this.totalOvers) {
      const nextBowler = this.pickNextBowler(this.completedOvers + 1);
      return {
        overEnded: true,
        completedOverNum: this.completedOvers,
        finishedBowler,
        nextBowler
      };
    }

    return {
      overEnded: true,
      completedOverNum: this.completedOvers,
      finishedBowler,
      nextBowler: null
    };
  }

  /**
   * Simulates overs prior to the user walking out to bat (e.g. user enters at No. 3 or No. 4)
   */
  simulatePreEntry(targetOvers, totalRuns, totalWickets) {
    if (targetOvers <= 0) return;
    
    let simulatedOvers = 0;
    let distributedRuns = 0;
    let distributedWickets = 0;

    for (let ov = 1; ov <= targetOvers; ov++) {
      const bowler = this.getCurrentBowler();
      const overRuns = (ov === targetOvers) 
        ? Math.max(0, totalRuns - distributedRuns)
        : Math.min(12, Math.max(4, Math.round(totalRuns / targetOvers)));
      
      const overWickets = (ov === targetOvers)
        ? Math.max(0, totalWickets - distributedWickets)
        : (distributedWickets < totalWickets && (ov >= 2 || Math.random() < 0.4) ? 1 : 0);

      bowler.oversBowled += 1;
      bowler.ballsBowled += 6;
      bowler.runsConceded += overRuns;
      bowler.wicketsTaken += overWickets;

      distributedRuns += overRuns;
      distributedWickets += overWickets;
      simulatedOvers++;

      this.completedOvers = simulatedOvers;
      this.ballsInOver = 0;

      if (this.completedOvers < this.totalOvers) {
        this.pickNextBowler(this.completedOvers + 1);
      }
    }
  }

  getBowlerFigureString(bowler) {
    const ov = `${bowler.oversBowled}.${bowler.ballsBowled % 6}`;
    return `${bowler.wicketsTaken}/${bowler.runsConceded} (${ov} ov • max ${this.maxOversPerBowler})`;
  }
}
