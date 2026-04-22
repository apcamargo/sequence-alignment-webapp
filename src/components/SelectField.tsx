import type { ComponentPropsWithoutRef } from "react";
import { fieldControlBaseClass, fieldShellClass } from "./formFieldStyles";

type SelectFieldProps = ComponentPropsWithoutRef<"select">;

const baseSelectClassName = `${fieldControlBaseClass} appearance-none cursor-pointer pl-3 pr-10`;

const baseIconContainerClassName =
  "pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-fg-secondary transition-colors group-focus-within:text-fg-primary";

const baseIconClassName = "h-4 w-4";

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

// Source: https://raw.githubusercontent.com/jaynewey/charm-icons/refs/heads/main/icons/chevron-down.svg
// License: MIT
function SelectChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="m3.75 5.75 4.25 4.5 4.25-4.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SelectField({
  children,
  className,
  disabled,
  multiple,
  size,
  ...props
}: SelectFieldProps) {
  const showChevron = !multiple && size === undefined;

  return (
    <div className="group relative w-full">
      <div
        className={joinClassNames(
          fieldShellClass,
          disabled && "opacity-60",
        )}
      >
        <select
          {...props}
          multiple={multiple}
          size={size}
          disabled={disabled}
          className={joinClassNames(
            baseSelectClassName,
            disabled && "cursor-not-allowed",
            className,
          )}
        >
          {children}
        </select>
        {showChevron && (
          <span
            aria-hidden="true"
            className={baseIconContainerClassName}
          >
            <SelectChevronIcon className={baseIconClassName} />
          </span>
        )}
      </div>
    </div>
  );
}
