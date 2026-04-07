/**
 * Demo booking opens April 10 each year. Before that, the earliest slot is April 10;
 * after that, the earliest is today. Uses UTC calendar days to match weekday checks.
 */
export function minDemoBookingYmd(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const todayStr = `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  const floorStr = `${y}-04-10`
  return todayStr > floorStr ? todayStr : floorStr
}

export function isOnOrAfterDemoBookingStart(ymd: string): boolean {
  return ymd >= minDemoBookingYmd()
}
