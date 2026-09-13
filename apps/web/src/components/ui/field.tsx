import * as RadixSelect from '@radix-ui/react-select'
import { useId } from 'react'
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

/**
 * A select that matches the rest of the form.
 *
 * A native `<select>` draws its own control and its own option list, both of
 * which the browser owns and none of which look like anything else here. Radix
 * gives back the markup while keeping the keyboard behaviour, the typeahead and
 * the ARIA wiring, and still renders a hidden native select under `name`, so
 * this posts through a plain form action exactly like the inputs above.
 */
export function SelectField({
  label,
  options,
  name,
  required,
  defaultValue,
  className,
}: {
  label: string
  options: readonly string[]
  name: string
  required?: boolean
  defaultValue?: string
  className?: string
}) {
  const id = useId()

  return (
    <div className={`flex min-w-0 flex-col gap-[7px] ${className ?? ''}`}>
      <span id={`${id}-label`}>
        <FieldLabel required={required}>{label}</FieldLabel>
      </span>

      <RadixSelect.Root name={name} required={required} defaultValue={defaultValue}>
        {/* Labelled by both, so a screen reader reads the field name and its value. */}
        <RadixSelect.Trigger
          id={id}
          aria-labelledby={`${id}-label ${id}`}
          className={`${CONTROL} data-[state=open]:border-ink flex min-h-[54px] cursor-pointer items-center justify-between gap-3 px-4 text-left`}
        >
          <RadixSelect.Value />
          <RadixSelect.Icon className="text-muted flex-none">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3.5 6L8 10.5L12.5 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          {/* Above the dialog, which sits at z-60. */}
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="border-edge z-70 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] border-2 bg-white shadow-[0_18px_44px_rgba(17,16,16,0.18)]"
          >
            <RadixSelect.Viewport className="p-1.5">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option}
                  value={option}
                  className="text-ink data-[highlighted]:bg-surface data-[state=checked]:text-brand flex min-h-[46px] cursor-pointer items-center justify-between gap-3 rounded-[10px] px-[13px] text-[15px] outline-none select-none data-[state=checked]:font-bold"
                >
                  <RadixSelect.ItemText>{option}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="flex-none">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 8.5L6 12L13.5 4"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
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
