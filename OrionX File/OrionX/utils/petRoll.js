export function rollRarity() {
  const r = Math.random() * 100;

  if (r < 0.05) return "special"; // 0.05% (hiếm nhất)
  if (r < 0.1) return "mythic"; // 0.1%
  if (r < 0.15) return "legendary"; // 0.15%
  if (r < 2.15) return "epic"; // 2%
  if (r < 10.15) return "rare"; // 8%
  if (r < 35.15) return "uncommon"; // 25%
  return "common"; // 64.85%
}
