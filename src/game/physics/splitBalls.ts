import type { Ball, PowerUpType } from '@/types/game'
import { SPLIT_CONFIG, BALL_RADIUS } from '@/config/constants'
import { angleToVelocity, clampBallSpeed } from './angles'

export interface SplitResult {
  balls: Ball[]
  waitingLaunch: boolean
}

export function splitBalls(
  currentBalls: Ball[],
  type: PowerUpType,
  getNextBallId: () => number,
): SplitResult {
  const cfg = SPLIT_CONFIG[type]
  const activeBalls = currentBalls.filter((b) => b.vx !== 0 || b.vy !== 0)
  const stuckBalls = currentBalls.filter((b) => b.vx === 0 && b.vy === 0)

  const newBalls: Ball[] = [...stuckBalls]

  for (const source of activeBalls) {
    const speed = clampBallSpeed(Math.hypot(source.vx, source.vy))
    for (const angle of cfg.anglesDeg) {
      const { vx, vy } = angleToVelocity(angle, speed)
      newBalls.push({
        id: getNextBallId(),
        x: source.x,
        y: source.y,
        vx,
        vy,
        radius: BALL_RADIUS,
        trail: [...source.trail],
      })
    }
  }

  return {
    balls: newBalls,
    waitingLaunch: stuckBalls.length > 0,
  }
}
