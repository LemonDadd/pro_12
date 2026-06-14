<template>
  <div class="game-page">
    <div class="hud-top">
      <div class="hud-left">
        <button class="icon-btn" @click="goBack" title="返回">
          ←
        </button>
        <div class="hud-item">
          <span class="hud-label">关卡</span>
          <span class="hud-value">
            {{ isEndless ? `无尽 #${wave}` : String(levelId).padStart(2, '0') }}
          </span>
        </div>
      </div>
      <div class="hud-center">
        <div class="hud-item score">
          <span class="hud-label">得分</span>
          <span class="hud-value">{{ score.toLocaleString() }}</span>
        </div>
        <div class="combo-badge" v-if="combo.count > 1">
          ×{{ combo.multiplier }} Combo
        </div>
      </div>
      <div class="hud-right">
        <div class="hud-item lives">
          <span class="hud-label">生命</span>
          <span class="hud-value">
            <span v-for="i in maxLives" :key="i" class="heart" :class="{ filled: i <= lives }">♥</span>
          </span>
        </div>
        <button class="icon-btn" @click="togglePause" title="暂停">
          {{ status === 'paused' ? '▶' : '❚❚' }}
        </button>
      </div>
    </div>

    <div class="canvas-container">
      <GameCanvas
        ref="gameCanvasRef"
        :mode="isEndless ? 'endless' : 'campaign'"
        :level-id="levelId"
        :show-center-marker="showCenter"
        @event="onGameEvent"
        @engine-ready="onEngineReady"
      />

      <div v-if="showReadyHint && status === 'ready'" class="ready-hint">
        <span class="arrow">⇧</span>
        <span class="hint-text">点击或按 Space 发射</span>
        <span class="arrow">⇧</span>
      </div>

      <div class="balls-counter" v-if="ballsCount > 1">
        {{ ballsCount }} 球同屏
      </div>

      <div class="modal-overlay" v-if="showModal">
        <div class="modal">
          <template v-if="status === 'paused'">
            <h3>已暂停</h3>
            <p>按 P 或 Esc 继续</p>
            <div class="modal-buttons">
              <button class="btn btn-primary" @click="togglePause">继续游戏</button>
              <button class="btn btn-ghost" @click="restartGame">重新开始</button>
              <button class="btn btn-ghost" @click="goBack">返回菜单</button>
            </div>
          </template>

          <template v-else-if="status === 'levelComplete'">
            <h3>
              <span v-if="isEndless">第 {{ wave }} 波完成!</span>
              <span v-else>过关!</span>
            </h3>
            <div class="stars-display">
              <span v-for="s in 3" :key="s" class="big-star" :class="{ filled: s <= resultStars }">★</span>
            </div>
            <div class="result-score">得分 {{ score.toLocaleString() }}</div>
            <div class="result-info" v-if="!isEndless">
              目标 {{ parScore.toLocaleString() }} · 剩余生命 ×{{ lives }}
            </div>
            <div class="result-info" v-if="isEndless">
              即将进入第 {{ wave + 1 }} 波
            </div>
            <div class="modal-buttons">
              <button class="btn btn-primary" v-if="!isEndless && levelId < 30" @click="nextLevel">
                下一关 →
              </button>
              <button class="btn btn-primary" v-if="isEndless" @click="nextWave">
                下一波 →
              </button>
              <button class="btn btn-ghost" @click="restartGame">重玩本关</button>
              <button class="btn btn-ghost" @click="goBack">返回菜单</button>
            </div>
          </template>

          <template v-else-if="status === 'lost'">
            <h3 class="gameover-title">游戏结束</h3>
            <div class="result-score">最终得分 {{ score.toLocaleString() }}</div>
            <div class="result-info" v-if="isEndless">到达第 {{ wave }} 波</div>
            <div class="result-info" v-if="isEndless && score >= endlessHigh">
              <span class="high-tag">🏆 新纪录!</span>
            </div>
            <div class="modal-buttons">
              <button class="btn btn-primary" @click="restartGame">再来一次</button>
              <button class="btn btn-ghost" @click="goBack">返回菜单</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GameCanvas from '@/components/GameCanvas.vue'
import type { GameEngine, EngineEvent } from '@/game/GameEngine'
import type { GameStatus } from '@/types/game'
import {
  loadSave, recordEndlessScore, recordLevelResult,
} from '@/utils/storage'
import { DEFAULT_LIVES } from '@/config/constants'
import { audioManager } from '@/utils/audio'

const route = useRoute()
const router = useRouter()

const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const engine = ref<GameEngine | null>(null)

const isEndless = computed(() => (route.params as any).endless === true || route.path === '/play/endless')
const levelId = computed(() => {
  if (isEndless.value) return 1
  const id = parseInt((route.params as any).id || '1', 10)
  return isNaN(id) ? 1 : Math.max(1, Math.min(30, id))
})

const score = ref(0)
const lives = ref(DEFAULT_LIVES)
const status = ref<GameStatus>('ready')
const ballsCount = ref(1)
const wave = ref(1)
const resultStars = ref(0)
const parScore = ref(0)
const endlessHigh = ref(0)
const showCenter = ref(true)
const combo = ref({ multiplier: 1, count: 0 })
const showReadyHint = ref(true)
const maxLives = DEFAULT_LIVES

let hintTimer: number | null = null

onMounted(() => {
  const save = loadSave()
  showCenter.value = save.settings.showCenterMarker
  endlessHigh.value = save.endlessHighScore
  audioManager.setVolumes(save.settings.sfxVolume, save.settings.musicVolume)
  audioManager.startMusic()
  hintTimer = window.setTimeout(() => {
    showReadyHint.value = false
  }, 5000)
})

onBeforeUnmount(() => {
  if (hintTimer) clearTimeout(hintTimer)
  audioManager.stopMusic()
})

function onEngineReady(eng: GameEngine) {
  engine.value = eng
  score.value = eng.score
  lives.value = eng.lives
  status.value = eng.status
  ballsCount.value = eng.balls.length
  parScore.value = eng.levelConfig.parScore
  wave.value = isEndless.value ? eng.endlessWave : eng.levelId
}

function onGameEvent(ev: EngineEvent) {
  switch (ev.type) {
    case 'score':
      score.value = ev.value
      break
    case 'livesChange':
      lives.value = ev.value
      break
    case 'statusChange':
      status.value = ev.value
      break
    case 'ballsChange':
      ballsCount.value = ev.value
      break
    case 'combo':
      combo.value = { multiplier: ev.multiplier, count: ev.count }
      break
    case 'ballLaunched':
      showReadyHint.value = false
      break
    case 'levelComplete':
      resultStars.value = ev.data.stars
      if (engine.value) {
        if (isEndless.value) {
          wave.value = engine.value.endlessWave
        } else {
          recordLevelResult(engine.value.levelId, ev.data.score, ev.data.stars)
        }
      }
      break
    case 'gameOver':
      if (engine.value && isEndless.value) {
        const data = recordEndlessScore(ev.data.score)
        endlessHigh.value = data.endlessHighScore
      } else if (engine.value) {
        const stars = engine.value.getStars(ev.data.score, parScore.value, lives.value)
        recordLevelResult(engine.value.levelId, ev.data.score, stars)
      }
      break
  }
}

function togglePause() {
  if (!engine.value) return
  engine.value.togglePause()
}

function restartGame() {
  if (!engine.value) return
  engine.value.restart()
  score.value = 0
  lives.value = DEFAULT_LIVES
  resultStars.value = 0
  showReadyHint.value = true
  if (hintTimer) clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => {
    showReadyHint.value = false
  }, 5000)
}

function nextLevel() {
  if (!engine.value) return
  engine.value.nextLevel()
  wave.value = engine.value.levelId
  parScore.value = engine.value.levelConfig.parScore
  resultStars.value = 0
  showReadyHint.value = true
}

function nextWave() {
  if (!engine.value) return
  engine.value.nextEndlessWave()
  wave.value = engine.value.endlessWave
  parScore.value = engine.value.levelConfig.parScore
  resultStars.value = 0
  showReadyHint.value = true
}

const showModal = computed(() => {
  return status.value === 'paused' || status.value === 'levelComplete' || status.value === 'lost'
})

function goBack() {
  audioManager.stopMusic()
  router.push('/')
}
</script>

<style scoped>
.game-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at center, #0f1030 0%, #05050f 100%);
  color: #e6ecff;
  overflow: hidden;
}

.hud-top {
  padding: 10px 16px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  background: rgba(10, 12, 30, 0.8);
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
  z-index: 10;
}

.hud-left, .hud-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hud-right { justify-content: flex-end; }

.hud-center {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(150, 180, 255, 0.2);
  color: #cdd7ff;
  cursor: pointer;
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.hud-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.hud-label {
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(180, 200, 255, 0.55);
}

.hud-value {
  font-size: 18px;
  font-weight: 700;
  color: #cdd7ff;
  font-variant-numeric: tabular-nums;
}

.hud-item.score .hud-value { color: #6ee7b7; font-size: 22px; }

.heart {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.15);
  margin: 0 1px;
}

.heart.filled {
  color: #ff6b9d;
  text-shadow: 0 0 8px rgba(255, 107, 157, 0.7);
}

.combo-badge {
  padding: 4px 10px;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  color: #1a1003;
  font-weight: 800;
  border-radius: 999px;
  font-size: 12px;
  animation: pulse 0.5s ease;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.5);
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.ready-hint {
  position: absolute;
  bottom: 18%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  background: rgba(10, 20, 40, 0.7);
  border: 1px solid rgba(110, 231, 183, 0.4);
  border-radius: 999px;
  color: #a7f3d0;
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(6px);
  animation: bob 1.6s ease-in-out infinite;
  pointer-events: none;
  z-index: 5;
}

.arrow {
  font-size: 18px;
  animation: arrow-up 1.6s ease-in-out infinite;
  opacity: 0.8;
}

@keyframes bob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-4px); }
}

@keyframes arrow-up {
  0%, 100% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-5px); opacity: 1; }
}

.balls-counter {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  color: #6ee7b7;
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
  z-index: 5;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 8, 20, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal {
  background: linear-gradient(145deg, rgba(30, 40, 90, 0.95), rgba(15, 20, 50, 0.98));
  border: 1px solid rgba(110, 231, 183, 0.3);
  border-radius: 20px;
  padding: 36px 44px;
  text-align: center;
  max-width: 90%;
  width: 420px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
  animation: pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal h3 {
  margin: 0 0 16px;
  font-size: 28px;
  color: #6ee7b7;
  letter-spacing: 0.1em;
}

.modal h3.gameover-title {
  color: #ff6b9d;
}

.modal > p {
  color: rgba(180, 200, 255, 0.7);
  margin: 0 0 24px;
  font-size: 14px;
}

.stars-display {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 16px 0 20px;
}

.big-star {
  font-size: 44px;
  color: rgba(255, 255, 255, 0.12);
  transition: all 0.5s;
}

.big-star.filled {
  color: #fcd34d;
  text-shadow: 0 0 24px rgba(252, 211, 77, 0.8);
  animation: star-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes star-pop {
  0% { transform: scale(0.3); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.result-score {
  font-size: 26px;
  font-weight: 800;
  color: #6ee7b7;
  margin: 8px 0;
  font-variant-numeric: tabular-nums;
}

.result-info {
  font-size: 13px;
  color: rgba(180, 200, 255, 0.7);
  margin-bottom: 4px;
}

.high-tag {
  display: inline-block;
  color: #fbbf24;
  font-weight: 700;
  background: rgba(251, 191, 36, 0.15);
  padding: 4px 10px;
  border-radius: 8px;
}

.modal-buttons {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn {
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: transform 0.15s, box-shadow 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: white;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(16, 185, 129, 0.5);
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #cdd7ff;
  border: 1px solid rgba(150, 180, 255, 0.2);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>
