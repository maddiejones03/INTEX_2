import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
}

export default function ConfirmDeleteModal({ isOpen, onConfirm, onCancel, itemName }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal confirm-delete-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-heading"
      >
        <div className="confirm-delete-icon">
          <AlertTriangle size={28} aria-hidden />
        </div>
        <h2 id="confirm-delete-heading" className="confirm-delete-title">
          Delete {itemName}?
        </h2>
        <p className="confirm-delete-body">
          Are you sure you want to delete <strong>{itemName}</strong>?
          This action cannot be undone.
        </p>
        <div className="confirm-delete-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
