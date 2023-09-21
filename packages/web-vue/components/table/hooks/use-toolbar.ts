import type { Ref, VNode } from 'vue';
import { computed, ref, watch } from 'vue';
import type { TableColumnData } from '../interface';
import { isBoolean, isFunction } from '../../_utils/is';
import { EmitFn2 } from '../../_utils/types';
import { getColumnTitle, getGroupColumns } from '../utils';

export interface SettingProps {
  sortable: boolean;
  fixable: boolean;
}

export interface ToolbarProps {
  id?: string;
  title?: string;
  refresh?: (...args: any[]) => any;
  fullscreen?: boolean;
  setting: boolean | SettingProps;
}

export interface StoreColumnData {
  title: string;
  checked: boolean;
  sort: number;
  fixed?: string;
}

export function deepClone(obj: any) {
  const result: any = Array.isArray(obj) ? [] : {};
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        result[key] = deepClone(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  }
  return obj;
}

export const useToolbar = ({
  toolbar,
  columns,
  dataColumns,
  groupColumns,
  dataColumnMap,
  emit,
}: {
  toolbar: Ref<ToolbarProps | boolean>;
  columns: Ref<TableColumnData[]>;
  dataColumns: Ref<TableColumnData[]>;
  groupColumns: Ref<TableColumnData[][]>;
  dataColumnMap: Map<string, TableColumnData>;
  emit: EmitFn2<{
    columnSetting: (
      data: any,
      currentColumn?: TableColumnData,
      ev?: Event
    ) => true;
  }>;
}) => {
  const toolbarProps = computed(() => {
    if (!toolbar.value) return undefined;
    return {
      setting: true,
      ...(isBoolean(toolbar.value) ? undefined : toolbar.value),
    } as ToolbarProps;
  });

  const rawColumns = computed(() => {
    return deepClone(columns.value) as TableColumnData[];
  });

  const hasGroup = computed(() => {
    const result = getGroupColumns(rawColumns.value, dataColumnMap);
    return result.groupColumns.length > 1;
  });

  const travelColumns = function (
    items: TableColumnData[],
    filtered: TableColumnData[],
    out: TableColumnData[],
    parentItem?: TableColumnData
  ) {
    if (parentItem && !parentItem.children) {
      parentItem.children = [];
    }
    for (const [index, item] of items.entries()) {
      if (item.children) {
        const { children, ...parent } = item;

        travelColumns(children, filtered, out, parent);

        if ((parent as any).children.length > 0) {
          if (parentItem) {
            parentItem.children?.push(parent);
          } else {
            out.push(parent);
          }
        }
      } else {
        const dataIndex = item.dataIndex || getColumnTitle(item, index);
        const matched = filtered.find((col) => col.dataIndex === dataIndex);

        if (matched) {
          const newItem = { ...item, ...matched };
          if (parentItem) {
            parentItem.children?.push(newItem);
          } else {
            out.push(newItem);
          }
        }
      }
    }
    return out;
  };

  const onSettingChange = function (data: any) {
    const columns = data
      .filter((item: any) => item.checked)
      .map((item: any) => ({ ...item.raw, fixed: item.fixed }));

    const newColumns = hasGroup.value
      ? travelColumns(rawColumns.value, columns, [])
      : columns;

    const result = getGroupColumns(newColumns, dataColumnMap);
    dataColumns.value = result.dataColumns;
    groupColumns.value = result.groupColumns;
  };

  const handleSetting = function (data: any, changed: boolean) {
    onSettingChange(data);
    if (changed) emit('columnSetting', data);
  };

  return {
    toolbarProps,
    rawColumns,
    hasGroup,
    handleSetting,
  };
};
