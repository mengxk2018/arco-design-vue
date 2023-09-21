import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  PropType,
  ref,
  toRef,
  watch,
} from 'vue';
import Space from '../space';
import Popover from '../popover';
import Tooltip from '../tooltip';
import Button from '../button';
import Checkbox from '../checkbox';
import { getPrefixCls } from '../_utils/global-config';
import { isBoolean, isFunction, isUndefined } from '../_utils/is';
import { TableContext, tableInjectionKey } from './context';
import { TableColumnData } from './interface';
import { useFullscreen } from '../_hooks/use-fullscreen';
import { useSortable } from '../_hooks/use-sortable';
import type { SettingProps, StoreColumnData } from './hooks/use-toolbar';

export default defineComponent({
  name: 'TableToolbar',
  props: {
    id: {
      type: String,
    },
    title: {
      type: String,
    },
    refresh: {
      type: Function as PropType<(...args: any[]) => any>,
    },
    fullscreen: {
      type: Boolean,
      default: true,
    },
    setting: {
      type: [Boolean, Object] as PropType<boolean | SettingProps>,
      default: true,
    },
    small: {
      type: Boolean,
      default: true,
    },
    simple: {
      type: Boolean,
      default: true,
    },
    columns: {
      type: Array as PropType<TableColumnData[]>,
      required: true,
    },
    hasGroup: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    /**
     * @zh 列设置改变时触发
     * @en Triggered when column setting changed
     * @param {any} data
     * @param {boolean} changed
     * @version 2.46.0
     */
    change: (data: any, changed: boolean) => true,
  },
  setup(props, { emit, slots }) {
    const instance = getCurrentInstance();

    const STORE_KEY = 'table-setting';

    const prefixCls = getPrefixCls('table');

    const tableCtx = inject<Partial<TableContext>>(tableInjectionKey, {});

    const tableRef = toRef(tableCtx, 'tableRef');

    const { isFullscreen, enter, exit } = useFullscreen(tableRef);

    const isSortable = computed(() => {
      if (props.hasGroup) {
        return false;
      }
      if (isBoolean(props.setting)) {
        return props.setting;
      }
      return props.setting.sortable;
    });

    const isFixable = computed(() => {
      if (isBoolean(props.setting)) {
        return props.setting;
      }
      return props.setting.fixable;
    });

    const originTitles = computed(() => {
      return props.columns.map((item, index) => item.path as string);
    });

    const storeColumns = computed(() => {
      const id = originTitles.value
        .map((item) => item.split('/')[0])
        .toString();
      const key = props.id || props.title || id;
      const settingStore = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      const store = settingStore[key] || [];
      return store as StoreColumnData[];
    });

    const hasStore = computed(() => {
      return storeColumns.value.length > 0;
    });

    const storeSelected = computed(() => {
      return storeColumns.value
        .filter((item) => item.checked)
        .map((item) => item.title);
    });

    const storeSorted = computed(() => {
      return [...storeColumns.value]
        .sort((a, b) => a.sort - b.sort)
        .map((item) => item.title);
    });

    const storeLeftFixed = computed(() => {
      return storeColumns.value
        .filter((item) => item.fixed === 'left')
        .map((item) => item.title);
    });

    const storeRightFixed = computed(() => {
      return storeColumns.value
        .filter((item) => item.fixed === 'right')
        .map((item) => item.title);
    });

    const originColumns = computed(() => {
      return props.columns.map((item, index) => {
        return { ...item, title: originTitles.value[index], raw: item };
      });
    });

    const originKeys = computed(() => {
      return originColumns.value.map((item) => item.title) || [];
    });

    const originLeftFixed = computed(() => {
      return originColumns.value
        .filter((item) => item.raw.fixed === 'left')
        .map((item) => item.title);
    });

    const originRightFixed = computed(() => {
      return originColumns.value
        .filter((item) => item.raw.fixed === 'right')
        .map((item) => item.title);
    });

    const selectedKeys = ref<string[]>(
      [...originKeys.value].filter((k) =>
        storeSelected.value.length > 0 ? storeSelected.value.includes(k) : true
      )
    );

    const sortedKey = ref<string[]>(
      hasStore.value ? [...storeSorted.value] : [...originKeys.value]
    );

    const leftKeys = ref<string[]>(
      hasStore.value ? [...storeLeftFixed.value] : [...originLeftFixed.value]
    );

    const rightKeys = ref<string[]>(
      hasStore.value ? [...storeRightFixed.value] : [...originRightFixed.value]
    );

    const formatFixed = function (title: string): any {
      let fixed;

      if (leftKeys.value.includes(title)) {
        fixed = 'left';
      }
      if (rightKeys.value.includes(title)) {
        fixed = 'right';
      }

      return fixed;
    };

    const isCheckedAll = computed(() => {
      return originKeys.value.length === selectedKeys.value.length;
    });

    const isIndeterminate = computed(() => {
      const selectedLength = selectedKeys.value.length;
      const originLength = originKeys.value.length;
      return selectedLength > 0 && selectedLength !== originLength;
    });

    const settingColumns = computed(() => {
      return originColumns.value
        .map((item) => {
          return {
            ...item,
            fixed: formatFixed(item.title),
            checked: selectedKeys.value.includes(item.title),
            sort: sortedKey.value.findIndex((key) => item.title === key),
          };
        })
        .sort((a, b) => a.sort - b.sort);
    });

    watch(
      settingColumns,
      (value, old) => {
        const changed = Boolean(old?.length);
        if (changed) updateStore(value);
        emit('change', value, changed);
      },
      { immediate: true }
    );

    const updateStore = async function (value: any[]) {
      const items = originColumns.value.map((item) => {
        const { title, checked, sort, fixed } = value.find(
          (v) => v.title === item.title
        );
        return { title, checked, sort, fixed };
      });
      const id = items.map((item) => item.title.split('/')[0]).toString();

      // const { createHash } = await import('crypto');
      // (createHash && createHash('md5').update(id).digest('hex'));

      const key = props.id || props.title || id;

      const settingStore = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      settingStore[key] = items;
      localStorage.setItem(STORE_KEY, JSON.stringify(settingStore));
    };

    const settingList = ref();

    const { initSortable } = useSortable(settingList, {
      onEnd(event) {
        const { oldIndex, newIndex } = event;

        if (
          isUndefined(oldIndex) ||
          isUndefined(newIndex) ||
          oldIndex === newIndex
        )
          return;

        const lastKeys = [...sortedKey.value];

        if (newIndex > oldIndex) {
          lastKeys.splice(newIndex + 1, 0, lastKeys[oldIndex]);
          lastKeys.splice(oldIndex, 1);
        } else {
          lastKeys.splice(newIndex, 0, lastKeys[oldIndex]);
          lastKeys.splice(oldIndex + 1, 1);
        }

        sortedKey.value = lastKeys;
      },
    });

    const onSelectAll = function (checked: any) {
      if (checked) {
        selectedKeys.value = [...originKeys.value];
      } else {
        selectedKeys.value = [];
      }
    };

    const onResetAll = function () {
      selectedKeys.value = [...originKeys.value];
      sortedKey.value = [...originKeys.value];
      leftKeys.value = [...originLeftFixed.value];
      rightKeys.value = [...originRightFixed.value];
    };

    const onChange = function (checked: any, item: string) {
      if (checked) {
        selectedKeys.value.push(item);
      } else {
        const index = selectedKeys.value.findIndex((key) => key === item);
        selectedKeys.value.splice(index, 1);
      }
    };

    const onFixLeft = function (item: string) {
      if (!selectedKeys.value.includes(item)) return;

      if (rightKeys.value.includes(item)) {
        const index = rightKeys.value.findIndex((key) => item === key);
        rightKeys.value.splice(index, 1);
      }

      if (leftKeys.value.includes(item)) {
        const index = leftKeys.value.findIndex((key) => item === key);
        leftKeys.value.splice(index, 1);
      } else {
        leftKeys.value.push(item);
      }
    };

    const onFixRight = function (item: string) {
      if (!selectedKeys.value.includes(item)) return;

      if (leftKeys.value.includes(item)) {
        const index = leftKeys.value.findIndex((key) => item === key);
        leftKeys.value.splice(index, 1);
      }

      if (rightKeys.value.includes(item)) {
        const index = rightKeys.value.findIndex((key) => item === key);
        rightKeys.value.splice(index, 1);
      } else {
        rightKeys.value.push(item);
      }
    };

    const renderSettingContent = function () {
      const settingItems = sortedKey.value.map((key) => {
        const item = originColumns.value.find(
          (column) => column.title === key
        ) as {
          title: string;
          dataIndex: string | undefined;
          raw: TableColumnData;
        };
        return (
          <div class={`${prefixCls}-setting-item`} key={item.title}>
            <div class={[`${prefixCls}-setting-item-left`]}>
              {isSortable.value && <icon-drag-dot-vertical />}
              <Checkbox
                modelValue={selectedKeys.value.includes(item.title)}
                onChange={(checked) => onChange(checked, item.title)}
              >
                {item.title}
              </Checkbox>
            </div>
            {isFixable.value && (
              <div
                class={[
                  `${prefixCls}-setting-item-right`,
                  { disabled: !selectedKeys.value.includes(item.title) },
                ]}
              >
                <Tooltip content="固定到左侧">
                  <icon-to-left
                    class={leftKeys.value.includes(item.title) ? 'fixed' : ''}
                    onClick={() => onFixLeft(item.title)}
                  />
                </Tooltip>
                <span class="separator"></span>
                <Tooltip content="固定到右侧">
                  <icon-to-right
                    class={rightKeys.value.includes(item.title) ? 'fixed' : ''}
                    onClick={() => onFixRight(item.title)}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        );
      });

      return (
        <div
          class={[
            `${prefixCls}-setting`,
            { small: props.small, sortable: isSortable.value },
          ]}
        >
          <div class={`${prefixCls}-setting-title`}>
            <Checkbox
              modelValue={isCheckedAll.value}
              indeterminate={isIndeterminate.value}
              onChange={onSelectAll}
            >
              列展示
            </Checkbox>
            <Button
              type="text"
              size={props.small ? 'mini' : 'small'}
              onClick={onResetAll}
            >
              重置
            </Button>
          </div>
          <div class={`${prefixCls}-setting-content`}>
            <div class={`${prefixCls}-setting-list`} ref={settingList}>
              {settingItems}
            </div>
          </div>
        </div>
      );
    };

    const renderSetting = function () {
      return (
        <Popover
          content-class={`${prefixCls}-setting-popover`}
          trigger="click"
          position="br"
          v-slots={{ content: renderSettingContent }}
          onPopupVisibleChange={(visible: boolean) =>
            isSortable.value && initSortable(visible)
          }
        >
          <Tooltip content="列设置">
            <icon-settings />
          </Tooltip>
        </Popover>
      );
    };

    const handleRefresh = function (e: Event) {
      if (isFunction(props.refresh)) {
        props.refresh(e);
      }
    };

    const renderRefresh = function () {
      return (
        <Tooltip content="刷新">
          <icon-refresh onClick={handleRefresh} />
        </Tooltip>
      );
    };

    const renderFullscreen = function () {
      return (
        <Tooltip content="全屏">
          {isFullscreen.value ? (
            <icon-fullscreen-exit onClick={exit} />
          ) : (
            <icon-fullscreen onClick={enter} />
          )}
        </Tooltip>
      );
    };

    const renderRight = function () {
      return (
        <Space size={10}>
          {props.refresh && renderRefresh()}
          {props.setting && renderSetting()}
          {props.fullscreen && renderFullscreen()}
        </Space>
      );
    };

    const render = function () {
      if (props.title || props.refresh || props.setting || props.fullscreen) {
        return (
          <div class={`${prefixCls}-toolbar`}>
            <div class={`${prefixCls}-toolbar-container`}>
              <div class={`${prefixCls}-toolbar-left`}>
                {slots.left?.() ?? props.title}
              </div>
              <div class={`${prefixCls}-toolbar-right`}>
                {slots.right?.() ?? renderRight()}
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

    return render;
  },
});
