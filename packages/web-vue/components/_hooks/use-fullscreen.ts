import type { Ref } from 'vue';
import { computed, onMounted, onUnmounted, ref, unref } from 'vue';

export function useFullscreen(
  el?: Ref<HTMLElement | undefined> | HTMLElement,
  options = {}
) {
  const target = computed(() => {
    return unref(el) ?? document.documentElement;
  });

  const isFullscreen = ref(document.fullscreenElement === target.value);

  async function exit() {
    if (!isFullscreen.value) return;
    await document.exitFullscreen();
    isFullscreen.value = false;
  }

  async function enter() {
    if (isFullscreen.value) return;
    await target.value.requestFullscreen();
    isFullscreen.value = true;
  }

  async function toggle() {
    await (isFullscreen.value ? exit() : enter());
  }

  const handleCallback = function () {
    isFullscreen.value = document.fullscreenElement === target.value;
  };

  document.addEventListener('fullscreenchange', handleCallback, false);

  onMounted(() => {
    target.value.addEventListener('fullscreenchange', handleCallback, false);
  });

  onUnmounted(() => {
    target.value.removeEventListener('fullscreenchange', handleCallback, false);
  });

  return {
    isFullscreen,
    enter,
    exit,
    toggle,
  };
}
