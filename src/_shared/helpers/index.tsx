export const formatSunPercentage = (sunPercent: number = 0) => {
  // Make sure it's not above 100% or below 0%
  if (Number(sunPercent) > 100) {
    return "100";
  } else if (Number(sunPercent) < 0) {
    return "0";
  }

  return Number(sunPercent).toFixed(0);
};
