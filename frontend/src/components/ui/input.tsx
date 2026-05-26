import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-emerald-600 selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 placeholder:text-slate-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-slate-800",
        "focus-visible:border-emerald-600 focus-visible:ring-[3px] focus-visible:ring-emerald-600/20",
        "aria-invalid:border-red-600 aria-invalid:ring-red-600/20 dark:aria-invalid:ring-red-600/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
