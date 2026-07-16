// =============================================================================
// mockLeague.ts — LOCAL MOCK leaderboard data.
// !!! MOCK UNTIL BACKEND !!! These users are fake and static. Replace with a
// real leagues service later. The local player is injected by the UI by XP.
// =============================================================================
export interface LeagueUser {
  id: string;
  name: string;
  xp: number;
  isYou?: boolean;
}

export const LEAGUE_NAME = 'Мятная лига';

// Fake competitors. Clearly not real players.
export const MOCK_LEAGUE_USERS: LeagueUser[] = [
  { id: 'm1', name: 'RiverRat', xp: 2840 },
  { id: 'm2', name: 'GTOgoblin', xp: 2210 },
  { id: 'm3', name: 'ColdCaller', xp: 1760 },
  { id: 'm4', name: 'SqueezeQueen', xp: 1430 },
  { id: 'm5', name: 'NitNinja', xp: 990 },
  { id: 'm6', name: 'BluffBunny', xp: 720 },
  { id: 'm7', name: 'LimpLord', xp: 410 },
  { id: 'm8', name: 'FoldFish', xp: 150 },
];

/** Merge the local player (by XP) into the mock league and rank by XP desc. */
export function rankedLeague(yourXp: number, yourName = 'Вы'): LeagueUser[] {
  const you: LeagueUser = { id: 'you', name: yourName, xp: yourXp, isYou: true };
  return [...MOCK_LEAGUE_USERS, you].sort((a, b) => b.xp - a.xp);
}
