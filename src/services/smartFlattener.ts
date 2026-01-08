export interface FlattenedItem {
    path: string;
    value: string;
    type: string;
}

export interface FlattenResult {
    items: FlattenedItem[];
    stats: {
        originalSize: number;
        flattenedCount: number;
        compressionRatio: string;
    };
}

const MAX_VALUE_LENGTH = 100;

function truncateValue(value: string): string {
    return value.length > MAX_VALUE_LENGTH 
        ? value.substring(0, MAX_VALUE_LENGTH) + '...' 
        : value;
}

function createItem(path: string, value: string, type: string): FlattenedItem {
    return { path: path || 'root', value, type };
}

export function smartFlatten(
    data: unknown,
    parentKey: string = '',
    sep: string = '.'
): FlattenedItem[] {
    if (data === null) {
        return [createItem(parentKey, 'null', 'null')];
    }

    if (Array.isArray(data)) {
        return flattenArray(data, parentKey, sep);
    }

    if (typeof data === 'object') {
        return flattenObject(data as Record<string, unknown>, parentKey, sep);
    }

    return [createItem(parentKey, truncateValue(String(data)), typeof data)];
}

function flattenObject(
    obj: Record<string, unknown>,
    parentKey: string,
    sep: string
): FlattenedItem[] {
    const items: FlattenedItem[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const newKey = parentKey ? `${parentKey}${sep}${key}` : key;
        items.push(...smartFlatten(value, newKey, sep));
    }
    
    return items;
}

function flattenArray(
    arr: unknown[],
    parentKey: string,
    sep: string
): FlattenedItem[] {
    if (arr.length === 0) {
        return [createItem(parentKey, '[]', 'emptyArray')];
    }

    const items = smartFlatten(arr[0], `${parentKey}[0]`, sep);
    items.push(createItem(`${parentKey}._arrayLength`, String(arr.length), 'meta'));
    
    return items;
}

export function flattenWithStats(data: unknown): FlattenResult {
    const originalSize = JSON.stringify(data).length;
    const items = smartFlatten(data);
    const flattenedSize = JSON.stringify(items).length;

    return {
        items,
        stats: {
            originalSize,
            flattenedCount: items.length,
            compressionRatio: ((1 - flattenedSize / originalSize) * 100).toFixed(1) + '%'
        }
    };
}

export function groupByRoot(items: FlattenedItem[]): Record<string, FlattenedItem[]> {
    const groups: Record<string, FlattenedItem[]> = {};

    for (const item of items) {
        const rootKey = item.path.split('.')[0].split('[')[0];
        if (!groups[rootKey]) {
            groups[rootKey] = [];
        }
        groups[rootKey].push(item);
    }

    return groups;
}
