/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[10px] border border-[#E8E1D6] bg-[#FFFDFA] px-3.5 py-2 text-sm text-[#1E1B18] placeholder:text-[#6B6259] focus-visible:outline-none focus-visible:border-[#E39A2B] focus-visible:ring-2 focus-visible:ring-[#E39A2B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
