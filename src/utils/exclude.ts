export function exclude<T extends Record<string, any>, Key extends keyof T>(
    obj: T,
    keys: Key[]
): Omit<T, Key> {
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key as Key))
    ) as Omit<T, Key>;
}
