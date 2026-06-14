import type { BrickCell, LevelConfig, BrickType } from '@/types/game'
import {
  BRICK_HP,
  LAYOUT_CHARS,
  CANVAS_WIDTH,
} from '@/config/constants'

export function buildBricks(cfg: LevelConfig): { bricks: BrickCell[]; brickW: number; brickH: number } {
  const bricks: BrickCell[] = []
  const totalPadding = (cfg.brickCols - 1) * cfg.brickPadding
  const usableW = CANVAS_WIDTH - 60
  const brickW = (usableW - totalPadding) / cfg.brickCols
  const brickH = 26
  const startX = 30
  let nextId = 0

  for (let r = 0; r < cfg.layout.length; r++) {
    const rowStr = cfg.layout[r]
    for (let c = 0; c < cfg.brickCols; c++) {
      const ch = rowStr[c] || '.'
      const type = LAYOUT_CHARS[ch]
      if (!type) continue
      const hp = BRICK_HP[type]
      const x = startX + c * (brickW + cfg.brickPadding)
      const y = cfg.brickAreaTop + r * (brickH + cfg.brickPadding)
      bricks.push({
        row: r,
        col: c,
        type,
        hp,
        maxHp: hp,
        alive: true,
        x, y,
        w: brickW,
        h: brickH,
      })
      nextId++
    }
  }
  return { bricks, brickW, brickH }
}

export function layoutCharToType(ch: string): BrickType | null {
  return LAYOUT_CHARS[ch] || null
}
