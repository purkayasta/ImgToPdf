interface ButtonProps {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  loading?: boolean
}

export default function Button(props: ButtonProps) {
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} class={`control ${props.variant === 'primary' ? 'control-primary' : 'control-secondary'}`}>
      {props.loading && <svg aria-hidden="true" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
      {props.label}
    </button>
  )
}
