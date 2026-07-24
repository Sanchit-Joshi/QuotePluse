import Link from "next/link";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/**
 * This shadcn install uses Base UI (@base-ui/react), which has no `asChild`
 * prop — polymorphic composition uses `render` instead (see
 * memory/shadcn_base_ui_render_prop.md). This wrapper centralizes the
 * Button-as-Link pattern so call sites don't repeat the `render={<Link/>}`
 * boilerplate.
 */
export function LinkButton({
  href,
  children,
  variant,
  size,
  className,
}: {
  href: string;
  children: React.ReactNode;
} & VariantProps<typeof buttonVariants> & { className?: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      nativeButton={false}
      render={
        <Link href={href} className={className}>
          {children}
        </Link>
      }
    />
  );
}
