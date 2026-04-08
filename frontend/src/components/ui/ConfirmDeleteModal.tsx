import { AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
}

export default function ConfirmDeleteModal({ isOpen, onConfirm, onCancel, itemName }: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-delete-icon">
          <AlertTriangle size={28} />
        </div>
        <h2 className="confirm-delete-title">Delete {itemName}?</h2>
        <p className="confirm-delete-body">
          Are you sure you want to delete <strong>{itemName}</strong>?
          This action cannot be undone.
        </p>
        <div className="confirm-delete-actions">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
