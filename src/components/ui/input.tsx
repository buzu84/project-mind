import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  ),
);

Input.displayName = "Input";

