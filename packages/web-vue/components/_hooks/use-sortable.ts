import { nextTick, ref, unref } from 'vue';
import type { Ref } from 'vue';
import type Sortable from 'sortablejs';
import type { Options } from 'sortablejs';

export function useSortable(
  el: HTMLElement | Ref<HTMLElement>,
  options?: Options
) {
  const sortable = ref<Sortable>();

  function initSortable(show?: boolean) {
    nextTick(async () => {
      if (!el) return;

      if (show) {
        const Sortable = (await import('sortablejs')).default;
        sortable.value = Sortable.create(unref(el), {
          animation: 200,
          delay: 150,
          delayOnTouchOnly: true,
          ...options,
        });
      } else {
        sortable.value?.destroy();
      }
    });
  }

  return { sortable, initSortable };
}
