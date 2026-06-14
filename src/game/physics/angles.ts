import {
  MIN_BALL_SPEED,
  MAX_BALL_SPEED,
  PADDLE_REFLECT_MAX_ANGLE,
} from '@/config/constants'

export function clampBallSpeed(speed: number): number {
  return Math.max(MIN_BALL_SPEED, Math.min(MAX_BALL_SPEED, speed))
}

export function angleToVelocity(angleDeg: number, speed: number): { vx: number; vy: number } {
  const rad = (angleDeg * Math.PI) / 180
  return {
    vx: speed * Math.cos(rad),
    vy: -speed * Math.sin(rad),
  }
}

export function reflectVelocity(
  ballX: number,
  paddleX: number,
  paddleW: number,
  currentVx: number,
  currentVy: number,
): { vx: number; vy: number } {
  const relative = (ballX - (paddleX + paddleW / 2)) / (paddleW / 2)
  const angleDeg = relative * PADDLE_REFLECT_MAX_ANGLE
  const angleRad = (angleDeg * Math.PI) / 180
  const upRad = (90 * Math.PI) / 180
  const finalAngle = upRad - angleRad
  const speed = clampBallSpeed(Math.hypot(currentVx, currentVy))
  return {
    vx: speed * Math.cos(finalAngle),
    vy: -speed * Math.sin(finalAngle),
  }
}
