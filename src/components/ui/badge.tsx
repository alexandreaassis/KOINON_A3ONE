/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center text-center leading-normal break-words rounded-[8px] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#E39A2B] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-[#E39A2B]/20 bg-[#E39A2B]/15 text-[#1E1B18]',
        secondary: 'border border-[#E8E1D6] bg-[#F4EFE7] text-[#1E1B18]',
        destructive: 'border border-[#C75B39]/20 bg-[#C75B39]/15 text-[#C75B39]',
        outline: 'border border-[#E8E1D6] bg-transparent text-[#1E1B18]',
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
