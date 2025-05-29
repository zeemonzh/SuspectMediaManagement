import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showCloseButton?: boolean
  footer?: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  footer
}) => {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl'
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"></div>

      {/* Modal panel */}
      <div 
        className={`relative w-full m-4 ${maxWidthClasses[maxWidth]} animate-in zoom-in-95 duration-300`}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-suspect-body rounded-lg shadow-xl border border-suspect-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-suspect-header px-6 pt-6 pb-4 border-b border-suspect-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-medium text-suspect-text">{title}</h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-suspect-gray-400 hover:text-suspect-text transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="bg-suspect-header px-6 py-4 border-t border-suspect-gray-700">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modal 