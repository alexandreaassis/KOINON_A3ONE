/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center text-center leading-normal break-words rounded-[8px] px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-[#0066FF]/25 bg-[#0066FF]/10 text-[#002B5E]',
        secondary: 'border border-[#5A6B82]/25 bg-[#F3F7FC] text-[#002B5E]',
        positive: 'border border-[#0066FF]/30 bg-[#0066FF]/12 text-[#002B5E]',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border border-[#5A6B82]/25 bg-transparent text-[#002B5E]',
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
