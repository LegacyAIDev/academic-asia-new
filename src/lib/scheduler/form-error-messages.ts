import type { FieldErrors, FieldValues } from 'react-hook-form'

/**
 * Every validation message in a react-hook-form error tree, once each, in form
 * order. The booking dialog lists them beside Save, so a rule on a field that
 * shows no message of its own can no longer block saving silently (UAT DEV24-003).
 */
export function formErrorMessages<T extends FieldValues>(errors: FieldErrors<T>): string[] {
  const messages: string[] = []
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const { message } = node as { message?: unknown }
    if (typeof message === 'string' && message && !messages.includes(message)) messages.push(message)
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'ref' && key !== 'message' && key !== 'type' && key !== 'types') walk(child)
    }
  }
  walk(errors)
  return messages
}
