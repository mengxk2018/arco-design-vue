import type { Ref } from 'vue';
import { nextTick, ref, unref } from 'vue';
import type { Options } from 'sortablejs';
import Sortable from 'sortablejs';

export function useSortable(
  el: HTMLElement | Ref<HTMLElement>,
  options?: Options
) {
  const sortable = ref<Sortable>();

  function initSortable(show?: boolean) {
    nextTick(async () => {
      if (!el) return;

      if (show) {
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
