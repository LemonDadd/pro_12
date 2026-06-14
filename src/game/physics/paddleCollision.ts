import type { Ball, Paddle } from '@/types/game'
import {
  BALL_RADIUS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from '@/config/constants'
import { reflectVelocity } from './angles'

export interface PaddleStepResult {
  x: number
  y: number
  vx: number
  vy: number
  hitPaddle: boolean
  hitWall: boolean
}

function checkWallCollisions(
  x: number, y: number, r: number, vx: number, vy: number,
): { x: number; y: number; vx: number; vy: number; hit: boolean } {
  let nx = x, ny = y, nvx = vx, nvy = vy, hit = false
  if (x - r < 0) { nx = r; nvx = Math.abs(vx); hit = true }
  if (x + r > CANVAS_WIDTH) { nx = CANVAS_WIDTH - r; nvx = -Math.abs(vx); hit = true }
  if (y - r < 0) { ny = r; nvy = Math.abs(vy); hit = true }
  return { x: nx, y: ny, vx: nvx, vy: nvy, hit }
}

export function sweptPaddleHit(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  paddle: Paddle,
): { hit: boolean; contactT: number; contactX: number } {
  if (y1 <= y0) return { hit: false, contactT: -1, contactX: x1 }
  const px1 = paddle.x
  const px2 = paddle.x + paddle.w
  const py = paddle.y
  const dx = x1 - x0
  const dy = y1 - y0

  const withinX = x1 + r >= px1 && x1 - r <= px2
  const prevBottom = y0 + r
  const newBottom = y1 + r
  if (prevBottom <= py && newBottom >= py && withinX) {
    return { hit: true, contactT: (py - prevBottom) / (dy || 1), contactX: x1 }
  }

  if (dy > 0) {
    const tTop = (py - (y0 + r)) / dy
    if (tTop >= 0 && tTop <= 1) {
      const hitX = x0 + dx * tTop
      if (hitX >= px1 - r * 0.5 && hitX <= px2 + r * 0.5) {
        return { hit: true, contactT: tTop, contactX: hitX }
      }
    }
  }
  return { hit: false, contactT: -1, contactX: x1 }
}

export function updateBallWithPaddleSteps(
  ball: Ball,
  dt: number,
  paddle: Paddle,
  playWallHit: () => void,
  playPaddleHit: () => void,
): { nx: number; ny: number; vx: number; vy: number; hitPaddle: boolean } {
  const totalDx = ball.vx * dt
  const totalDy = ball.vy * dt

  const stepMaxX = BALL_RADIUS * 0.75
  const stepMaxY = BALL_RADIUS * 0.75
  const distX = Math.abs(totalDx)
  const distY = Math.abs(totalDy)
  const stepsX = distX > 0 ? Math.ceil(distX / stepMaxX) : 0
  const stepsY = distY > 0 ? Math.ceil(distY / stepMaxY) : 0
  let steps = Math.max(1, stepsX, stepsY)
  steps = Math.min(steps, 24)

  let curX = ball.x
  let curY = ball.y
  let curVx = ball.vx
  let curVy = ball.vy
  let hitPaddle = false
  const r = ball.radius

  for (let s = 0; s < steps; s++) {
    const tStart = s / steps
    const tEnd = (s + 1) / steps
    const subStartX = ball.x + totalDx * tStart
    const subStartY = ball.y + totalDy * tStart
    const subEndX = ball.x + totalDx * tEnd
    const subEndY = ball.y + totalDy * tEnd

    curX = subEndX
    curY = subEndY

    const wallResult = checkWallCollisions(curX, curY, r, curVx, curVy)
    if (wallResult.hit) {
      curX = wallResult.x
      curY = wallResult.y
      curVx = wallResult.vx
      curVy = wallResult.vy
      playWallHit()
    }

    if (!hitPaddle) {
      const sweep = sweptPaddleHit(subStartX, subStartY, curX, curY, r, paddle)
      if (sweep.hit) {
        hitPaddle = true
        const reflected = reflectVelocity(sweep.contactX, paddle.x, paddle.w, curVx, curVy)
        curVx = reflected.vx
        curVy = reflected.vy
        curX = Math.max(r, Math.min(CANVAS_WIDTH - r, sweep.contactX))
        curY = paddle.y - r - 0.5
        playPaddleHit()
        break
      }
    }
  }

  if (!hitPaddle) {
    curX = Math.max(r, Math.min(CANVAS_WIDTH - r, curX))
    curY = Math.max(r, Math.min(CANVAS_HEIGHT + 100, curY))
  }

  return { nx: curX, ny: curY, vx: curVx, vy: curVy, hitPaddle }
}
