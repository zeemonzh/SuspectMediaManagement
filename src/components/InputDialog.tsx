import React, { useState } from 'react'
import Modal from './Modal'

interface InputDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (value: string) => void
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  submitText?: string
  cancelText?: string
  type?: 'text' | 'email' | 'password'
  validation?: (value: string) => string | undefined
}

const InputDialog: React.FC<InputDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  submitText = 'Submit',
  cancelText = 'Cancel',
  type = 'text',
  validation
}) => {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string>()

  const handleSubmit = () => {
    if (validation) {
      const validationError = validation(value)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    onSubmit(value)
    onClose()
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
        onClick={handleSubmit}
        className="btn-primary"
        disabled={!value.trim()}
      >
        {submitText}
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
      <div className="space-y-4">
        {message && (
          <p className="text-suspect-text">{message}</p>
        )}
        <div>
          <input
            type={type}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(undefined)
            }}
            placeholder={placeholder}
            className="input-field w-full"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-red-400 text-sm">{error}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default InputDialog 