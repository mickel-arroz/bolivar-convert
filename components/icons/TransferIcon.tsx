import { ComponentProps } from 'react'

export function TransferIcon(props: ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M20 10h-16l5.5 -6" />
      <path d="M4 14h16l-5.5 6" />
    </svg>
  )
}
