import { cn } from '@/lib/utils'
import { DollarIcon } from '@/components/icons'

interface LoaderProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Loader({ className, size = 'md' }: LoaderProps) {
  const sizeMap = {
    sm: 'size-8',
    md: 'size-16',
    lg: 'size-32',
    xl: 'size-48',
  }

  const iconSizeMap = {
    sm: 'size-6',
    md: 'size-12',
    lg: 'size-24',
    xl: 'size-36',
  }

  return (
    <div className={cn('flex items-center justify-center bg-transparent', className)}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custom-fade {
          0%, 100% { opacity: 0; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        .animate-custom-fade {
          animation: custom-fade 1.8s ease-in-out infinite;
        }
      `}} />
      <div className={cn('flex items-center justify-center animate-custom-fade', sizeMap[size])}>
        <DollarIcon className={cn('text-primary drop-shadow-2xl', iconSizeMap[size])} />
      </div>
    </div>
  )
}
