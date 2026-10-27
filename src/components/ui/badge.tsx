/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center text-center leading-normal break-words rounded-[8px] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#216E75] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-[#216E75]/25 bg-[#216E75]/10 text-[#1C2331]',
        secondary: 'border border-[#D9D4C8] bg-[#F2F1ED] text-[#1C2331]',
        positive: 'border border-[#7D8F72]/30 bg-[#7D8F72]/15 text-[#1C2331]',
        destructive: 'border border-red-200 bg-red-50 text-red-700',
        outline: 'border border-[#D9D4C8] bg-transparent text-[#1C2331]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
