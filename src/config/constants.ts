import type { SplitConfig, BrickType } from '@/types/game'

export const CANVAS_WIDTH = 800
export const CANVAS_HEIGHT = 600

export const CENTER = { x: 400, y: 300 }

export const BALL_RADIUS = 8
export const DEFAULT_BALL_SPEED = 420
export const MIN_BALL_SPEED = 300
export const MAX_BALL_SPEED = 900

export const DEFAULT_PADDLE_WIDTH = 120
export const PADDLE_HEIGHT = 16
export const PADDLE_Y = CANVAS_HEIGHT - 40

export const DEFAULT_LIVES = 1

export const MAX_BALLS_ON_SCREEN = 8
export const MAX_POWERUPS_ON_SCREEN = 2
export const POWERUP_FALL_SPEED = 150
export const POWERUP_SIZE = 28

export const DEFAULT_DROP_RATE = 0.12

export const SPLIT_VFX_DURATION = 400

export const BRICK_SCORES: Record<BrickType, number> = {
  normal: 10,
  tough: 20,
  steel: 0,
  explosive: 10
}

export const BRICK_HP: Record<BrickType, number> = {
  normal: 1,
  tough: 2,
  steel: Infinity,
  explosive: 1
}

export const BRICK_COLORS: Record<BrickType, { fill: string; glow: string; border: string }> = {
  normal: { fill: '#00e5ff', glow: '#00e5ff', border: '#00bcd4' },
  tough: { fill: '#ff9800', glow: '#ffb74d', border: '#f57c00' },
  steel: { fill: '#78909c', glow: '#b0bec5', border: '#546e7a' },
  explosive: { fill: '#ff1744', glow: '#ff5252', border: '#d50000' }
}

export const LAYOUT_CHARS: Record<string, BrickType | null> = {
  'N': 'normal',
  'T': 'tough',
  'S': 'steel',
  'E': 'explosive',
  '.': null
}

export const SPLIT_CONFIG: SplitConfig = {
  SPLIT_360: {
    count: 3,
    anglesDeg: [90, 210, 330],
    fan: 'full',
    color: '#00e5ff',
    glowColor: '#00ffff'
  },
  SPLIT_FAN_UP: {
    count: 3,
    anglesDeg: [30, 90, 150],
    fan: 'upper_180',
    fanStartDeg: -90,
    fanEndDeg: 90,
    color: '#ff9800',
    glowColor: '#ffb74d'
  }
}

export const PADDLE_REFLECT_MIN_ANGLE = -60
export const PADDLE_REFLECT_MAX_ANGLE = 60

export const LAUNCH_SPREAD_DEG = 15

export const COMBO_WINDOW_MS = 2000
export const COMBO_MAX_MULTIPLIER = 3

export const BALL_TRAIL_LENGTH = 8
