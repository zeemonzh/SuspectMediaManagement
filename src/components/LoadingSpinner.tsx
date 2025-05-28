interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
  inline?: boolean
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  fullScreen = false,
  inline = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  }

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Animated Suspect Logo/Icon */}
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`${sizeClasses[size]} border-4 border-suspect-gray-700 border-t-suspect-primary rounded-full animate-spin`}></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-suspect-primary rounded-full animate-pulse"></div>
        </div>
        
        {/* Glowing effect */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-suspect-primary/30 rounded-full animate-ping`}></div>
      </div>
      
      {/* Loading text with typing effect */}
      <div className="flex items-center space-x-1">
        <span className="text-suspect-text font-medium animate-fade-in">
          {text}
        </span>
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-suspect-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-1 h-1 bg-suspect-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-1 h-1 bg-suspect-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  )

  // Simple inline loading for smaller spaces
  if (inline) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-suspect-gray-700 border-t-suspect-primary rounded-full animate-spin"></div>
        <span className="text-suspect-gray-400 text-sm">{text}</span>
      </div>
    )
  }

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-suspect-body flex items-center justify-center">
        <LoadingContent />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-8">
      <LoadingContent />
    </div>
  )
}

// Export a simple bouncing dots component for reuse
export function LoadingDots({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  return (
    <div className="flex space-x-1">
      <div className={`${dotSizes[size]} bg-suspect-primary rounded-full animate-bounce`} style={{animationDelay: '0ms'}}></div>
      <div className={`${dotSizes[size]} bg-suspect-primary rounded-full animate-bounce`} style={{animationDelay: '150ms'}}></div>
      <div className={`${dotSizes[size]} bg-suspect-primary rounded-full animate-bounce`} style={{animationDelay: '300ms'}}></div>
    </div>
  )
} 