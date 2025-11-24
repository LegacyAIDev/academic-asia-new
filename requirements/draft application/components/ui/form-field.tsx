"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FormFieldProps {
  label: string
  id: string
  type?: "text" | "email" | "date" | "tel"
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function FormField({ label, id, type = "text", placeholder, value, onChange, className }: FormFieldProps) {
  return (
    <div className={`group ${className}`}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider group-hover:text-blue-600 transition-colors duration-200"
      >
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="bg-white/90 border-gray-200/60 focus:border-blue-400 focus:ring-blue-200 hover:border-gray-300 transition-all duration-200 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
      />
    </div>
  )
}

interface SelectFieldProps {
  label: string
  id: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}

export function SelectField({ label, id, placeholder, value, onChange, options, className }: SelectFieldProps) {
  return (
    <div className={`group ${className}`}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold text-gray-700 mb-2 block uppercase tracking-wider group-hover:text-blue-600 transition-colors duration-200"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white/90 border-gray-200/60 focus:border-blue-400 focus:ring-blue-200 hover:border-gray-300 transition-all duration-200 rounded-xl shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-gray-200/60 shadow-xl backdrop-blur-sm">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="rounded-lg hover:bg-blue-50 focus:bg-blue-50 transition-colors duration-200"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
