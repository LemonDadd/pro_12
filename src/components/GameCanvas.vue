<template>
  <div class="game-canvas-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef" class="game-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { GameEngine } from '@/game/GameEngine'
import { GameRenderer } from '@/game/GameRenderer'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/config/constants'
import type { EngineEvent } from '@/game/GameEngine'

const props = defineProps<{
  mode: 'campaign' | 'endless'
  levelId?: number
  showCenterMarker?: boolean
}>()

const emit = defineEmits<{
  (e: 'event', ev: EngineEvent): void
  (e: 'engineReady', engine: GameEngine): void
}>()

const wrapperRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let engine: GameEngine | null = null
let renderer: GameRenderer | null = null
let resizeObserver: ResizeObserver | null = null

function updateCanvasRect() {
  if (!canvasRef.value || !wrapperRef.value || !engine) return
  const rect = canvasRef.value.getBoundingClientRect()
  const scale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT)
  engine.setCanvasRect({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scale,
  })
}

function setupInput() {
  if (!engine || !canvasRef.value) return
  const onKeyDown = (e: KeyboardEvent) => {
    if (
      e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
      e.code === 'KeyA' || e.code === 'KeyD' ||
      e.code === 'Space' || e.code === 'KeyP' || e.code === 'Escape'
    ) {
      e.preventDefault()
    }
    engine!.keyDown(e.code)
  }
  const onKeyUp = (e: KeyboardEvent) => engine!.keyUp(e.code)
  const onMouseMove = (e: MouseEvent) => engine!.mouseMove(e.clientX)
  const onMouseDown = (e: MouseEvent) => {
    updateCanvasRect()
    engine!.handleClick(e.clientX)
  }
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      e.preventDefault()
      engine!.touchMove(e.touches[0].clientX)
    }
  }
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      updateCanvasRect()
      engine!.handleClick(e.touches[0].clientX)
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvasRef.value.addEventListener('mousemove', onMouseMove)
  canvasRef.value.addEventListener('mousedown', onMouseDown)
  canvasRef.value.addEventListener('touchmove', onTouchMove, { passive: false })
  canvasRef.value.addEventListener('touchstart', onTouchStart)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvasRef.value!.removeEventListener('mousemove', onMouseMove)
    canvasRef.value!.removeEventListener('mousedown', onMouseDown)
    canvasRef.value!.removeEventListener('touchmove', onTouchMove)
    canvasRef.value!.removeEventListener('touchstart', onTouchStart)
  }
}

let cleanupInput: (() => void) | null = null

onMounted(() => {
  if (!canvasRef.value) return
  const level = props.mode === 'campaign' ? (props.levelId ?? 1) : 1
  engine = new GameEngine(props.mode, level)
  renderer = new GameRenderer(canvasRef.value, engine)
  renderer.setShowCenterMarker(props.showCenterMarker ?? true)

  const unsub = engine.on((ev) => emit('event', ev))

  cleanupInput = setupInput()

  const resize = () => {
    renderer!.resize()
    updateCanvasRect()
  }
  resize()
  resizeObserver = new ResizeObserver(resize)
  if (wrapperRef.value) resizeObserver.observe(wrapperRef.value)
  window.addEventListener('resize', resize)

  renderer.start()
  engine.start()

  updateCanvasRect()
  emit('engineReady', engine)

  onBeforeUnmount(() => {
    unsub()
    if (cleanupInput) cleanupInput()
    if (resizeObserver) resizeObserver.disconnect()
    window.removeEventListener('resize', resize)
    if (renderer) renderer.stop()
    if (engine) engine.stop()
    engine = null
    renderer = null
  })
})

watch(() => props.showCenterMarker, (v) => {
  if (renderer) renderer.setShowCenterMarker(v ?? true)
})

defineExpose({
  getEngine: () => engine,
})
</script>

<style scoped>
.game-canvas-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(ellipse at center, #0f1030 0%, #05050f 100%);
  overflow: hidden;
}

.game-canvas {
  display: block;
  border-radius: 8px;
  box-shadow: 0 0 60px rgba(80, 150, 255, 0.35), 0 0 0 1px rgba(120, 180, 255, 0.2);
  cursor: none;
  touch-action: none;
  user-select: none;
}
</style>
