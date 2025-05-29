import React from 'react'
import Modal from './Modal'

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info'
}) => {
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  }

  const colorMap = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }

  const bgColorMap = {
    success: 'bg-green-500/10',
    error: 'bg-red-500/10',
    warning: 'bg-yellow-500/10',
    info: 'bg-blue-500/10'
  }

  const footer = (
    <div className="flex justify-end">
      <button
        onClick={onClose}
        className="btn-primary"
      >
        OK
      </button>
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      footer={footer}
    >
      <div className={`${bgColorMap[type]} rounded-lg p-4 flex items-start space-x-3`}>
        <div className={`${colorMap[type]} text-xl`}>
          {iconMap[type]}
        </div>
        <p className="text-suspect-text">{message}</p>
      </div>
    </Modal>
  )
}

export default AlertDialog 