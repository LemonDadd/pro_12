export type PowerUpType = 'SPLIT_360' | 'SPLIT_FAN_UP'

export type BrickType = 'normal' | 'tough' | 'steel' | 'explosive'

export type GameMode = 'campaign' | 'endless'

export type GameStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost' | 'levelComplete'

export interface BrickCell {
  row: number
  col: number
  type: BrickType
  hp: number
  maxHp: number
  alive: boolean
  x: number
  y: number
  w: number
  h: number
}

export interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  trail: { x: number; y: number }[]
}

export interface Paddle {
  x: number
  y: number
  w: number
  h: number
}

export interface PowerUp {
  id: number
  x: number
  y: number
  type: PowerUpType
  vy: number
  size: number
}

export interface SplitConfigEntry {
  count: number
  anglesDeg: number[]
  fan: 'full' | 'upper_180'
  fanStartDeg?: number
  fanEndDeg?: number
  color: string
  glowColor: string
}

export interface SplitConfig {
  SPLIT_360: SplitConfigEntry
  SPLIT_FAN_UP: SplitConfigEntry
}

export interface LevelConfig {
  id: number
  layout: string[]
  ballSpeed: number
  paddleWidth: number
  powerupDropRate: number
  allowedPowerups: PowerUpType[]
  parScore: number
  brickAreaTop: number
  brickRows: number
  brickCols: number
  brickPadding: number
}

export interface GameSettings {
  sfxVolume: number
  musicVolume: number
  showCenterMarker: boolean
  mouseControl: boolean
}

export interface SaveData {
  unlockedLevel: number
  highScores: Record<number, number>
  starRatings: Record<number, number>
  totalScore: number
  settings: GameSettings
  endlessHighScore: number
}

export interface ComboState {
  multiplier: number
  lastBreakTime: number
  count: number
}

export interface SplitVFX {
  active: boolean
  type: PowerUpType
  startTime: number
  duration: number
  angles: number[]
  x: number
  y: number
}

export interface ExplosionVFX {
  x: number
  y: number
  radius: number
  startTime: number
  duration: number
}
