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
  SplitVFX,
} from '@/types/game'
import {
  BALL_RADIUS,
  BALL_TRAIL_LENGTH,
  BRICK_HP,
  BRICK_SCORES,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CENTER,
  COMBO_MAX_MULTIPLIER,
  COMBO_WINDOW_MS,
  DEFAULT_BALL_SPEED,
  DEFAULT_DROP_RATE,
  DEFAULT_LIVES,
  DEFAULT_PADDLE_WIDTH,
  LAUNCH_SPREAD_DEG,
  LAYOUT_CHARS,
  MAX_BALLS_ON_SCREEN,
  MAX_BALL_SPEED,
  MAX_POWERUPS_ON_SCREEN,
  MIN_BALL_SPEED,
  PADDLE_HEIGHT,
  PADDLE_REFLECT_MAX_ANGLE,
  PADDLE_REFLECT_MIN_ANGLE,
  PADDLE_Y,
  POWERUP_FALL_SPEED,
  POWERUP_SIZE,
  SPLIT_CONFIG,
  SPLIT_VFX_DURATION,
} from '@/config/constants'
import { audioManager } from '@/utils/audio'
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
  splitVfx: SplitVFX | null = null
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
  private canvasRect: { left: number; top: number; width: number; height: number; scale: number } = {
    left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, scale: 1
  }
  private listeners: ((e: EngineEvent) => void)[] = []
  private pendingSplit: { type: PowerUpType; speed: number } | null = null
  private splitPendingUntil = 0
  shakeAmount = 0
  private brickW = 0
  private brickH = 0

  constructor(mode: 'campaign' | 'endless', levelId = 1) {
    this.mode = mode
    this.levelId = mode === 'campaign' ? Math.max(1, Math.min(30, levelId)) : 1
    this.paddle = {
      x: CANVAS_WIDTH / 2 - DEFAULT_PADDLE_WIDTH / 2,
      y: PADDLE_Y,
      w: DEFAULT_PADDLE_WIDTH,
      h: PADDLE_HEIGHT,
    }
    this.loadLevelConfig()
    this.buildBricks()
    this.spawnInitialBall()
  }

  on(fn: (e: EngineEvent) => void) {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn)
    }
  }

  private emit(e: EngineEvent) {
    for (const fn of this.listeners) fn(e)
  }

  private loadLevelConfig() {
    if (this.mode === 'campaign') {
      const cfg = (levels as LevelConfig[]).find((l) => l.id === this.levelId)
      if (cfg) {
        this.levelConfig = { ...cfg }
      } else {
        this.levelConfig = { ...(levels as LevelConfig[])[0] }
      }
    } else {
      this.levelConfig = this.buildEndlessWave(this.endlessWave)
    }
    this.paddle.w = this.levelConfig.paddleWidth
    this.paddle.x = CANVAS_WIDTH / 2 - this.paddle.w / 2
  }

  private buildEndlessWave(wave: number): LevelConfig {
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

  private buildBricks() {
    this.bricks = []
    const cfg = this.levelConfig
    const totalPadding = (cfg.brickCols - 1) * cfg.brickPadding
    const usableW = CANVAS_WIDTH - 60
    this.brickW = (usableW - totalPadding) / cfg.brickCols
    this.brickH = 26
    const startX = 30
    for (let r = 0; r < cfg.layout.length; r++) {
      const rowStr = cfg.layout[r]
      for (let c = 0; c < cfg.brickCols; c++) {
        const ch = rowStr[c] || '.'
        const type = LAYOUT_CHARS[ch]
        if (!type) continue
        const hp = BRICK_HP[type]
        const x = startX + c * (this.brickW + cfg.brickPadding)
        const y = cfg.brickAreaTop + r * (this.brickH + cfg.brickPadding)
        this.bricks.push({
          row: r,
          col: c,
          type,
          hp,
          maxHp: hp,
          alive: true,
          x, y,
          w: this.brickW,
          h: this.brickH,
        })
      }
    }
  }

  private spawnInitialBall() {
    this.balls = [this.createBallStuckToPaddle()]
    this.waitingLaunch = true
    this.launchSpreadRad = (Math.random() * 2 - 1) * (LAUNCH_SPREAD_DEG * Math.PI / 180)
  }

  private createBallStuckToPaddle(): Ball {
    return {
      id: this.ballNextId++,
      x: this.paddle.x + this.paddle.w / 2,
      y: this.paddle.y - BALL_RADIUS - 1,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      trail: [],
    }
  }

  private clampBallSpeed(speed: number) {
    return Math.max(MIN_BALL_SPEED, Math.min(MAX_BALL_SPEED, speed))
  }

  private angleToVelocity(angleDeg: number, speed: number): { vx: number; vy: number } {
    const rad = (angleDeg * Math.PI) / 180
    return {
      vx: speed * Math.cos(rad),
      vy: -speed * Math.sin(rad),
    }
  }

  setCanvasRect(rect: { left: number; top: number; width: number; height: number; scale: number }) {
    this.canvasRect = rect
  }

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

  touchMove(clientX: number) {
    this.mouseMove(clientX)
  }

  handleClick(clientX: number) {
    this.mouseMove(clientX)
    this.tryLaunch()
  }

  tryLaunch() {
    if (this.status === 'paused') this.togglePause()
    if (this.status !== 'ready' && this.status !== 'playing') return
    if (!this.waitingLaunch) return
    if (this.status === 'ready') {
      this.status = 'playing'
      this.emit({ type: 'statusChange', value: 'playing' })
    }
    for (const ball of this.balls) {
      if (ball.vx === 0 && ball.vy === 0) {
        const upAngle = 90 * Math.PI / 180 + this.launchSpreadRad
        const speed = this.clampBallSpeed(this.levelConfig.ballSpeed)
        ball.vx = speed * Math.cos(upAngle)
        ball.vy = -speed * Math.sin(upAngle)
      }
    }
    this.waitingLaunch = false
    audioManager.playSfx('launch')
    this.emit({ type: 'ballLaunched' })
  }

  togglePause() {
    if (this.status === 'playing') {
      this.status = 'paused'
      this.emit({ type: 'statusChange', value: 'paused' })
    } else if (this.status === 'paused') {
      this.status = 'playing'
      this.emit({ type: 'statusChange', value: 'playing' })
    }
  }

  restart() {
    this.score = 0
    this.lives = DEFAULT_LIVES
    this.endlessWave = this.mode === 'endless' ? 1 : this.endlessWave
    this.ballNextId = 1
    this.powerupNextId = 1
    this.explosions = []
    this.splitVfx = null
    this.pendingSplit = null
    this.combo = { multiplier: 1, lastBreakTime: 0, count: 0 }
    this.shakeAmount = 0
    this.loadLevelConfig()
    this.buildBricks()
    this.powerups = []
    this.spawnInitialBall()
    this.status = 'ready'
    this.emit({ type: 'score', value: 0 })
    this.emit({ type: 'livesChange', value: this.lives })
    this.emit({ type: 'statusChange', value: 'ready' })
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  nextLevel() {
    if (this.mode !== 'campaign') return
    if (this.levelId >= 30) return
    this.levelId++
    this.ballNextId = 1
    this.powerupNextId = 1
    this.explosions = []
    this.splitVfx = null
    this.pendingSplit = null
    this.combo = { multiplier: 1, lastBreakTime: 0, count: 0 }
    this.shakeAmount = 0
    this.loadLevelConfig()
    this.buildBricks()
    this.powerups = []
    this.spawnInitialBall()
    this.status = 'ready'
    this.emit({ type: 'statusChange', value: 'ready' })
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  nextEndlessWave() {
    if (this.mode !== 'endless') return
    this.endlessWave++
    this.levelConfig = this.buildEndlessWave(this.endlessWave)
    this.paddle.w = this.levelConfig.paddleWidth
    this.paddle.x = CANVAS_WIDTH / 2 - this.paddle.w / 2
    this.buildBricks()
    this.powerups = []
    this.ballNextId = 1
    this.powerupNextId = 1
    this.explosions = []
    this.splitVfx = null
    this.pendingSplit = null
    this.spawnInitialBall()
    this.status = 'ready'
    this.emit({ type: 'statusChange', value: 'ready' })
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.lastTime = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.033, (t - this.lastTime) / 1000)
      this.lastTime = t
      this.update(dt, t)
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private update(dt: number, nowMs: number) {
    if (this.status === 'paused' || this.status === 'won' || this.status === 'lost' || this.status === 'levelComplete') return
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 30)
    }
    this.updatePaddle(dt)
    this.updateSplitVfx(nowMs)
    this.updateBalls(dt, nowMs)
    this.updatePowerups(dt)
    this.updateExplosions(dt)
    this.updateCombo(nowMs)
    if (!this.waitingLaunch && this.balls.length === 0 && !this.pendingSplit) {
      this.handleBallLost(nowMs)
    }
    this.checkWin(nowMs)
  }

  private updatePaddle(dt: number) {
    const moveSpeed = 700 * dt
    if (this.keysLeft) this.paddle.x = Math.max(0, this.paddle.x - moveSpeed)
    if (this.keysRight) this.paddle.x = Math.min(CANVAS_WIDTH - this.paddle.w, this.paddle.x + moveSpeed)
    if (this.waitingLaunch) {
      for (const ball of this.balls) {
        if (ball.vx === 0 && ball.vy === 0) {
          ball.x = this.paddle.x + this.paddle.w / 2
          ball.y = this.paddle.y - ball.radius - 1
        }
      }
    }
  }

  private updateSplitVfx(nowMs: number) {
    if (this.pendingSplit && nowMs >= this.splitPendingUntil) {
      this.executeSplit(this.pendingSplit.type, this.pendingSplit.speed)
      this.pendingSplit = null
      this.splitVfx = null
    }
    if (this.splitVfx) {
      const progress = (nowMs - this.splitVfx.startTime) / this.splitVfx.duration
      if (progress >= 1) this.splitVfx = null
    }
  }

  private updateBalls(dt: number, nowMs: number) {
    const survivors: Ball[] = []
    for (const ball of this.balls) {
      if (ball.vx === 0 && ball.vy === 0) {
        survivors.push(ball)
        continue
      }
      let nx = ball.x + ball.vx * dt
      let ny = ball.y + ball.vy * dt
      let vx = ball.vx
      let vy = ball.vy

      if (nx - ball.radius < 0) { nx = ball.radius; vx = Math.abs(vx); audioManager.playSfx('paddleHit') }
      if (nx + ball.radius > CANVAS_WIDTH) { nx = CANVAS_WIDTH - ball.radius; vx = -Math.abs(vx); audioManager.playSfx('paddleHit') }
      if (ny - ball.radius < 0) { ny = ball.radius; vy = Math.abs(vy); audioManager.playSfx('paddleHit') }

      if (this.intersectsPaddle(nx, ny, ball.radius, vx, vy)) {
        const relative = (nx - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2)
        const angleDeg = relative * PADDLE_REFLECT_MAX_ANGLE
        const angleRad = (angleDeg * Math.PI) / 180
        const upRad = (90 * Math.PI) / 180
        const finalAngle = upRad - angleRad
        const speed = this.clampBallSpeed(Math.hypot(vx, vy))
        vx = speed * Math.cos(finalAngle)
        vy = -speed * Math.sin(finalAngle)
        ny = this.paddle.y - ball.radius - 0.5
        nx = Math.max(ball.radius, Math.min(CANVAS_WIDTH - ball.radius, nx))
        audioManager.playSfx('paddleHit')
      }

      const brickHit = this.checkBrickCollision(nx, ny, ball.radius, vx, vy, nowMs)
      if (brickHit.hit) {
        nx = brickHit.nx ?? nx
        ny = brickHit.ny ?? ny
        vx = brickHit.vx ?? vx
        vy = brickHit.vy ?? vy
      }

      ball.trail.unshift({ x: ball.x, y: ball.y })
      if (ball.trail.length > BALL_TRAIL_LENGTH) ball.trail.pop()
      ball.x = nx
      ball.y = ny
      ball.vx = vx
      ball.vy = vy

      if (ball.y - ball.radius > CANVAS_HEIGHT + 20) continue
      survivors.push(ball)
    }
    this.balls = survivors
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  private intersectsPaddle(x: number, y: number, r: number, vx: number, vy: number): boolean {
    if (vy <= 0) return false
    const px1 = this.paddle.x
    const px2 = this.paddle.x + this.paddle.w
    const py1 = this.paddle.y
    const py2 = this.paddle.y + this.paddle.h
    const prevY = y - vy * 0.016
    const withinX = x + r >= px1 && x - r <= px2
    const crossTop = prevY + r <= py1 && y + r >= py1 && y - r <= py2
    return withinX && crossTop
  }

  private checkBrickCollision(
    x: number,
    y: number,
    r: number,
    vx: number,
    vy: number,
    nowMs: number,
  ): { hit: boolean; nx?: number; ny?: number; vx?: number; vy?: number } {
    let best: { brick: BrickCell; depth: number; side: 'top' | 'bottom' | 'left' | 'right' } | null = null

    for (const brick of this.bricks) {
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

    if (brick.type === 'steel') {
      audioManager.playSfx('brickSteel')
    } else {
      this.damageBrick(brick, 1, nowMs)
    }

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

    return { hit: true, nx, ny, vx: nvx, vy: nvy }
  }

  private damageBrick(brick: BrickCell, amount: number, nowMs: number) {
    if (brick.type === 'steel') return
    brick.hp -= amount
    if (brick.hp <= 0 && brick.alive) {
      brick.alive = false
      this.onBrickDestroyed(brick, nowMs)
    }
  }

  private onBrickDestroyed(brick: BrickCell, nowMs: number) {
    if (brick.type === 'normal') audioManager.playSfx('brickNormal')
    else if (brick.type === 'tough') audioManager.playSfx('brickTough')

    const base = BRICK_SCORES[brick.type]
    this.addCombo(nowMs)
    const gained = Math.floor(base * this.combo.multiplier)
    this.score += gained
    this.emit({ type: 'score', value: this.score })
    this.emit({ type: 'brickBreak' })

    if (brick.type === 'explosive') {
      audioManager.playSfx('brickExplode')
      this.explosions.push({
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        radius: 0,
        startTime: nowMs,
        duration: 350,
      })
      this.shakeAmount = Math.max(this.shakeAmount, 12)
      this.emit({ type: 'shaking', amount: this.shakeAmount })
      for (const other of this.bricks) {
        if (!other.alive) continue
        if (other === brick) continue
        const dr = Math.abs(other.row - brick.row)
        const dc = Math.abs(other.col - brick.col)
        if (dr <= 1 && dc <= 1) {
          this.damageBrick(other, 1, nowMs)
        }
      }
    }

    this.tryDropPowerup(brick)
  }

  private addCombo(nowMs: number) {
    if (nowMs - this.combo.lastBreakTime <= COMBO_WINDOW_MS) {
      this.combo.count++
      this.combo.multiplier = Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(this.combo.count / 3))
      if (this.combo.count > 1) audioManager.playSfx('combo')
    } else {
      this.combo.count = 1
      this.combo.multiplier = 1
    }
    this.combo.lastBreakTime = nowMs
    this.emit({ type: 'combo', multiplier: this.combo.multiplier, count: this.combo.count })
  }

  private updateCombo(nowMs: number) {
    if (nowMs - this.combo.lastBreakTime > COMBO_WINDOW_MS && this.combo.count > 0) {
      this.combo.count = 0
      this.combo.multiplier = 1
      this.emit({ type: 'combo', multiplier: 1, count: 0 })
    }
  }

  private tryDropPowerup(brick: BrickCell) {
    if (brick.type === 'steel') return
    if (this.powerups.length >= MAX_POWERUPS_ON_SCREEN) return
    if (this.pendingSplit) return
    const rate = this.levelConfig.powerupDropRate ?? DEFAULT_DROP_RATE
    if (Math.random() > rate) return
    const allowed = this.levelConfig.allowedPowerups || ['SPLIT_360', 'SPLIT_FAN_UP']
    const type = allowed[Math.floor(Math.random() * allowed.length)]
    this.powerups.push({
      id: this.powerupNextId++,
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      type,
      vy: POWERUP_FALL_SPEED,
      size: POWERUP_SIZE,
    })
  }

  private updatePowerups(dt: number) {
    const survivors: PowerUp[] = []
    for (const p of this.powerups) {
      p.y += p.vy * dt
      if (p.y - p.size / 2 > CANVAS_HEIGHT) continue
      const px1 = this.paddle.x
      const px2 = this.paddle.x + this.paddle.w
      const py1 = this.paddle.y
      const py2 = this.paddle.y + this.paddle.h
      const w = p.size / 2
      if (
        p.x + w >= px1 &&
        p.x - w <= px2 &&
        p.y + w >= py1 &&
        p.y - w <= py2
      ) {
        this.onPaddleCatchPowerup(p.type)
        continue
      }
      survivors.push(p)
    }
    this.powerups = survivors
  }

  private onPaddleCatchPowerup(type: PowerUpType) {
    audioManager.playSfx('powerupCatch')
    this.score += 50
    this.emit({ type: 'score', value: this.score })
    this.triggerSplit(type)
  }

  private triggerSplit(type: PowerUpType) {
    const avgSpeed = this.computeBallSpeed()
    const speed = this.clampBallSpeed(Math.max(this.levelConfig.ballSpeed, avgSpeed))
    const cfg = SPLIT_CONFIG[type]
    this.splitVfx = {
      active: true,
      type,
      startTime: performance.now(),
      duration: SPLIT_VFX_DURATION,
      angles: cfg.anglesDeg,
    }
    this.pendingSplit = { type, speed }
    this.splitPendingUntil = performance.now() + SPLIT_VFX_DURATION
    this.balls = this.balls.filter((b) => b.vx === 0 && b.vy === 0)
    audioManager.playSfx('split')
  }

  private computeBallSpeed(): number {
    const active = this.balls.filter((b) => !(b.vx === 0 && b.vy === 0))
    if (active.length === 0) return this.levelConfig.ballSpeed
    const total = active.reduce((s, b) => s + Math.hypot(b.vx, b.vy), 0)
    return total / active.length
  }

  private executeSplit(type: PowerUpType, speed: number) {
    const cfg = SPLIT_CONFIG[type]
    const newBalls: Ball[] = [...this.balls]
    for (const angle of cfg.anglesDeg) {
      if (newBalls.length >= MAX_BALLS_ON_SCREEN) break
      const { vx, vy } = this.angleToVelocity(angle, speed)
      newBalls.push({
        id: this.ballNextId++,
        x: CENTER.x,
        y: CENTER.y,
        vx,
        vy,
        radius: BALL_RADIUS,
        trail: [],
      })
    }
    if (newBalls.length > MAX_BALLS_ON_SCREEN) {
      newBalls.length = MAX_BALLS_ON_SCREEN
    }
    this.balls = newBalls
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  private updateExplosions(dt: number) {
    const now = performance.now()
    this.explosions = this.explosions.filter((e) => {
      const p = (now - e.startTime) / e.duration
      e.radius = 80 * p
      return p < 1
    })
  }

  private handleBallLost(nowMs: number) {
    this.lives--
    this.emit({ type: 'livesChange', value: this.lives })
    audioManager.playSfx('ballLost')
    if (this.lives <= 0) {
      this.status = 'lost'
      this.emit({ type: 'statusChange', value: 'lost' })
      this.emit({ type: 'gameOver', data: { score: this.score } })
      audioManager.playSfx('gameOver')
      return
    }
    this.spawnInitialBall()
    this.emit({ type: 'ballsChange', count: this.balls.length })
  }

  private checkWin(nowMs: number) {
    const remaining = this.bricks.some(
      (b) => b.alive && b.type !== 'steel',
    )
    if (remaining) return
    const livesBonus = this.lives * 500
    const clearBonus = 1000
    this.score += livesBonus + clearBonus
    this.emit({ type: 'score', value: this.score })
    audioManager.playSfx('levelComplete')
    if (this.mode === 'campaign') {
      const stars = this.computeStars(this.score, this.levelConfig.parScore, this.lives)
      this.status = 'levelComplete'
      this.emit({ type: 'statusChange', value: 'levelComplete' })
      this.emit({
        type: 'levelComplete',
        data: { score: this.score, stars, lives: this.lives },
      })
    } else {
      const stars = this.computeStars(this.score, this.levelConfig.parScore, this.lives)
      this.status = 'levelComplete'
      this.emit({ type: 'statusChange', value: 'levelComplete' })
      this.emit({
        type: 'levelComplete',
        data: { score: this.score, stars, lives: this.lives },
      })
    }
  }

  private computeStars(score: number, par: number, lives: number): number {
    const p = Math.max(par, 1)
    const ratio = score / p
    let stars = 1
    if (ratio >= 1.5) stars = 2
    if (ratio >= 2 || lives >= DEFAULT_LIVES) stars = Math.min(3, Math.max(stars, 3))
    return stars
  }

  getStars(score: number, par: number, lives: number): number {
    return this.computeStars(score, par, lives)
  }
}
