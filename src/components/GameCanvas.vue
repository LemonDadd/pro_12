<template>
  <div class="game-canvas-wrapper" ref="wrapperRef">
    <canvas ref="canvasRef" class="game-canvas" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { GameEngine } from '@/game/GameEngine'
import { GameRenderer } from '@/game/GameRenderer'
import { bindGameInput } from '@/game/input'
import type { EngineEvent } from '@/game/GameEngine'

const props = defineProps<{
  mode: 'campaign' | 'endless'
  levelId?: number
  showCenterMarker?: boolean
  mouseControl?: boolean
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
let cleanupInput: (() => void) | null = null

function updateCanvasRect() {
  if (!canvasRef.value || !wrapperRef.value || !engine) return
  const rect = canvasRef.value.getBoundingClientRect()
  engine.setCanvasRect({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scale: 1,
  })
}

onMounted(() => {
  if (!canvasRef.value) return
  const level = props.mode === 'campaign' ? (props.levelId ?? 1) : 1
  engine = new GameEngine(props.mode, level)
  renderer = new GameRenderer(canvasRef.value, engine)
  renderer.setShowCenterMarker(props.showCenterMarker ?? true)

  const unsub = engine.on((ev) => emit('event', ev))

  cleanupInput = bindGameInput(engine, canvasRef.value, {
    mouseControl: props.mouseControl ?? true,
  })

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
