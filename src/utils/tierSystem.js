// Tier system configuration
export const TIERS = [
  { name: 'Iron', min: 1, max: 5, totalPoints: 100, pointsPerDay: 20, color: '#9CA3AF', icon: '🔩' },
  { name: 'Bronze', min: 6, max: 10, totalPoints: 200, pointsPerDay: 40, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver', min: 11, max: 20, totalPoints: 500, pointsPerDay: 50, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold', min: 21, max: 40, totalPoints: 1500, pointsPerDay: 75, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum', min: 41, max: 60, totalPoints: 2000, pointsPerDay: 100, color: '#E5E4E2', icon: '💎' },
  { name: 'Diamond', min: 61, max: 100, totalPoints: 5000, pointsPerDay: 125, color: '#B9F2FF', icon: '💠' },
  { name: 'Legend', min: 101, max: Infinity, totalPoints: 15000, pointsPerDay: 150, color: '#FF69B4', icon: '⚡' }
];

// Streak multiplier configuration
export const STREAK_MULTIPLIERS = [
  { min: 1, max: 10, flames: 1, multiplier: 1.0, icon: '🔥', name: 'Starting Fire' },
  { min: 11, max: 20, flames: 2, multiplier: 1.5, icon: '🔥🔥', name: 'Burning Bright' },
  { min: 21, max: 30, flames: 3, multiplier: 2.0, icon: '🔥🔥🔥', name: 'Blazing Trail' },
  { min: 31, max: Infinity, flames: 4, multiplier: 3.0, icon: '⚡', name: 'Lightning Strike' }
];

// Get current tier based on total days logged
export const getCurrentTier = (totalDays) => {
  return TIERS.find(tier => totalDays >= tier.min && totalDays <= tier.max) || TIERS[0];
};

// Get next tier
export const getNextTier = (totalDays) => {
  const currentTierIndex = TIERS.findIndex(tier => totalDays >= tier.min && totalDays <= tier.max);
  return currentTierIndex < TIERS.length - 1 ? TIERS[currentTierIndex + 1] : null;
};

// Get streak multiplier based on current streak
export const getStreakMultiplier = (currentStreak) => {
  return STREAK_MULTIPLIERS.find(sm => currentStreak >= sm.min && currentStreak <= sm.max) || STREAK_MULTIPLIERS[0];
};

// Calculate total points earned from all completions
export const calculateTotalPoints = (habitCompletions) => {
  // Award 50 points for each completion (including backlogging)
  return habitCompletions.length * 50;
};

// Calculate tier bonus points based on current tier and days in tier
export const calculateTierBonusPoints = (totalDays) => {
  let bonusPoints = 0;
  let remainingDays = totalDays;
  
  for (const tier of TIERS) {
    if (remainingDays <= 0) break;
    
    const daysInThisTier = Math.min(remainingDays, tier.max - tier.min + 1);
    const tierDays = Math.min(daysInThisTier, tier.max === Infinity ? remainingDays : tier.max - tier.min + 1);
    
    bonusPoints += tierDays * tier.pointsPerDay;
    remainingDays -= tierDays;
  }
  
  return bonusPoints;
};

// Calculate progress to next tier (0-1)
export const calculateTierProgress = (totalDays) => {
  const currentTier = getCurrentTier(totalDays);
  const nextTier = getNextTier(totalDays);
  
  if (!nextTier) return 1; // Max tier reached
  
  const daysInCurrentTier = totalDays - currentTier.min + 1;
  const totalDaysNeededForTier = currentTier.max - currentTier.min + 1;
  
  return Math.min(daysInCurrentTier / totalDaysNeededForTier, 1);
};

// Calculate total points with streak multiplier
export const calculatePointsWithStreak = (basePoints, currentStreak) => {
  const streakMultiplier = getStreakMultiplier(currentStreak);
  return Math.floor(basePoints * streakMultiplier.multiplier);
};

// Get habit statistics including tier and streak info
export const getHabitStats = (habit) => {
  const completions = habit.habit_completions || [];
  const totalDays = completions.length;
  
  // Calculate current streak (including current day)
  const today = new Date();
  const sortedCompletions = [...completions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let currentStreak = 0;
  for (let i = 0; i < sortedCompletions.length; i++) {
    const completionDate = new Date(sortedCompletions[i].date);
    const daysDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === i) {
      currentStreak++;
    } else {
      break;
    }
  }
  
  const currentTier = getCurrentTier(totalDays);
  const nextTier = getNextTier(totalDays);
  const tierProgress = calculateTierProgress(totalDays);
  const streakMultiplier = getStreakMultiplier(currentStreak);
  
  // Calculate points
  const dailyPoints = calculateTotalPoints(completions);
  const tierBonusPoints = calculateTierBonusPoints(totalDays);
  const totalPointsWithStreak = calculatePointsWithStreak(dailyPoints + tierBonusPoints, currentStreak);
  
  return {
    totalDays,
    currentStreak,
    currentTier,
    nextTier,
    tierProgress,
    streakMultiplier,
    dailyPoints,
    tierBonusPoints,
    totalPoints: totalPointsWithStreak
  };
}; 