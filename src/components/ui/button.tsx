/* Button Component primitives - A component that displays a button - from shadcn/ui (exposes Button, buttonVariants) */
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[#216E75] text-white font-semibold rounded-[10px] hover:bg-[#1a585e] focus-visible:ring-2 focus-visible:ring-[#216E75] focus-visible:ring-offset-2 border-0',
        destructive:
          'bg-[#DC2626] text-white font-semibold rounded-[10px] hover:bg-[#B91C1C] focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 border-0',
        outline:
          'border border-[#D9D4C8] bg-transparent text-[#1C2331] font-medium rounded-[10px] hover:bg-[#F2F1ED] hover:text-[#1C2331] focus-visible:ring-2 focus-visible:ring-[#216E75] focus-visible:ring-offset-2',
        secondary:
          'border border-[#D9D4C8] bg-transparent text-[#1C2331] font-medium rounded-[10px] hover:bg-[#F2F1ED] hover:text-[#1C2331]',
        ghost: 'text-[#1C2331] hover:bg-[#F2F1ED] hover:text-[#1C2331] rounded-[10px]',
        link: 'text-[#216E75] font-semibold underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-9 rounded-[10px] px-3 text-xs',
        lg: 'h-11 rounded-[10px] px-8 text-sm',
        icon: 'h-10 w-10 rounded-[10px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
