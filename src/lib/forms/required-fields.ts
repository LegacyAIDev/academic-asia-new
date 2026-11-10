/**
 * "At least one of these must be filled" rules for record forms, checked in
 * the server actions so an untouched form cannot save an empty record (found
 * in the app-wide form sweep; UAT DEV24-010 was one case of it).
 */

export type RequiredRule<T> = { anyOf: (keyof T)[]; message: string }

const isFilled = (value: unknown) =>
  value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')

/**
 * The message of the first rule the input breaks, or null when it passes.
 * Used when a record is created: existing records (some imported ones lack
 * these fields) stay editable.
 */
export function missingRequired<T extends object>(input: Partial<T>, rules: RequiredRule<T>[]): string | null {
  for (const rule of rules) {
    if (!rule.anyOf.some(key => isFilled(input[key]))) return rule.message
  }
  return null
}
