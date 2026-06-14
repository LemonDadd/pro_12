import type {
  Ball,
  BrickCell,
  BrickType,
  ComboState,
  ExplosionVFX,
  GameStatus,
  LevelConfig,
  Paddle,
  PowerUp,
  PowerUpType,
} from '@/types/game'
import {
  BALL_RADIUS,
  BALL_TRAIL_LENGTH,
  BRICK_SCORES,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COMBO_MAX_MULTIPLIER,
  COMBO_WINDOW_MS,
  DEFAULT_DROP_RATE,
  DEFAULT_LIVES,
  DEFAULT_PADDLE_WIDTH,
  LAUNCH_SPREAD_DEG,
  MAX_BALLS_ON_SCREEN,
  MAX_POWERUPS_ON_SCREEN,
  PADDLE_HEIGHT,
  PADDLE_Y,
  POWERUP_FALL_SPEED,
  POWERUP_SIZE,
} from '@/config/constants'
import { audioManager } from '@/game/audio'
import { updateBallWithPaddleSteps } from '@/game/physics/paddleCollision'
import { checkBrickCollision, damageBrick, getExplosionNeighbors } from '@/game/physics/brickCollision'
import { splitBalls } from '@/game/physics/splitBalls'
import { clampBallSpeed } from '@/game/physics/angles'
import { buildBricks } from '@/game/brickLayout'
import { buildEndlessWave } from '@/game/endlessWave'
import levels from '@/data/levels.json'

export type EngineEvent =
  | { type: 'score'; value: number }
  | { type: 'combo'; multiplier: number; count: number }
  | { type: 'livesChange'; value: number }
  | { type: 'statusChange'; value: GameStatus }
  | { type: 'levelComplete'; data: { score: number; stars: number; lives: number } }
  | { type: 'gameOver'; data: { score: number } }
  | { type: 'ballLaunched' }
  | { type: 'ballsChange'; count: number }
  | { type: 'shaking'; amount: number }
  | { type: 'brickBreak' }

export class GameEngine {
  status: GameStatus = 'ready'
  mode: 'campaign' | 'endless'
  levelId: number
  levelConfig!: LevelConfig
  score = 0
  lives = DEFAULT_LIVES
  paddle: Paddle
  balls: Ball[] = []
  bricks: BrickCell[] = []
  powerups: PowerUp[] = []
  explosions: ExplosionVFX[] = []
  combo: ComboState = { multiplier: 1, lastBreakTime: 0, count: 0 }
  waitingLaunch = true
  launchSpreadRad = 0
  endlessWave = 1
  ballNextId = 1
  powerupNextId = 1
  private rafId = 0
  private lastTime = 0
  private keysLeft = false
  private keysRight = false
  private canvasRect = { left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, scale: 1 }
  private listeners: ((e: EngineEvent) => void)[] = []
  shakeAmount = 0

  constructor(mode: 'campaign' | 'endless', levelId = 1) {
    this.mode = mode
    this.levelId = mode === 'campaign' ? Math.max(1, Math.min(30, levelId)) : 1
    this.paddle = { x: CANVAS_WIDTH / 2 - DEFAULT_PADDLE_WIDTH / 2, y: PADDLE_Y, w: DEFAULT_PADDLE_WIDTH, h: PADDLE_HEIGHT }
    this.loadLevelConfig()
    this.buildBricks()
    this.spawnInitialBall()
  }

  on(fn: (e: EngineEvent) => void) { this.listeners.push(fn); return () => { this.listeners = this.listeners.filter(f => f !== fn) } }
  private emit(e: EngineEvent) { for (const fn of this.listeners) fn(e) }

  private loadLevelConfig() {
    if (this.mode === 'campaign') {
      this.levelConfig = { ...((levels as LevelConfig[]).find(l => l.id === this.levelId) || (levels as LevelConfig[])[0]) }
    } else {
      this.levelConfig = buildEndlessWave(this.endlessWave)
    }
    this.paddle.w = this.levelConfig.paddleWidth
    this.paddle.x = CANVAS_WIDTH / 2 - this.paddle.w / 2
  }

  private buildBricks() {
    const result = buildBricks(this.levelConfig)
    this.bricks = result.bricks
  }

  private spawnInitialBall() {
    this.balls = [{ id: this.ballNextId++, x: this.paddle.x + this.paddle.w / 2, y: this.paddle.y - BALL_RADIUS - 1, vx: 0, vy: 0, radius: BALL_RADIUS, trail: [] }]
    this.waitingLaunch = true
    this.launchSpreadRad = (Math.random() * 2 - 1) * (LAUNCH_SPREAD_DEG * Math.PI / 180)
  }

  setCanvasRect(rect: { left: number; top: number; width: number; height: number; scale: number }) { this.canvasRect = rect }

  keyDown(code: string) {
    if (code === 'ArrowLeft' || code === 'KeyA') this.keysLeft = true
    if (code === 'ArrowRight' || code === 'KeyD') this.keysRight = true
    if (code === 'Space') this.tryLaunch()
    if (code === 'KeyP' || code === 'Escape') this.togglePause()
  }
  keyUp(code: string) {
    if (code === 'ArrowLeft' || code === 'KeyA') this.keysLeft = false
    if (code === 'ArrowRight' || code === 'KeyD') this.keysRight = false
  }
  mouseMove(clientX: number) {
    if (!this.canvasRect.scale) return
    const x = (clientX - this.canvasRect.left) / this.canvasRect.scale
    this.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - this.paddle.w, x - this.paddle.w / 2))
  }
  touchMove(clientX: number) { this.mouseMove(clientX) }
  handleClick(clientX: number) { this.mouseMove(clientX); this.tryLaunch() }

  tryLaunch() {
    if (this.status === 'paused') this.togglePause()
    if (this.status !== 'ready' && this.status !== 'playing') return
    if (!this.waitingLaunch) return
    if (this.status === 'ready') { this.status = 'playing'; this.emit({ type: 'statusChange', value: 'playing' }) }
    const speed = clampBallSpeed(this.levelConfig.ballSpeed)
    for (const ball of this.balls) {
      if (ball.vx === 0 && ball.vy === 0) {
        const upAngle = 90 * Math.PI / 180 + this.launchSpreadRad
        ball.vx = speed * Math.cos(upAngle); ball.vy = -speed * Math.sin(upAngle)
      }
    }
    this.waitingLaunch = false
    audioManager.playSfx('launch')
    this.emit({ type: 'ballLaunched' })
  }

  togglePause() {
    if (this.status === 'playing') { this.status = 'paused'; this.emit({ type: 'statusChange', value: 'paused' }) }
    else if (this.status === 'paused') { this.status = 'playing'; this.emit({ type: 'statusChange', value: 'playing' }) }
  }

  restart() {
    this.score = 0; this.lives = DEFAULT_LIVES; this.endlessWave = this.mode === 'endless' ? 1 : this.endlessWave
    this.ballNextId = 1; this.powerupNextId = 1; this.explosions = []
    this.combo = { multiplier: 1, lastBreakTime: 0, count: 0 }; this.shakeAmount = 0
    this.loadLevelConfig(); this.buildBricks(); this.powerups = []; this.spawnInitialBall(); this.status = 'ready'
    this.emit({ type: 'score', value: 0 }); this.emit({ type: 'livesChange', value: this.lives })
    this.emit({ type: 'statusChange', value: 'ready' }); this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  nextLevel() {
    if (this.mode !== 'campaign' || this.levelId >= 30) return
    this.levelId++; this.ballNextId = 1; this.powerupNextId = 1; this.explosions = []
    this.combo = { multiplier: 1, lastBreakTime: 0, count: 0 }; this.shakeAmount = 0
    this.loadLevelConfig(); this.buildBricks(); this.powerups = []; this.spawnInitialBall(); this.status = 'ready'
    this.emit({ type: 'statusChange', value: 'ready' }); this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  nextEndlessWave() {
    if (this.mode !== 'endless') return
    this.endlessWave++; this.levelConfig = buildEndlessWave(this.endlessWave)
    this.paddle.w = this.levelConfig.paddleWidth; this.paddle.x = CANVAS_WIDTH / 2 - this.paddle.w / 2
    this.buildBricks(); this.powerups = []; this.ballNextId = 1; this.powerupNextId = 1
    this.explosions = []; this.spawnInitialBall(); this.status = 'ready'
    this.emit({ type: 'statusChange', value: 'ready' }); this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.lastTime = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - this.lastTime) / 1000); this.lastTime = t; this.update(dt, t)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() { if (this.rafId) cancelAnimationFrame(this.rafId); this.rafId = 0 }

  private update(dt: number, nowMs: number) {
    if (this.status === 'paused' || this.status === 'won' || this.status === 'lost' || this.status === 'levelComplete') return
    if (this.shakeAmount > 0) this.shakeAmount = Math.max(0, this.shakeAmount - dt * 30)
    this.updatePaddle(dt); this.updateBalls(dt, nowMs); this.updatePowerups(dt); this.updateExplosions(dt); this.updateCombo(nowMs)
    if (!this.waitingLaunch && this.balls.length === 0) this.handleBallLost(nowMs)
    this.checkWin(nowMs)
  }

  private updatePaddle(dt: number) {
    const moveSpeed = 700 * dt
    if (this.keysLeft) this.paddle.x = Math.max(0, this.paddle.x - moveSpeed)
    if (this.keysRight) this.paddle.x = Math.min(CANVAS_WIDTH - this.paddle.w, this.paddle.x + moveSpeed)
    if (this.waitingLaunch) for (const ball of this.balls) {
      if (ball.vx === 0 && ball.vy === 0) { ball.x = this.paddle.x + this.paddle.w / 2; ball.y = this.paddle.y - ball.radius - 1 }
    }
  }

  private updateBalls(dt: number, nowMs: number) {
    const survivors: Ball[] = []
    for (const ball of this.balls) {
      if (ball.vx === 0 && ball.vy === 0) { survivors.push(ball); continue }
      const stepResult = updateBallWithPaddleSteps(ball, dt, this.paddle,
        () => audioManager.playSfx('paddleHit'), () => audioManager.playSfx('paddleHit'))
      let { nx, ny, vx, vy } = stepResult
      const brickHit = checkBrickCollision(nx, ny, ball.radius, vx, vy, this.bricks)
      if (brickHit.hit && brickHit.brick) {
        const b = brickHit.brick
        if (b.type === 'steel') audioManager.playSfx('brickSteel')
        else this.onBrickHit(b, nowMs)
        nx = brickHit.nx ?? nx; ny = brickHit.ny ?? ny; vx = brickHit.vx ?? vx; vy = brickHit.vy ?? vy
      }
      ball.trail.unshift({ x: ball.x, y: ball.y })
      if (ball.trail.length > BALL_TRAIL_LENGTH) ball.trail.pop()
      ball.x = nx; ball.y = ny; ball.vx = vx; ball.vy = vy
      if (ball.y - ball.radius > CANVAS_HEIGHT + 20) continue
      survivors.push(ball)
    }
    this.balls = survivors; this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  private onBrickHit(brick: BrickCell, nowMs: number) {
    const destroyed = damageBrick(brick, 1)
    if (!destroyed) { if (brick.type === 'tough') audioManager.playSfx('brickTough'); return }
    brick.alive = false
    this.onBrickDestroyed(brick, nowMs)
  }

  private onBrickDestroyed(brick: BrickCell, nowMs: number) {
    audioManager.playBrickHit(brick.type)
    this.addCombo(nowMs)
    const gained = Math.floor(BRICK_SCORES[brick.type] * this.combo.multiplier)
    this.score += gained; this.emit({ type: 'score', value: this.score }); this.emit({ type: 'brickBreak' })
    if (brick.type === 'explosive') {
      this.explosions.push({ x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, radius: 0, startTime: nowMs, duration: 350 })
      this.shakeAmount = Math.max(this.shakeAmount, 12); this.emit({ type: 'shaking', amount: this.shakeAmount })
      for (const other of getExplosionNeighbors(brick, this.bricks)) this.onBrickHit(other, nowMs)
    }
    this.tryDropPowerup(brick)
  }

  private addCombo(nowMs: number) {
    if (nowMs - this.combo.lastBreakTime <= COMBO_WINDOW_MS) {
      this.combo.count++; this.combo.multiplier = Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(this.combo.count / 3))
      if (this.combo.count > 1) audioManager.playSfx('combo')
    } else { this.combo.count = 1; this.combo.multiplier = 1 }
    this.combo.lastBreakTime = nowMs
    this.emit({ type: 'combo', multiplier: this.combo.multiplier, count: this.combo.count })
  }

  private updateCombo(nowMs: number) {
    if (nowMs - this.combo.lastBreakTime > COMBO_WINDOW_MS && this.combo.count > 0) {
      this.combo.count = 0; this.combo.multiplier = 1
      this.emit({ type: 'combo', multiplier: 1, count: 0 })
    }
  }

  private tryDropPowerup(brick: BrickCell) {
    if (brick.type === 'steel' || this.powerups.length >= MAX_POWERUPS_ON_SCREEN) return
    const rate = this.levelConfig.powerupDropRate ?? DEFAULT_DROP_RATE
    if (Math.random() > rate) return
    const allowed = this.levelConfig.allowedPowerups || ['SPLIT_360', 'SPLIT_FAN_UP']
    const type = allowed[Math.floor(Math.random() * allowed.length)]
    this.powerups.push({ id: this.powerupNextId++, x: brick.x + brick.w / 2, y: brick.y + brick.h / 2, type, vy: POWERUP_FALL_SPEED, size: POWERUP_SIZE })
  }

  private updatePowerups(dt: number) {
    const survivors: PowerUp[] = []
    for (const p of this.powerups) {
      p.y += p.vy * dt
      if (p.y - p.size / 2 > CANVAS_HEIGHT) continue
      const w = p.size / 2
      if (p.x + w >= this.paddle.x && p.x - w <= this.paddle.x + this.paddle.w &&
          p.y + w >= this.paddle.y && p.y - w <= this.paddle.y + this.paddle.h) {
        this.onPaddleCatchPowerup(p.type); continue
      }
      survivors.push(p)
    }
    this.powerups = survivors
  }

  private onPaddleCatchPowerup(type: PowerUpType) {
    audioManager.playSfx('powerupCatch'); this.score += 50; this.emit({ type: 'score', value: this.score })
    this.triggerSplit(type)
  }

  private triggerSplit(type: PowerUpType) {
    const result = splitBalls(this.balls, type, () => this.ballNextId++)
    this.balls = result.balls.slice(0, MAX_BALLS_ON_SCREEN)
    this.waitingLaunch = result.waitingLaunch
    this.emit({ type: 'ballsChange', count: this.balls.length })
    audioManager.playSfx('split')
  }

  private updateExplosions(dt: number) {
    const now = performance.now()
    this.explosions = this.explosions.filter(e => {
      const p = (now - e.startTime) / e.duration; e.radius = 80 * p; return p < 1
    })
  }

  private handleBallLost(nowMs: number) {
    this.lives--; this.emit({ type: 'livesChange', value: this.lives }); audioManager.playSfx('ballLost')
    if (this.lives <= 0) {
      this.status = 'lost'; this.emit({ type: 'statusChange', value: 'lost' })
      this.emit({ type: 'gameOver', data: { score: this.score } }); audioManager.playSfx('gameOver'); return
    }
    this.spawnInitialBall(); this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  private checkWin(nowMs: number) {
    if (this.bricks.some(b => b.alive && b.type !== 'steel')) return
    this.score += this.lives * 500 + 1000; this.emit({ type: 'score', value: this.score }); audioManager.playSfx('levelComplete')
    const stars = this.computeStars(this.score, this.levelConfig.parScore, this.lives)
    this.status = 'levelComplete'; this.emit({ type: 'statusChange', value: 'levelComplete' })
    this.emit({ type: 'levelComplete', data: { score: this.score, stars, lives: this.lives } })
  }

  private computeStars(score: number, par: number, lives: number): number {
    const ratio = score / Math.max(par, 1)
    if (ratio >= 2) return 3
    if (ratio >= 1.5) return 2
    return 1
  }

  getStars(score: number, par: number, lives: number): number { return this.computeStars(score, par, lives) }
}
