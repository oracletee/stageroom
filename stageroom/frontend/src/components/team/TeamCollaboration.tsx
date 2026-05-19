import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

export const TeamCollaboration: React.FC = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteStatus({ message: 'Please enter an email', type: 'error' });
      return;
    }

    setIsInviting(true);
    setInviteStatus(null);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const newMember: TeamMember = {
      id: `user-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteEmail('');
    setInviteRole('viewer');
    setInviteStatus({ message: 'Invitation sent!', type: 'success' });
    setIsInviting(false);
  };

  const handleRemoveMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Team</h2>
        <p className="text-sm text-gray-400">Invite team members to collaborate</p>
      </div>

      {inviteStatus && (
        <div className={`mb-4 p-3 rounded ${inviteStatus.type === 'success' ? 'bg-green-900/20 border border-green-500' : 'bg-red-900/20 border border-red-500'}`}>
          <p className={`text-sm ${inviteStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {inviteStatus.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email address"
            disabled={isInviting}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as TeamMember['role'])}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isInviting}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={isInviting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition disabled:opacity-50"
          >
            {isInviting ? 'Sending...' : 'Invite'}
          </button>
        </div>
      </form>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          Members ({teamMembers.length})
        </h3>
        {teamMembers.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-4">No team members yet</p>
        ) : (
          <div className="space-y-2">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    member.role === 'owner' ? 'bg-red-500/20 text-red-400' :
                    member.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                    member.role === 'editor' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {member.role}
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-gray-500 hover:text-red-400 text-sm"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
