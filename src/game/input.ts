import type { GameEngine } from './GameEngine'

export interface InputBindings {
  unbind: () => void
}

export function bindGameInput(
  engine: GameEngine,
  canvas: HTMLCanvasElement,
  options: { mouseControl: boolean } = { mouseControl: true },
): InputBindings {
  const handleKeyDown = (e: KeyboardEvent) => {
    engine.keyDown(e.code)
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    engine.keyUp(e.code)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!options.mouseControl) return
    engine.mouseMove(e.clientX)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      engine.touchMove(e.touches[0].clientX)
    }
  }

  const handleClick = (e: MouseEvent) => {
    engine.handleClick(e.clientX)
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      engine.handleClick(e.touches[0].clientX)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('touchmove', handleTouchMove, { passive: true })
  canvas.addEventListener('click', handleClick)
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true })

  const updateCanvasRect = () => {
    const rect = canvas.getBoundingClientRect()
    const scale = Math.min(
      rect.width / canvas.width,
      rect.height / canvas.height,
    )
    engine.setCanvasRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scale,
    })
  }

  updateCanvasRect()
  window.addEventListener('resize', updateCanvasRect)

  return {
    unbind: () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('click', handleClick)
      canvas.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('resize', updateCanvasRect)
    },
  }
}
