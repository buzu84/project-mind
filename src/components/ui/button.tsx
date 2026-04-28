import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400",
  ghost: "text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, className = "", children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
);

Button.displayName = "Button";

