export function withDefault<T>(value: T | undefined, defaultValue: T): T {
  return value !== undefined && value !== '' ? value : defaultValue
}

export function yesterday(): string {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  return date.toISOString()
}
