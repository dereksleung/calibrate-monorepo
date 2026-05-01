import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      display: "font-heading text-display-lg text-balance",
      headline: "font-heading text-headline-md text-balance",
      body: "font-sans text-body-md",
      bodyLg: "font-sans text-body-lg",
      label: "font-sans text-label-sm uppercase",
    },
    color: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      destructive: "text-destructive",

      // From your Tailwind v4 @theme tokens
      onBackground: "text-on-background",
      onError: "text-on-error",
      onErrorContainer: "text-on-error-container",
      onPrimary: "text-on-primary",
      onPrimaryContainer: "text-on-primary-container",
      onPrimaryFixed: "text-on-primary-fixed",
      onPrimaryFixedVariant: "text-on-primary-fixed-variant",
      onSecondary: "text-on-secondary",
      onSecondaryContainer: "text-on-secondary-container",
      onSecondaryFixed: "text-on-secondary-fixed",
      onSecondaryFixedVariant: "text-on-secondary-fixed-variant",
      onSurface: "text-on-surface",
      onSurfaceVariant: "text-on-surface-variant",
      onTertiary: "text-on-tertiary",
      onTertiaryContainer: "text-on-tertiary-container",
      onTertiaryFixed: "text-on-tertiary-fixed",
      onTertiaryFixedVariant: "text-on-tertiary-fixed-variant",

      // Related "on" semantic token from the inverse surface pair
      inverseOnSurface: "text-inverse-on-surface",

      inherit: "text-inherit",
    },
    size: {
      lg: "text-lg",
      md: "text-md",
      sm: "text-sm",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
  },
  defaultVariants: {
    variant: "body",
    color: "default",
  },
})

type TypographyOwnProps<TElement extends React.ElementType> =
  VariantProps<typeof typographyVariants> & {
    as?: TElement
    className?: string
  }

type TypographyProps<TElement extends React.ElementType> =
  TypographyOwnProps<TElement> &
    Omit<
      React.ComponentPropsWithoutRef<TElement>,
      keyof TypographyOwnProps<TElement> | "color"
    >

const Typography = <TElement extends React.ElementType = "p">({
  as,
  variant,
  size,
  weight,
  color,
  className,
  ...props
}: TypographyProps<TElement>) => {
  const Component = as ?? "p"

  return (
    <Component
      data-slot="typography"
      className={cn(typographyVariants({ variant, color, size, weight, className }))}
      {...props}
    />
  )
}

export { Typography, typographyVariants }
