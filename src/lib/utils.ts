import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Whether a stored value is rich HTML (vs legacy plain text). */
export function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value)
}

/** Generate academic year options (+/- 3 years from today), default is current year + 1 */
export function getAcademicYearOptions() {
  const currentYear = new Date().getFullYear()
  const options = Array.from({ length: 7 }, (_, i) => {
    const y = currentYear - 3 + i
    return `${y}-${(y + 1).toString().slice(-2)}`
  })
  const defaultYear = `${currentYear + 1}-${(currentYear + 2).toString().slice(-2)}`
  return { options, defaultYear }
}
