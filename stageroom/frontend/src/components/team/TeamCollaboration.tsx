import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'away';
  avatarUrl?: string;
  lastSeen?: string; // ISO timestamp
}

interface TeamCollaborationProps {
  // In a real implementation, this would manage team collaboration
}

export const TeamCollaboration: React.FC<TeamCollaborationProps> = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 'user-1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      role: 'owner',
      status: 'online',
      avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=random',
      lastSeen: new Date().toISOString()
    },
    {
      id: 'user-2',
      name: 'Maria Garcia',
      email: 'maria@example.com',
      role: 'admin',
      status: 'online',
      avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=random',
      lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
    },
    {
      id: 'user-3',
      name: 'James Wilson',
      email: 'james@example.com',
      role: 'editor',
      status: 'away',
      avatarUrl: 'https://ui-avatars.com/api/?name=James+Wilson&background=random',
      lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    }
  ]);
  
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'viewer' as const
  });
  
  const [isInviting, setIsInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInviteForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      setInviteStatus({ message: 'Please fill in all fields', type: 'error' });
      return;
    }

    setIsInviting(true);
    setInviteStatus(null);

    try {
      // Simulate API call to invite team member
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would send an invitation email
      const newMember: TeamMember = {
        id: `user-${Date.now()}`,
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        status: 'offline', // Initially offline until they accept
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(inviteForm.name)}&background=random`
      };
      
      setTeamMembers(prev => [...prev, newMember]);
      setInviteForm({ name: '', email: '', role: 'viewer' });
      setInviteStatus({ message: 'Invitation sent successfully!', type: 'success' });
    } catch (error) {
      setInviteStatus({ message: 'Failed to send invitation. Please try again.', type: 'error' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = (memberId: string, role: TeamMember['role']) => {
    setTeamMembers(prev =>
      prev.map(member =>
        member.id === memberId
          ? { ...member, role }
          : member
      )
    );
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Team Collaboration</h2>
        <p className="text-sm text-gray-400">
          Invite team members to manage streams and collaborate on content
        </p>
      </div>

      {inviteStatus && (
        <div className={`mb-4 p-3 rounded ${inviteStatus.type === 'success' ? 'bg-green-900 bg-opacity-20' : 'bg-red-900 bg-opacity-20'} 
                     border ${inviteStatus.type === 'success' ? 'border-green-500' : 'border-red-500'} `}>
          <p className={`text-${inviteStatus.type === 'success' ? 'green-400' : 'red-400'}`}>
            {inviteStatus.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Team Member Name
          </label>
          <input
            type="text"
            name="name"
            value={inviteForm.name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter team member name"
            disabled={isInviting}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={inviteForm.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter email address"
            disabled={isInviting}
          />
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Role
          </label>
          <select
            name="role"
            value={inviteForm.role}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isInviting}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={isInviting}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
        >
          {isInviting ? 'Sending Invitation...' : 'Invite Team Member'}
        </button>
      </form>

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Team Members ({teamMembers.length})</h3>
        {teamMembers.length === 0 ? (
          <p className="text-center text-gray-400 py-4">
            No team members yet
          </p>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center p-3 bg-gray-900 rounded 
                           ${member.status === 'online' ? 'border-l-4 border-green-500' :
                            member.status === 'away' ? 'border-l-4 border-yellow-500' :
                            'border-l-4 border-red-500'}`}
              >
                <div className="flex-shrink-0">
                  {member.avatarUrl ? (
                    <img 
                      src={member.avatarUrl} 
                      alt={member.name} 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 ml-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-white">{member.name}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </div>
                    <div className="flex space-x-2 text-xs">
                      <span className={`px-2 py-0.5 text-xs rounded-full 
                                    ${member.role === 'owner' ? 'bg-red-500 text-white' :
                                     member.role === 'admin' ? 'bg-blue-500 text-white' :
                                     member.role === 'editor' ? 'bg-yellow-500 text-white' :
                                     member.role === 'viewer' ? 'bg-gray-500 text-white' : 'bg-gray-500 text-white'}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {member.status === 'online'
                          ? '● Online'
                          : member.status === 'away'
                          ? '○ Away'
                          : '● Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    {member.lastSeen && (
                      <span className="text-xs text-gray-400">
                        Last seen: {new Date(member.lastSeen).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 space-x-2">
                  <button
                    onClick={() => handleChangeRole(member.id, 
                      member.role === 'owner' ? 'admin' :
                      member.role === 'admin' ? 'editor' :
                      member.role === 'editor' ? 'viewer' :
                      'owner'
                    )}
                    className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    title="Change Role"
                  >
                    ↻
                  </button>
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                      title="Remove Member"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Team members can collaboratively manage streams, overlays, and schedules.
          Role-based permissions control what each member can do.
        </p>
      </div>
    </div>
  );
};