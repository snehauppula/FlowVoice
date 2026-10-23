import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary-strong text-primary-foreground shadow-card hover:bg-primary-hover",
        accent: "bg-primary-strong text-primary-foreground shadow-card hover:bg-primary-hover",
        outline: "border border-border-strong bg-surface hover:bg-primary-soft",
        ghost: "hover:bg-primary-soft",
      },
      size: { md: "h-10 px-5 text-sm", lg: "h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}
