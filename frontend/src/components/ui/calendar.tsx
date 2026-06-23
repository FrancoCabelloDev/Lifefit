'use client'

import * as React from 'react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = DayPickerProps

function Calendar({ className, classNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn('p-3 w-fit mx-auto relative', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'relative',
        month_caption: 'flex items-center justify-center w-full py-1 mb-2',
        caption_label: 'text-sm font-semibold text-slate-800',
        nav: 'absolute inset-x-0 top-0 flex justify-between items-center',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex mt-1',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-emerald-50 [&:has([aria-selected])]:rounded-xl',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 p-0 font-normal aria-selected:opacity-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors',
        ),
        selected:
          'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white focus:bg-emerald-600 focus:text-white rounded-xl',
        today: 'bg-slate-100 text-slate-900 font-semibold rounded-xl',
        outside: 'text-slate-300 opacity-30',
        disabled: 'text-slate-300 opacity-30 cursor-not-allowed',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left'
            ? <ChevronLeft className="size-4" />
            : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'

export { Calendar }
