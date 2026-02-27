import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getUsers,
  getBannedUsers,
  banUser,
  unbanUser,
} from '../services/adminService';
import { User, UserBan } from '../types';
import { useAuth } from '../hooks/useAuth';
import ActionModal from '../components/ActionModal';

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: adminUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [bannedUsers, setBannedUsers] = useState<UserBan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal state
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDuration, setBanDuration] = useState(7);

  const currentFilter = searchParams.get('filter') || 'all';

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [usersData, bannedData] = await Promise.all([
          getUsers(),
          getBannedUsers(),
        ]);
        setUsers(usersData);
        setBannedUsers(bannedData);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleFilterChange = (filter: string) => {
    if (filter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', filter);
    }
    setSearchParams(searchParams);
  };

  const handleBanUser = async (reason: string) => {
    if (!selectedUser || !adminUser) return;

    try {
      setIsUpdating(true);
      await banUser(
        selectedUser.id,
        adminUser.uid,
        reason,
        banType,
        banType === 'temporary' ? banDuration : undefined
      );

      // Refresh banned users
      const bannedData = await getBannedUsers();
      setBannedUsers(bannedData);

      setShowBanModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      setIsUpdating(true);
      await unbanUser(userId);

      // Refresh banned users
      const bannedData = await getBannedUsers();
      setBannedUsers(bannedData);
    } catch (err) {
      console.error('Error unbanning user:', err);
      setError('Failed to unban user');
    } finally {
      setIsUpdating(false);
    }
  };

  const bannedUserIds = new Set(bannedUsers.filter((b) => b.isBanned).map((b) => b.userId));

  const filteredUsers = users.filter((user) => {
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // Apply status filter
    if (currentFilter === 'banned') {
      return bannedUserIds.has(user.id);
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Users</h1>

      {/* Search and Filter */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => handleFilterChange('banned')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              currentFilter === 'banned'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Banned ({bannedUsers.filter((b) => b.isBanned).length})
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Posts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isBanned = bannedUserIds.has(user.id);
                const banInfo = bannedUsers.find((b) => b.userId === user.id);

                return (
                  <tr key={user.id} className={isBanned ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isBanned ? (
                        <div>
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            Banned
                          </span>
                          {banInfo?.banExpiresAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Until {new Date(banInfo.banExpiresAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.postCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isBanned ? (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          disabled={isUpdating}
                          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                        >
                          Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                          }}
                          disabled={isUpdating}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ban Modal */}
      <ActionModal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
        }}
        title={`Ban ${selectedUser?.name || 'User'}`}
        description={
          banType === 'permanent'
            ? 'This will permanently ban the user from the platform.'
            : `This will ban the user for ${banDuration} days.`
        }
        actionLabel={banType === 'permanent' ? 'Permanently Ban' : 'Ban User'}
        actionType="danger"
        onAction={handleBanUser}
        isLoading={isUpdating}
        notesLabel="Ban reason"
        notesPlaceholder="Why is this user being banned?"
      />

      {/* Ban Options (type and duration) */}
      {showBanModal && (
        <div className="fixed inset-0 z-40" style={{ pointerEvents: 'none' }}>
          <div
            className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 z-50 space-y-4"
            style={{ pointerEvents: 'auto' }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ban Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBanType('temporary')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    banType === 'temporary'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Temporary
                </button>
                <button
                  onClick={() => setBanType('permanent')}
                  className={`px-3 py-1 text-sm rounded-md ${
                    banType === 'permanent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Permanent
                </button>
              </div>
            </div>

            {banType === 'temporary' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(Number(e.target.value))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
