import { ComponentProps } from 'react'

/** Logo de Google (4 colores oficiales). Ignora `stroke`/`currentColor` a propósito. */
export function GoogleIcon(props: ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.124H3.064v2.59A9.996 9.996 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.405 13.9a5.99 5.99 0 0 1 0-3.8V7.51H3.064a10.01 10.01 0 0 0 0 8.98l3.341-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.96 2.99 14.695 2 12 2a9.996 9.996 0 0 0-8.936 5.51l3.341 2.59C7.19 7.736 9.395 5.977 12 5.977Z"
      />
    </svg>
  )
}
