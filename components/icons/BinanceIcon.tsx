import { ComponentProps } from 'react'

export function BinanceIcon(props: ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M12 0l-3.328 3.328L12 6.656l3.328-3.328L12 0zM5.344 6.672L2.016 10l3.328 3.328L8.672 10 5.344 6.672zm13.312 0l-3.328 3.328 3.328 3.328L21.984 10l-3.328-3.328zM12 10l-3.328 3.328L12 16.656l3.328-3.328L12 10zm-6.656 6.672l-3.328 3.328L5.344 24l3.328-3.328-3.328-3.328zm13.312 0l-3.328 3.328 3.328 3.328L21.984 20l-3.328-3.328z" />
    </svg>
  )
}
