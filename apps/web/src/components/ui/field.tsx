import type { ComponentProps, ReactNode } from 'react'

/**
 * The form controls, shared by the sponsorship dialog and the contact section.
 *
 * The border, radius and focus treatment are one decision about how a field
 * looks, so they live here rather than being retyped per form and slowly
 * diverging. A required field marks itself from the `required` prop, so the
 * asterisk and the validation can never disagree.
 */

const CONTROL =
  'border-edge focus:border-ink box-border w-full rounded-[14px] border-2 bg-white font-[inherit] text-base text-ink focus:outline-none'

const LABEL =
  'text-muted inline-flex items-center gap-[5px] text-xs font-bold tracking-[0.1em] uppercase'

/** The label above a control. Exported for `<legend>`, which cannot use one. */
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <span className={LABEL}>
      {children}
      {required && (
        <span className="text-brand" aria-hidden="true">
          *
        </span>
      )}
    </span>
  )
}

export function TextField({
  label,
  className,
  ...rest
}: { label: string } & ComponentProps<'input'>) {
  return (
    <label className={`flex min-w-0 flex-col gap-[7px] ${className ?? ''}`}>
      <FieldLabel required={rest.required}>{label}</FieldLabel>
      <input className={`${CONTROL} min-h-[54px] px-4`} {...rest} />
    </label>
  )
}

export function TextArea({
  label,
  className,
  ...rest
}: { label: string } & ComponentProps<'textarea'>) {
  return (
    <label className={`flex min-w-0 flex-col gap-[7px] ${className ?? ''}`}>
      <FieldLabel required={rest.required}>{label}</FieldLabel>
      <textarea className={`${CONTROL} resize-y px-4 py-[14px] leading-[1.5]`} {...rest} />
    </label>
  )
}

export function SelectField({
  label,
  options,
  className,
  ...rest
}: { label: string; options: readonly string[] } & ComponentProps<'select'>) {
  return (
    <label className={`flex min-w-0 flex-col gap-[7px] ${className ?? ''}`}>
      <FieldLabel required={rest.required}>{label}</FieldLabel>
      <select className={`${CONTROL} min-h-[54px] cursor-pointer px-4`} {...rest}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Hidden from people, irresistible to bots. Anything that fills it in gets a
 * success response and goes nowhere.
 */
export function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute h-0 w-0 overflow-hidden opacity-0"
    />
  )
}
