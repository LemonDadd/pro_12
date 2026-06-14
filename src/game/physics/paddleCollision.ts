import type { Ball, Paddle } from '@/types/game'
import {
  BALL_RADIUS,
  CANVAS_WIDTH,
} from '@/config/constants'
import { reflectVelocity } from './angles'

export interface PaddleCollisionResult {
  hit: boolean
  nx: number
  ny: number
  vx: number
  vy: number
}

export function sweptPaddleHit(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  paddle: Paddle,
): boolean {
  if (y1 <= y0) return false
  const px1 = paddle.x
  const px2 = paddle.x + paddle.w
  const py = paddle.y
  const dx = x1 - x0
  const dy = y1 - y0
  const withinX = x1 + r >= px1 && x1 - r <= px2
  const topY = py
  const prevBottom = y0 + r
  const newBottom = y1 + r
  if (prevBottom <= topY && newBottom >= topY && withinX) {
    return true
  }
  if (dy > 0) {
    const tTop = (py - (y0 + r)) / dy
    if (tTop >= 0 && tTop <= 1) {
      const hitX = x0 + dx * tTop
      if (hitX >= px1 - r * 0.5 && hitX <= px2 + r * 0.5) {
        return true
      }
    }
  }
  return false
}

export function updateBallWithPaddleSteps(
  ball: Ball,
  dt: number,
  paddle: Paddle,
  playWallHit: () => void,
  playPaddleHit: () => void,
): { nx: number; ny: number; vx: number; vy: number; hitPaddle: boolean } {
  let nx = ball.x
  let ny = ball.y
  let vx = ball.vx
  let vy = ball.vy

  const totalDx = vx * dt
  const totalDy = vy * dt
  const stepY = BALL_RADIUS * 0.75
  const totalDist = Math.abs(totalDy)
  let steps = totalDist > 0 ? Math.max(1, Math.ceil(totalDist / stepY)) : 1
  steps = Math.min(steps, 16)

  let hitPaddle = false
  for (let s = 0; s < steps; s++) {
    const frac = (s + 1) / steps
    const stepX = ball.x + totalDx * frac
    const stepYPos = ball.y + totalDy * frac

    if (stepX - ball.radius < 0) {
      nx = ball.radius; vx = Math.abs(vx)
      playWallHit()
    }
    if (stepX + ball.radius > CANVAS_WIDTH) {
      nx = CANVAS_WIDTH - ball.radius; vx = -Math.abs(vx)
      playWallHit()
    }
    if (stepYPos - ball.radius < 0) {
      ny = ball.radius; vy = Math.abs(vy)
      playWallHit()
    }

    nx = stepX
    ny = stepYPos

    if (!hitPaddle && sweptPaddleHit(ball.x, ball.y, nx, ny, ball.radius, paddle)) {
      hitPaddle = true
      const reflected = reflectVelocity(nx, paddle.x, paddle.w, vx, vy)
      vx = reflected.vx
      vy = reflected.vy
      ny = paddle.y - ball.radius - 0.5
      nx = Math.max(ball.radius, Math.min(CANVAS_WIDTH - ball.radius, nx))
      playPaddleHit()
      break
    }
  }

  return { nx, ny, vx, vy, hitPaddle }
}
