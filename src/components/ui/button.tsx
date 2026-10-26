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
          'bg-[#E39A2B] text-[#1E1B18] font-semibold rounded-[10px] hover:bg-[#d48c20] focus-visible:ring-2 focus-visible:ring-[#E39A2B] focus-visible:ring-offset-2 border-0',
        destructive:
          'bg-[#C75B39] text-[#FFFDFA] font-semibold rounded-[10px] hover:bg-[#b24e2f] focus-visible:ring-2 focus-visible:ring-[#C75B39] focus-visible:ring-offset-2 border-0',
        outline:
          'border border-[#E8E1D6] bg-transparent text-[#1E1B18] font-medium rounded-[10px] hover:bg-[#F4EFE7]/60 hover:text-[#1E1B18] focus-visible:ring-2 focus-visible:ring-[#E39A2B] focus-visible:ring-offset-2',
        secondary:
          'border border-[#E8E1D6] bg-transparent text-[#1E1B18] font-medium rounded-[10px] hover:bg-[#F4EFE7]/60 hover:text-[#1E1B18]',
        ghost: 'text-[#1E1B18] hover:bg-[#F4EFE7]/70 hover:text-[#1E1B18] rounded-[10px]',
        link: 'text-[#E39A2B] font-semibold underline-offset-4 hover:underline p-0 h-auto',
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
