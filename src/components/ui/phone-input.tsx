"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Common country codes for an education consultancy (UK-focused) */
const countryCodes = [
  { code: "44", label: "UK", flag: "🇬🇧" },
  { code: "852", label: "HK", flag: "🇭🇰" },
  { code: "86", label: "CN", flag: "🇨🇳" },
  { code: "886", label: "TW", flag: "🇹🇼" },
  { code: "65", label: "SG", flag: "🇸🇬" },
  { code: "60", label: "MY", flag: "🇲🇾" },
  { code: "66", label: "TH", flag: "🇹🇭" },
  { code: "81", label: "JP", flag: "🇯🇵" },
  { code: "82", label: "KR", flag: "🇰🇷" },
  { code: "91", label: "IN", flag: "🇮🇳" },
  { code: "971", label: "AE", flag: "🇦🇪" },
  { code: "1", label: "US", flag: "🇺🇸" },
  { code: "61", label: "AU", flag: "🇦🇺" },
  { code: "353", label: "IE", flag: "🇮🇪" },
  { code: "33", label: "FR", flag: "🇫🇷" },
  { code: "49", label: "DE", flag: "🇩🇪" },
  { code: "34", label: "ES", flag: "🇪🇸" },
  { code: "39", label: "IT", flag: "🇮🇹" },
  { code: "7", label: "RU", flag: "🇷🇺" },
  { code: "234", label: "NG", flag: "🇳🇬" },
]

/** Parse stored phone value like "+44 1234567890" into { countryCode, number } */
function parsePhone(value: string | null, fallbackCode: string = "44"): { countryCode: string; number: string } {
  if (!value) return { countryCode: fallbackCode, number: "" }

  const trimmed = value.trim()

  // Strip leading + if present
  const normalized = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed

  // Try matching known codes from longest to shortest
  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length)
  for (const cc of sorted) {
    // Match code followed by a space or directly by digits
    if (normalized.startsWith(cc.code + " ") || normalized.startsWith(cc.code + "\t")) {
      const rest = normalized.slice(cc.code.length).trim()
      return { countryCode: cc.code, number: rest }
    }
  }

  // If started with +, try to extract unknown code
  if (trimmed.startsWith("+")) {
    const match = normalized.match(/^(\d{1,3})\s*(.*)$/)
    if (match) return { countryCode: match[1], number: match[2] }
  }

  // No country code detected — return raw number with fallback code
  return { countryCode: fallbackCode, number: trimmed }
}

/** Combine country code + number into stored format */
function formatPhone(countryCode: string, number: string): string {
  const cleaned = number.trim()
  if (!cleaned) return ""
  return `+${countryCode} ${cleaned}`
}

type PhoneInputProps = {
  name: string
  defaultValue?: string | null
  defaultCountryCode?: string
  placeholder?: string
  className?: string
}

/**
 * Phone input with country code dropdown. Stores combined value like "+852 9123 4567".
 * Pass defaultCountryCode to set the fallback when no code is detected in the value.
 */
export function PhoneInput({
  name,
  defaultValue,
  defaultCountryCode = "44",
  placeholder = "Phone number",
  className = "",
}: PhoneInputProps) {
  const parsed = parsePhone(defaultValue ?? null, defaultCountryCode)
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const [number, setNumber] = useState(parsed.number)

  const combined = formatPhone(countryCode, number)

  return (
    <div className={`flex gap-1.5 ${className}`}>
      {/* Hidden input holds the combined value for form submission */}
      <input type="hidden" name={name} value={combined} />

      <Select value={countryCode} onValueChange={setCountryCode}>
        <SelectTrigger className="w-[110px] shrink-0 h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm">
          <SelectValue placeholder="Code">
            {(() => {
              const cc = countryCodes.find(c => c.code === countryCode)
              return cc ? `${cc.flag} (+${cc.code})` : `(+${countryCode})`
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-60">
          {countryCodes.map((cc) => (
            <SelectItem key={cc.code} value={cc.code}>
              {cc.flag} (+{cc.code}) {cc.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="tel"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder={placeholder}
        className="flex-1 h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
      />
    </div>
  )
}
