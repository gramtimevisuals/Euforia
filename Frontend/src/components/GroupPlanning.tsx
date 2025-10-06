import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import GroupChat from './GroupChat';
import { API_URL } from '../config';

export default function GroupPlanning() {
  const [groups, setGroups] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeChat, setActiveChat] = useState<{id: string, name: string} | null>(null);
  const [showMembers, setShowMembers] = useState<{id: string, name: string} | null>(null);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);

  useEffect(() => {
    fetchUserGroups();
    fetchAvailableGroups();
  }, []);

  const fetchUserGroups = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/groups/my-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        toast.error('Failed to fetch groups');
      }
    } catch (error) {
      toast.error('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableGroups = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/groups/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch available groups');
    }
  };

  const handleCreateGroup = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to create a group');
      return;
    }
    
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    try {
      console.log('Creating group with name:', newGroupName.trim());
      const response = await fetch(`${API_URL}/api/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newGroupName.trim() })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const newGroup = await response.json();
        console.log('New group created:', newGroup);
        setGroups([...groups, newGroup]);
        setNewGroupName('');
        setShowCreateGroup(false);
        toast.success('Group created successfully!');
        fetchUserGroups();
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Create group error:', errorData);
        toast.error(errorData.message || `Failed to create group (${response.status})`);
      }
    } catch (error) {
      console.error('Network error creating group:', error);
      toast.error('Network error. Please check your connection.');
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Successfully joined group!');
        fetchUserGroups();
        fetchAvailableGroups();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to send join request');
      }
    } catch (error) {
      toast.error('Failed to send join request');
    }
  };

  const handleShowMembers = async (groupId: string, groupName: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const members = await response.json();
        setGroupMembers(members);
        setShowMembers({id: groupId, name: groupName});
      } else {
        toast.error('Failed to fetch members');
      }
    } catch (error) {
      toast.error('Failed to fetch members');
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Group Planning</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowJoinGroup(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#A31818] to-[#CF0E0E] text-white rounded-xl font-medium hover:from-[#CF0E0E] hover:to-[#A31818] transition-all flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Join Group
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black rounded-xl font-medium hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Group
          </button>
        </div>
      </div>

      {showCreateGroup && (
        <div className="bg-[#171717]/80 backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-6">
          <h3 className="text-lg font-semibold text-[#FFFFFF] mb-4">Create New Group</h3>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name..."
              className="flex-1 px-4 py-2 bg-[#171717]/50 border border-[#DDAA52]/30 rounded-xl text-[#FFFFFF] placeholder-[#FFFFFF]/50"
            />
            <button
              onClick={handleCreateGroup}
              className="px-6 py-2 bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] text-black rounded-xl font-medium hover:from-[#DDAA52] hover:to-[#FB8B24] transition-all"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateGroup(false)}
              className="px-4 py-2 bg-[#171717]/50 text-[#FFFFFF] rounded-xl font-medium hover:bg-[#171717]/70 transition-all border border-[#DDAA52]/30"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showJoinGroup && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Join a Group</h3>
          {availableGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableGroups.map((group) => (
                <div key={group.id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">{group.name}</h4>
                    <p className="text-white/60 text-sm">{group.members?.length || 0} members</p>
                  </div>
                  <button
                    onClick={() => handleJoinGroup(group.id)}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all text-sm"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70 text-center py-4">No available groups to join</p>
          )}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowJoinGroup(false)}
              className="px-4 py-2 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{group.name}</h3>
                  <p className="text-white/60 text-sm">{group.members?.length || 0} members</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center text-white/80">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span>{group.shared_events?.length || 0} shared events</span>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setActiveChat({id: group.id, name: group.name})}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all text-sm flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    Chat
                  </button>
                  <button 
                    onClick={() => handleShowMembers(group.id, group.name)}
                    className="flex-1 bg-white/10 text-white py-2 px-3 rounded-xl font-medium hover:bg-white/20 transition-all text-sm flex items-center justify-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    Members
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {groups.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8 max-w-md mx-auto">
                <svg className="w-16 h-16 text-white/60 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">No Groups Yet</h3>
                <p className="text-white/70">Create your first group to start planning events with friends.</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeChat && (
        <GroupChat
          groupId={activeChat.id}
          groupName={activeChat.name}
          onClose={() => setActiveChat(null)}
        />
      )}
      
      {showMembers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#171717]/80 backdrop-blur-md rounded-3xl border border-[#DDAA52]/30 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#FFFFFF]">{showMembers.name} Members</h3>
              <button
                onClick={() => setShowMembers(null)}
                className="p-2 hover:bg-[#DDAA52]/10 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-[#FFFFFF]/70" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {groupMembers.map((member, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-[#171717]/50 rounded-xl border border-[#DDAA52]/20">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {member.avatar ? (
                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#FB8B24] to-[#DDAA52] flex items-center justify-center">
                        <span className="text-black font-bold">{member.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[#FFFFFF] font-medium">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}