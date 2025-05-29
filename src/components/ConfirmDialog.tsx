import React from 'react'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info'
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const colorMap = {
    danger: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  }

  const bgColorMap = {
    danger: 'bg-red-500/10',
    warning: 'bg-yellow-500/10',
    info: 'bg-blue-500/10'
  }

  const buttonMap = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    info: 'btn-primary'
  }

  const footer = (
    <div className="flex justify-end space-x-3">
      <button
        onClick={onClose}
        className="btn-secondary"
      >
        {cancelText}
      </button>
      <button
        onClick={handleConfirm}
        className={`px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 ${buttonMap[type]}`}
      >
        {confirmText}
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
      <div className={`${bgColorMap[type]} rounded-lg p-4`}>
        <p className={`${colorMap[type]} font-medium mb-2`}>
          {type === 'danger' ? '⚠️ Warning' : type === 'warning' ? '⚠️ Attention' : 'ℹ️ Confirm'}
        </p>
        <p className="text-suspect-text">{message}</p>
      </div>
    </Modal>
  )
}

export default ConfirmDialog 