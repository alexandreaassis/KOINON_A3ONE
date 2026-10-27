/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center text-center leading-normal break-words rounded-[8px] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#1F6B94] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-[#1F6B94]/25 bg-[#1F6B94]/10 text-[#12314F]',
        secondary: 'border border-[#D5DCE5] bg-[#F1F4F8] text-[#12314F]',
        positive: 'border border-[#4E8B7E]/30 bg-[#4E8B7E]/15 text-[#12314F]',
        destructive: 'border border-red-200 bg-red-50 text-red-700',
        outline: 'border border-[#D5DCE5] bg-transparent text-[#12314F]',
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
