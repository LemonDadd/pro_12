<template>
  <div class="page levels-page">
    <header class="page-header">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <h2>关卡选择</h2>
      <div class="spacer"></div>
    </header>

    <div class="levels-grid">
      <button
        v-for="n in 30"
        :key="n"
        class="level-tile"
        :class="{ locked: n > save.unlockedLevel, completed: !!save.starRatings[n] }"
        :disabled="n > save.unlockedLevel"
        @click="playLevel(n)"
      >
        <span class="level-num">{{ n }}</span>
        <div class="level-stars" v-if="save.starRatings[n]">
          <span v-for="s in 3" :key="s" :class="{ filled: s <= save.starRatings[n] }">★</span>
        </div>
        <span class="level-hs" v-if="save.highScores[n]">{{ save.highScores[n].toLocaleString() }}</span>
        <span class="lock-icon" v-else-if="n > save.unlockedLevel">🔒</span>
      </button>
    </div>

    <div class="level-legend">
      <div class="legend-item"><span class="dot dot-teal"></span>青=普通砖</div>
      <div class="legend-item"><span class="dot dot-orange"></span>橙=硬砖</div>
      <div class="legend-item"><span class="dot dot-gray"></span>灰=钢砖</div>
      <div class="legend-item"><span class="dot dot-red"></span>红=爆炸砖</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadSave } from '@/utils/storage'
import type { SaveData } from '@/types/game'
import { audioManager } from '@/utils/audio'

const router = useRouter()
const save = ref<SaveData>(loadSave())

onMounted(() => {
  save.value = loadSave()
})

function playLevel(n: number) {
  if (n > save.value.unlockedLevel) return
  audioManager.setVolumes(save.value.settings.sfxVolume, save.value.settings.musicVolume)
  audioManager.startMusic()
  router.push(`/play/campaign/${n}`)
}
</script>

<style scoped>
.levels-page {
  min-height: 100vh;
  padding: 28px 24px;
  background: radial-gradient(ellipse at top, #161640 0%, #05050f 70%);
  color: #e6ecff;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 900px;
  margin: 0 auto 28px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  letter-spacing: 0.1em;
}

.back-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #cdd7ff;
  border: 1px solid rgba(150, 180, 255, 0.2);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.spacer { flex: 1; }

.levels-grid {
  max-width: 900px;
  margin: 0 auto 32px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 14px;
}

.level-tile {
  aspect-ratio: 1 / 1;
  background: linear-gradient(145deg, rgba(30, 40, 90, 0.9), rgba(15, 20, 50, 0.9));
  border: 1px solid rgba(110, 231, 183, 0.3);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s;
  position: relative;
  font-family: inherit;
  color: inherit;
}

.level-tile:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
  border-color: rgba(110, 231, 183, 0.7);
}

.level-tile.completed {
  border-color: rgba(250, 204, 21, 0.6);
}

.level-tile.locked {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: rgba(100, 120, 180, 0.25);
}

.level-num {
  font-size: 26px;
  font-weight: 800;
  color: #6ee7b7;
}

.level-tile.completed .level-num { color: #fcd34d; }

.level-stars {
  display: flex;
  gap: 2px;
  font-size: 12px;
}

.level-stars span {
  color: rgba(255, 255, 255, 0.18);
}

.level-stars span.filled {
  color: #fcd34d;
  text-shadow: 0 0 8px rgba(252, 211, 77, 0.7);
}

.level-hs {
  font-size: 11px;
  color: rgba(180, 220, 255, 0.8);
}

.lock-icon {
  font-size: 20px;
  opacity: 0.6;
}

.level-legend {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  padding: 16px;
  background: rgba(20, 25, 60, 0.6);
  border: 1px solid rgba(120, 160, 255, 0.15);
  border-radius: 12px;
  font-size: 13px;
  color: rgba(200, 220, 255, 0.8);
}

.legend-item { display: flex; align-items: center; gap: 6px; }
.dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.dot-teal { background: #00e5ff; box-shadow: 0 0 8px #00e5ff; }
.dot-orange { background: #ff9800; box-shadow: 0 0 8px #ff9800; }
.dot-gray { background: #78909c; box-shadow: 0 0 8px #78909c; }
.dot-red { background: #ff1744; box-shadow: 0 0 8px #ff1744; }
</style>
