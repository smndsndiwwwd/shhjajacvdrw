export function computeBattingBowlingSummary({
  matches = 0,
  innings = 0,
  notOuts = 0,
  runs = 0,
  balls = 0,
  fours = 0,
  sixes = 0,
  fifties = 0,
  hundreds = 0,
  ducks = 0,
  highScore = 0,
  highScoreNotOut = false,
  wickets = 0,
  overs = 0,
  runsConceded = 0,
  bestWkts = null,
  bestConc = null,
  catches = 0,
  runOuts = 0,
  stumpings = 0,
  won = 0
} = {}) {
  const safeInnings = Math.max(0, Number(innings) || 0);
  const safeNO = Math.min(safeInnings, Math.max(0, Number(notOuts) || 0));
  const dismissals = Math.max(0, safeInnings - safeNO);
  const safeRuns = Number(runs) || 0;
  const safeBalls = Number(balls) || 0;
  const safeOvers = Number(overs) || 0;
  const safeWkts = Number(wickets) || 0;
  const safeConc = Number(runsConceded) || 0;

  let battingAvg = '0.00';
  let allNotOut = false;
  if (safeInnings > 0) {
    if (dismissals > 0) {
      battingAvg = (safeRuns / dismissals).toFixed(2);
    } else if (safeRuns > 0) {
      battingAvg = `${safeRuns.toFixed(2)}*`;
      allNotOut = true;
    } else {
      battingAvg = '0.00*';
      allNotOut = true;
    }
  }

  const strikeRate = safeBalls > 0 ? ((safeRuns / safeBalls) * 100).toFixed(2) : '0.00';
  const economy = safeOvers > 0 ? (safeConc / safeOvers).toFixed(2) : '0.00';
  const bowlingAvg = safeWkts > 0 ? (safeConc / safeWkts).toFixed(2) : '0.00';
  const bestBowling = (bestWkts !== null && bestWkts !== undefined) ? `${bestWkts}/${bestConc ?? 0}` : 'N/A';
  const highScoreText = highScore > 0 || safeInnings > 0 ? `${highScore}${highScoreNotOut ? '*' : ''}` : '0';
  const safeMatches = Math.max(0, Number(matches) || 0);
  const winRate = safeMatches > 0 ? Math.round((Number(won || 0) / safeMatches) * 100) : 0;

  return {
    matches: safeMatches,
    won: Number(won || 0),
    winRate,
    innings: safeInnings,
    notOuts: safeNO,
    dismissals,
    allNotOut,
    runs: safeRuns,
    balls: safeBalls,
    fours: Number(fours || 0),
    sixes: Number(sixes || 0),
    fifties: Number(fifties || 0),
    hundreds: Number(hundreds || 0),
    ducks: Number(ducks || 0),
    highScore: Number(highScore || 0),
    highScoreText,
    battingAvg,
    strikeRate,
    wickets: safeWkts,
    overs: Number(safeOvers.toFixed(1)),
    runsConceded: safeConc,
    economy,
    bowlingAvg,
    bestBowling,
    catches: Number(catches || 0),
    runOuts: Number(runOuts || 0),
    stumpings: Number(stumpings || 0)
  };
}

function aggregateHistoryRows(rows = []) {
  let matches = 0, innings = 0, notOuts = 0;
  let runs = 0, balls = 0, fours = 0, sixes = 0, fifties = 0, hundreds = 0, ducks = 0;
  let highScore = 0, highScoreNotOut = false;
  let wickets = 0, runsConceded = 0, overs = 0;
  let bestWkts = null, bestConc = null;
  let won = 0;

  for (const r of rows) {
    matches++;
    const rRuns = Number(r.runs || 0);
    const rBalls = Number(r.balls || 0);
    const rWkts = Number(r.wickets || 0);
    const rConc = Number(r.runs_conceded || 0);
    const rOvers = Number(r.overs_bowled || 0);
    const dLower = String(r.dismissal || '').trim().toLowerCase();

    if (String(r.result || '').toLowerCase() === 'won') won++;

    // Only count as a batting innings if player actually batted or got dismissed
    const isDnb = dLower === 'dnb' || dLower === 'did not bat';
    const isOut = !isDnb && dLower !== 'not out' && dLower !== 'notout' && dLower !== 'forfeit' && dLower !== '';
    const batted = !isDnb && (rBalls > 0 || rRuns > 0 || isOut);

    if (batted) {
      innings++;
      const isNo = dLower === 'not out' || dLower === 'notout' || dLower === 'forfeit';
      if (isNo) notOuts++;
      runs += rRuns;
      balls += rBalls;
      fours += Number(r.fours || 0);
      sixes += Number(r.sixes || 0);
      if (rRuns >= 100) hundreds++;
      else if (rRuns >= 50) fifties++;
      if (rRuns === 0 && !isNo) ducks++;
      if (rRuns > highScore || (rRuns === highScore && isNo && !highScoreNotOut)) {
        highScore = rRuns;
        highScoreNotOut = isNo;
      }
    }

    wickets += rWkts;
    runsConceded += rConc;
    overs += rOvers;

    if (rOvers > 0 || rWkts > 0 || rConc > 0) {
      if (bestWkts === null || rWkts > bestWkts || (rWkts === bestWkts && rConc < bestConc)) {
        bestWkts = rWkts;
        bestConc = rConc;
      }
    }
  }

  return computeBattingBowlingSummary({
    matches, innings, notOuts, runs, balls, fours, sixes,
    fifties, hundreds, ducks, highScore, highScoreNotOut,
    wickets, overs, runsConceded, bestWkts, bestConc, won
  });
}

function classifyMode(matchType = '') {
  const m = String(matchType || '').trim().toLowerCase();
  if (m === 'chapter') return 'chapter';
  if (m === 'practice' || m === 'quick') return 'practice';
  if (m.includes('tourn')) return 'tournament';
  if (m === 'franchise' || ['ipl', 'psl', 'bbl', 'cpl', 'sa20', 'ilt20', 'hundred'].includes(m)) return 'franchise';
  if (m === 'challenge' || m === 'pvp') return 'challenge';
  return 'practice';
}

export function getPlayerModeStatsBreakdown(db, playerId) {
  const player = db.prepare('SELECT current_chapter, franchise_titles FROM players WHERE discord_id = ?').get(playerId) || {};
  const stats = db.prepare('SELECT * FROM stats WHERE player_id = ?').get(playerId) || {};
  const historyRows = db.prepare('SELECT * FROM match_history WHERE player_id = ? ORDER BY id DESC').all(playerId);
  const pf = db.prepare('SELECT * FROM player_franchise WHERE player_id = ?').get(playerId) || null;
  const chalStats = db.prepare('SELECT * FROM challenge_stats WHERE player_id = ?').get(playerId) || { played: 0, won: 0, lost: 0, runs: 0, wickets: 0, fours: 0, sixes: 0 };
  const tourneyRows = db.prepare('SELECT won, times_played, high_score FROM player_tournaments WHERE player_id = ?').all(playerId);

  const grouped = { chapter: [], practice: [], tournament: [], franchise: [], challenge: [] };
  for (const row of historyRows) {
    grouped[classifyMode(row.match_type)].push(row);
  }

  // Recompute overall using authoritative stats totals + accurate innings/notOuts from match_history
  const histAll = aggregateHistoryRows(historyRows);
  const totalMatches = Math.max(Number(stats.matches || 0), histAll.matches);
  const legacyMatches = Math.max(0, totalMatches - historyRows.length);
  const totalInnings = histAll.innings + legacyMatches;
  const totalNotOuts = Math.min(totalInnings, histAll.notOuts);

  const overall = computeBattingBowlingSummary({
    matches: totalMatches,
    innings: totalInnings,
    notOuts: totalNotOuts,
    runs: Math.max(Number(stats.runs || 0), histAll.runs),
    balls: Math.max(Number(stats.balls || 0), histAll.balls),
    fours: Math.max(Number(stats.fours || 0), histAll.fours),
    sixes: Math.max(Number(stats.sixes || 0), histAll.sixes),
    fifties: Math.max(Number(stats.fifties || 0), histAll.fifties),
    hundreds: Math.max(Number(stats.hundreds || 0), histAll.hundreds),
    ducks: Math.max(Number(stats.ducks || 0), histAll.ducks),
    highScore: histAll.highScore,
    highScoreNotOut: histAll.highScoreNotOut,
    wickets: Math.max(Number(stats.wickets || 0), histAll.wickets),
    overs: Math.max(Number(stats.overs || 0), histAll.overs),
    runsConceded: Math.max(Number(stats.runs_conceded || 0), histAll.runsConceded),
    bestWkts: histAll.bestBowling !== 'N/A' ? Number(histAll.bestBowling.split('/')[0]) : null,
    bestConc: histAll.bestBowling !== 'N/A' ? Number(histAll.bestBowling.split('/')[1]) : null,
    catches: stats.catches || 0,
    runOuts: stats.run_outs || 0,
    stumpings: stats.stumpings || 0,
    won: histAll.won
  });

  const chapterSummary = {
    ...aggregateHistoryRows(grouped.chapter),
    currentChapter: Math.min(50, Number(player.current_chapter || 1))
  };

  const practiceSummary = aggregateHistoryRows(grouped.practice);

  const tourneyAgg = aggregateHistoryRows(grouped.tournament);
  const tournamentSummary = {
    ...tourneyAgg,
    titlesWon: tourneyRows.reduce((a, t) => a + (t.won || 0), 0),
    tournamentsEntered: tourneyRows.reduce((a, t) => a + (t.times_played || 0), 0),
    highScore: Math.max(tourneyAgg.highScore, ...tourneyRows.map(t => t.high_score || 0), 0)
  };

  // Merge player_franchise aggregate if franchise history is missing older seasons
  const franAgg = aggregateHistoryRows(grouped.franchise);
  const pfMatches = Number(pf?.matches_played || 0);
  const pfDismissals = Number(pf?.dismissals || 0);
  const pfNotOuts = pfMatches > 0 ? Math.max(0, pfMatches - pfDismissals) : 0;
  const franchiseSummary = (pfMatches > franAgg.matches)
    ? {
        ...computeBattingBowlingSummary({
          matches: pfMatches,
          innings: pfMatches,
          notOuts: Math.max(franAgg.notOuts, pfNotOuts),
          runs: pf.runs,
          balls: pf.balls,
          fours: pf.fours,
          sixes: pf.sixes,
          highScore: franAgg.highScore,
          highScoreNotOut: franAgg.highScoreNotOut,
          wickets: pf.wickets,
          overs: pf.overs_bowled,
          runsConceded: pf.runs_conceded,
          won: franAgg.won
        }),
        titlesWon: Number(player.franchise_titles || 0)
      }
    : { ...franAgg, titlesWon: Number(player.franchise_titles || 0) };

  const chalAgg = aggregateHistoryRows(grouped.challenge);
  const chalPlayed = Math.max(Number(chalStats.played || 0), chalAgg.matches);
  const chalWon = Math.max(Number(chalStats.won || 0), chalAgg.won);
  const chalRuns = Math.max(Number(chalStats.runs || 0), chalAgg.runs);
  const chalWkts = Math.max(Number(chalStats.wickets || 0), chalAgg.wickets);
  const challengeSummary = {
    ...computeBattingBowlingSummary({
      matches: chalPlayed,
      innings: Math.max(chalAgg.innings, chalPlayed),
      notOuts: chalAgg.notOuts,
      runs: chalRuns,
      balls: Math.max(chalAgg.balls, chalRuns > 0 ? chalPlayed * 4 : 0),
      fours: Math.max(Number(chalStats.fours || 0), chalAgg.fours),
      sixes: Math.max(Number(chalStats.sixes || 0), chalAgg.sixes),
      highScore: Math.max(chalAgg.highScore, chalRuns > 0 && chalPlayed === 1 ? chalRuns : 0),
      highScoreNotOut: chalAgg.highScoreNotOut,
      wickets: chalWkts,
      overs: Math.max(chalAgg.overs, chalWkts > 0 ? chalPlayed : 0),
      runsConceded: chalAgg.runsConceded,
      won: chalWon
    }),
    lost: Number(chalStats.lost || Math.max(0, chalPlayed - chalWon))
  };

  return {
    overall,
    modes: {
      chapter: chapterSummary,
      practice: practiceSummary,
      tournament: tournamentSummary,
      franchise: franchiseSummary,
      challenge: challengeSummary
    }
  };
}
