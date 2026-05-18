export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function generateTimesFromBands(
  bands: { startTime: string; endTime: string; slotDuration: number }[]
): { startTime: string; endTime: string }[] {
  const times: { startTime: string; endTime: string }[] = []
  for (const band of bands) {
    let cur = timeToMinutes(band.startTime)
    const last = timeToMinutes(band.endTime)
    while (cur <= last) {
      times.push({
        startTime: minutesToTime(cur),
        endTime: minutesToTime(cur + band.slotDuration),
      })
      cur += band.slotDuration
    }
  }
  return times.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}
