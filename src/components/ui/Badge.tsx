import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badge = cva("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      hot:       "bg-red-100 text-red-700",
      warm:      "bg-amber-100 text-amber-700",
      cold:      "bg-gray-100 text-gray-600",
      new:       "bg-brand-50 text-brand-600",
      contacted: "bg-teal-50 text-teal-700",
      converted: "bg-green-100 text-green-700",
      lost:      "bg-gray-100 text-gray-500",
      live:      "bg-green-100 text-green-700",
      draft:     "bg-gray-100 text-gray-500",
      active:    "bg-green-100 text-green-700",
    },
  },
  defaultVariants: { variant: "new" },
});

interface Props extends VariantProps<typeof badge> { children: React.ReactNode; className?: string; }

export default function Badge({ variant, children, className }: Props) {
  return <span className={cn(badge({ variant }), className)}>{children}</span>;
}
