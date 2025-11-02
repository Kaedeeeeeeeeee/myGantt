import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationApi } from '../../api/invitations';
import { ProjectRole } from '../../types';
import { generateInvitationLink } from '../../utils/invitation';
import './InvitationModal.css';

interface InvitationModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('VIEWER');
  const [createdInvitation, setCreatedInvitation] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      invitationApi.create(projectId, {
        inviteeEmail,
        role,
      }),
    onSuccess: (invitation) => {
      setCreatedInvitation(invitation);
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeEmail.trim()) {
      return;
    }
    createMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (createdInvitation) {
      const link = generateInvitationLink(createdInvitation.token);
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateAnother = () => {
    setCreatedInvitation(null);
    setInviteeEmail('');
    setRole('VIEWER');
  };

  if (createdInvitation) {
    const invitationLink = generateInvitationLink(createdInvitation.token);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Invitation Created</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="invitation-success">
            <p>Invitation link has been created for <strong>{createdInvitation.inviteeEmail}</strong></p>
            <div className="invitation-link-container">
              <input
                type="text"
                value={invitationLink}
                readOnly
                className="invitation-link-input"
              />
              <button
                onClick={handleCopyLink}
                className="copy-btn"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateAnother} className="btn-secondary">
                Create Another
              </button>
              <button onClick={onClose} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite to {projectName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="invitation-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as ProjectRole)}
            >
              <option value="VIEWER">Viewer (Read Only)</option>
              <option value="EDITOR">Editor (Can Edit)</option>
              <option value="ADMIN">Admin (Manage Members)</option>
            </select>
          </div>
          {createMutation.error && (
            <div className="error-message">
              {(createMutation.error as any).response?.data?.message || 'Failed to create invitation'}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !inviteeEmail.trim()}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

