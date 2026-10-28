/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[10px] border border-[#5A6B82]/25 bg-white px-3.5 py-2 text-sm text-[#002B5E] placeholder:text-[#5A6B82] focus-visible:outline-none focus-visible:border-[#0066FF] focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
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
