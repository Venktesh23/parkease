import { useEffect, useRef } from 'react'

export default function ConfirmModal({
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  busy = false
}) {
  const cancelBtnRef = useRef(null)

  useEffect(() => {
    cancelBtnRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onCancel, busy])

  const confirmClass = `btn btn-${confirmVariant === 'primary' ? 'primary' : 'danger'}`

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => !busy && onCancel?.()}
    >
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title" id="confirm-modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            ref={cancelBtnRef}
            className="btn btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button className={confirmClass} onClick={onConfirm} disabled={busy}>
            {busy ? <><span className="spinner spinner-sm spinner-on-primary" /> Working...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
