import type { LevelConfig } from '@/types/game'

export function buildEndlessWave(wave: number): LevelConfig {
  const rows = Math.min(8, 4 + Math.floor(wave / 3))
  const cols = 10
  const layout: string[] = []
  const baseSpeed = Math.min(850, 420 + wave * 30)
  const paddW = Math.max(50, 120 - wave * 2)
  const dropRate = Math.min(0.55, 0.12 + wave * 0.01)

  for (let r = 0; r < rows; r++) {
    let row = ''
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        if (wave > 3 && Math.random() < 0.4) row += 'S'
        else if (wave > 2 && Math.random() < 0.3) row += 'E'
        else row += 'T'
      } else {
        const rand = Math.random()
        if (rand < 0.1 + wave * 0.02) row += 'T'
        else if (rand < 0.15 + wave * 0.02) row += 'E'
        else if (rand < 0.2 && wave > 2) row += 'S'
        else row += 'N'
      }
    }
    layout.push(row)
  }
  return {
    id: wave,
    layout,
    ballSpeed: baseSpeed,
    paddleWidth: paddW,
    powerupDropRate: dropRate,
    allowedPowerups: ['SPLIT_360', 'SPLIT_FAN_UP'],
    parScore: 500 + wave * 300,
    brickAreaTop: 70,
    brickRows: rows,
    brickCols: cols,
    brickPadding: 3,
  }
}
