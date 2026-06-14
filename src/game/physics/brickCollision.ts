import type { Ball, BrickCell } from '@/types/game'

export interface BrickCollisionResult {
  hit: boolean
  brick?: BrickCell
  nx?: number
  ny?: number
  vx?: number
  vy?: number
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function checkBrickCollision(
  x: number,
  y: number,
  r: number,
  vx: number,
  vy: number,
  bricks: BrickCell[],
): BrickCollisionResult {
  let best: { brick: BrickCell; depth: number; side: 'top' | 'bottom' | 'left' | 'right' } | null = null

  for (const brick of bricks) {
    if (!brick.alive) continue
    const cx = Math.max(brick.x, Math.min(x, brick.x + brick.w))
    const cy = Math.max(brick.y, Math.min(y, brick.y + brick.h))
    const dx = x - cx
    const dy = y - cy
    const distSq = dx * dx + dy * dy
    if (distSq >= r * r) continue
    const dist = Math.sqrt(distSq) || 0.001
    const overlap = r - dist
    let side: 'top' | 'bottom' | 'left' | 'right'
    const left = x - brick.x
    const right = brick.x + brick.w - x
    const top = y - brick.y
    const bottom = brick.y + brick.h - y
    const m = Math.min(left, right, top, bottom)
    if (m === left) side = 'left'
    else if (m === right) side = 'right'
    else if (m === top) side = 'top'
    else side = 'bottom'
    if (!best || overlap > best.depth) {
      best = { brick, depth: overlap, side }
    }
  }

  if (!best) return { hit: false }
  const { brick, side } = best

  let nvx = vx
  let nvy = vy
  if (side === 'top' || side === 'bottom') nvy = -nvy
  else nvx = -nvx

  let nx = x
  let ny = y
  if (side === 'top') ny = brick.y - r - 0.1
  if (side === 'bottom') ny = brick.y + brick.h + r + 0.1
  if (side === 'left') nx = brick.x - r - 0.1
  if (side === 'right') nx = brick.x + brick.w + r + 0.1

  return { hit: true, brick, nx, ny, vx: nvx, vy: nvy, side }
}

export function getExplosionNeighbors(brick: BrickCell, bricks: BrickCell[]): BrickCell[] {
  const neighbors: BrickCell[] = []
  for (const other of bricks) {
    if (!other.alive) continue
    if (other === brick) continue
    const dr = Math.abs(other.row - brick.row)
    const dc = Math.abs(other.col - brick.col)
    if (dr <= 1 && dc <= 1) {
      neighbors.push(other)
    }
  }
  return neighbors
}

export function damageBrick(brick: BrickCell, amount: number): boolean {
  if (brick.type === 'steel') return false
  brick.hp -= amount
  return brick.hp <= 0 && brick.alive
}
