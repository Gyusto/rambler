import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-light transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rambler-turquoise/60",
  {
    variants: {
      variant: {
        solid:
          "bg-white text-rambler-indigo hover:-translate-y-px hover:shadow-lg hover:brightness-105",
        pink: "bg-rambler-pink text-white hover:-translate-y-px hover:shadow-lg hover:shadow-rambler-pink/30",
        outline:
          "border border-white/70 text-white hover:bg-white/10",
        ghost: "text-white/80 hover:text-white hover:bg-white/10",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "solid", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
