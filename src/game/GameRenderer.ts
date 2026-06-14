import type { GameEngine } from './GameEngine'
import {
  BRICK_COLORS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CENTER,
  SPLIT_CONFIG,
} from '@/config/constants'
import type { PowerUpType } from '@/types/game'

export class GameRenderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private engine: GameEngine
  private rafId = 0
  private showCenterMarker = true
  private scale = 1

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
    this.engine = engine
    this.resize()
  }

  setShowCenterMarker(v: boolean) {
    this.showCenterMarker = v
  }

  resize() {
    const parent = this.canvas.parentElement
    if (!parent) return
    const availW = parent.clientWidth
    const availH = parent.clientHeight
    const scale = Math.min(availW / CANVAS_WIDTH, availH / CANVAS_HEIGHT)
    this.scale = scale
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = CANVAS_WIDTH * scale * dpr
    this.canvas.height = CANVAS_HEIGHT * scale * dpr
    this.canvas.style.width = `${CANVAS_WIDTH * scale}px`
    this.canvas.style.height = `${CANVAS_HEIGHT * scale}px`
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0)
  }

  start() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    const loop = () => {
      this.render()
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private render() {
    const ctx = this.ctx
    ctx.save()
    const shakeX = this.engine.shakeAmount > 0 ? (Math.random() - 0.5) * this.engine.shakeAmount : 0
    const shakeY = this.engine.shakeAmount > 0 ? (Math.random() - 0.5) * this.engine.shakeAmount : 0
    ctx.translate(shakeX, shakeY)

    this.drawBackground()
    if (this.showCenterMarker) this.drawCenterMarker()
    this.drawBricks()
    this.drawExplosions()
    this.drawPowerups()
    this.drawPaddle()
    this.drawBalls()
    this.drawBorders()

    ctx.restore()
  }

  private drawBackground() {
    const ctx = this.ctx
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    grad.addColorStop(0, '#0a0a1f')
    grad.addColorStop(0.5, '#121230')
    grad.addColorStop(1, '#0a0a1f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = 'rgba(80, 120, 255, 0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }
  }

  private drawCenterMarker() {
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(CENTER.x - 14, CENTER.y)
    ctx.lineTo(CENTER.x + 14, CENTER.y)
    ctx.moveTo(CENTER.x, CENTER.y - 14)
    ctx.lineTo(CENTER.x, CENTER.y + 14)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(CENTER.x, CENTER.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawBricks() {
    const ctx = this.ctx
    for (const b of this.engine.bricks) {
      if (!b.alive) continue
      const colors = BRICK_COLORS[b.type]
      const x = b.x, y = b.y, w = b.w, h = b.h

      ctx.save()
      ctx.shadowColor = colors.glow
      ctx.shadowBlur = b.type === 'steel' ? 4 : 12
      const grad = ctx.createLinearGradient(x, y, x, y + h)
      grad.addColorStop(0, this.lighten(colors.fill, 0.25))
      grad.addColorStop(0.5, colors.fill)
      grad.addColorStop(1, this.darken(colors.fill, 0.3))
      ctx.fillStyle = grad
      this.roundRect(ctx, x, y, w, h, 4)
      ctx.fill()

      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1.5
      this.roundRect(ctx, x, y, w, h, 4)
      ctx.stroke()

      if (b.type === 'tough' && b.hp < b.maxHp && b.maxHp !== Infinity) {
        const ratio = b.hp / b.maxHp
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(x + 4, y + h - 4, (w - 8) * ratio, 2)
      }
      if (b.type === 'steel') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + 4, y + h / 2)
        ctx.lineTo(x + w - 4, y + h / 2)
        ctx.moveTo(x + w / 2, y + 4)
        ctx.lineTo(x + w / 2, y + h - 4)
        ctx.stroke()
      }
      if (b.type === 'explosive') {
        ctx.fillStyle = 'rgba(255, 255, 120, 0.85)'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', x + w / 2, y + h / 2)
      }
      ctx.restore()
    }
  }

  private drawPaddle() {
    const ctx = this.ctx
    const p = this.engine.paddle
    ctx.save()
    ctx.shadowColor = '#5eead4'
    ctx.shadowBlur = 18
    const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h)
    grad.addColorStop(0, '#a7f3d0')
    grad.addColorStop(0.5, '#10b981')
    grad.addColorStop(1, '#047857')
    ctx.fillStyle = grad
    this.roundRect(ctx, p.x, p.y, p.w, p.h, 8)
    ctx.fill()

    ctx.strokeStyle = '#6ee7b7'
    ctx.lineWidth = 1.5
    this.roundRect(ctx, p.x, p.y, p.w, p.h, 8)
    ctx.stroke()
    ctx.restore()
  }

  private drawBalls() {
    const ctx = this.ctx
    for (const ball of this.engine.balls) {
      for (let i = ball.trail.length - 1; i >= 0; i--) {
        const t = ball.trail[i]
        const alpha = (1 - i / ball.trail.length) * 0.35
        const r = ball.radius * (1 - i / ball.trail.length * 0.5)
        ctx.fillStyle = `rgba(110, 231, 183, ${alpha})`
        ctx.beginPath()
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.save()
      ctx.shadowColor = '#6ee7b7'
      ctx.shadowBlur = 16
      const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.4, '#a7f3d0')
      grad.addColorStop(1, '#10b981')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawPowerups() {
    const ctx = this.ctx
    for (const p of this.engine.powerups) {
      this.drawPowerupIcon(ctx, p.x, p.y, p.size, p.type)
    }
  }

  private drawPowerupIcon(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    type: PowerUpType,
  ) {
    const cfg = SPLIT_CONFIG[type]
    const r = size / 2
    ctx.save()
    ctx.shadowColor = cfg.glowColor
    ctx.shadowBlur = 16
    ctx.fillStyle = 'rgba(15, 20, 45, 0.85)'
    ctx.strokeStyle = cfg.color
    ctx.lineWidth = 2
    this.roundRect(ctx, cx - r, cy - r, size, size, 6)
    ctx.fill()
    ctx.stroke()

    const innerR = r * 0.72
    if (type === 'SPLIT_360') {
      ctx.strokeStyle = cfg.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = cfg.color
      for (const angleDeg of cfg.anglesDeg) {
        const rad = (angleDeg * Math.PI) / 180
        const tx = cx + innerR * Math.cos(rad)
        const ty = cy - innerR * Math.sin(rad)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      ctx.strokeStyle = cfg.color
      ctx.lineWidth = 1.5
      ctx.fillStyle = `${cfg.color}33`
      const start = Math.PI
      const end = 0
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, innerR, start, end, false)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = cfg.color
      for (const angleDeg of cfg.anglesDeg) {
        const rad = (angleDeg * Math.PI) / 180
        const tx = cx + innerR * Math.cos(rad)
        const ty = cy - innerR * Math.sin(rad)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(tx, ty, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  private drawExplosions() {
    const ctx = this.ctx
    for (const e of this.engine.explosions) {
      const progress = Math.min(1, (performance.now() - e.startTime) / e.duration)
      const r = e.radius
      const alpha = 1 - progress
      ctx.save()
      ctx.strokeStyle = `rgba(255, 100, 50, ${alpha})`
      ctx.lineWidth = 3
      ctx.shadowColor = '#ff6633'
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = `rgba(255, 180, 80, ${alpha * 0.25})`
      ctx.fill()
      ctx.restore()
    }
  }

  private drawBorders() {
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.35)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2)
    ctx.restore()
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
    ctx.lineTo(x + w, y + h - rr)
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
    ctx.lineTo(x + rr, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
    ctx.lineTo(x, y + rr)
    ctx.quadraticCurveTo(x, y, x + rr, y)
    ctx.closePath()
  }

  private lighten(hex: string, amt: number): string {
    const { r, g, b } = this.parseHex(hex)
    return `rgb(${Math.min(255, r + (255 - r) * amt)|0}, ${Math.min(255, g + (255 - g) * amt)|0}, ${Math.min(255, b + (255 - b) * amt)|0})`
  }

  private darken(hex: string, amt: number): string {
    const { r, g, b } = this.parseHex(hex)
    return `rgb(${Math.max(0, r * (1 - amt))|0}, ${Math.max(0, g * (1 - amt))|0}, ${Math.max(0, b * (1 - amt))|0})`
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map((c) => c + c).join('')
    const num = parseInt(h, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
  }

  private hex(n: number): string {
    return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  }
}
