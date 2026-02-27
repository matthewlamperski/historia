import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getReport,
  getUser,
  getUserBan,
  updateReportStatus,
  banUser,
  getModerationActions,
} from '../services/adminService';
import { Report, User, UserBan, ModerationAction, ReportStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import StatusBadge from '../components/StatusBadge';
import ActionModal from '../components/ActionModal';

const reasonLabels: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  inappropriate_content: 'Inappropriate Content',
  impersonation: 'Impersonation',
  other: 'Other',
};

const typeLabels: Record<string, string> = {
  user: 'User',
  post: 'Post',
  comment: 'Comment',
  message: 'Message',
};

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [reportedUser, setReportedUser] = useState<User | null>(null);
  const [reportedUserBan, setReportedUserBan] = useState<UserBan | null>(null);
  const [moderationHistory, setModerationHistory] = useState<ModerationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal states
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDuration, setBanDuration] = useState(7);

  useEffect(() => {
    async function fetchData() {
      if (!reportId) return;

      try {
        setIsLoading(true);
        const reportData = await getReport(reportId);

        if (!reportData) {
          setError('Report not found');
          return;
        }

        setReport(reportData);

        // Fetch related data
        const [userData, banData, historyData] = await Promise.all([
          getUser(reportData.reportedUserId),
          getUserBan(reportData.reportedUserId),
          getModerationActions(reportData.reportedUserId),
        ]);

        setReportedUser(userData);
        setReportedUserBan(banData);
        setModerationHistory(historyData);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [reportId]);

  const handleStatusUpdate = async (
    status: ReportStatus,
    action: string,
    notes: string
  ) => {
    if (!report || !adminUser) return;

    try {
      setIsUpdating(true);
      await updateReportStatus(report.id, status, {
        action,
        adminId: adminUser.uid,
        adminNotes: notes,
      });

      // Update local state
      setReport((prev) =>
        prev
          ? {
              ...prev,
              status,
              resolution: {
                action,
                adminId: adminUser.uid,
                adminNotes: notes,
                resolvedAt: new Date(),
              },
            }
          : null
      );

      setShowDismissModal(false);
      setShowResolveModal(false);
    } catch (err) {
      console.error('Error updating report:', err);
      setError('Failed to update report status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBanUser = async (reason: string) => {
    if (!report || !adminUser) return;

    try {
      setIsUpdating(true);
      await banUser(
        report.reportedUserId,
        adminUser.uid,
        reason,
        banType,
        banType === 'temporary' ? banDuration : undefined
      );

      // Update report status
      await updateReportStatus(report.id, 'resolved', {
        action: `${banType === 'permanent' ? 'Permanent' : `${banDuration}-day`} ban issued`,
        adminId: adminUser.uid,
        adminNotes: reason,
      });

      // Refresh data
      const [banData, historyData] = await Promise.all([
        getUserBan(report.reportedUserId),
        getModerationActions(report.reportedUserId),
      ]);

      setReportedUserBan(banData);
      setModerationHistory(historyData);
      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: 'resolved',
              resolution: {
                action: `${banType === 'permanent' ? 'Permanent' : `${banDuration}-day`} ban issued`,
                adminId: adminUser.uid,
                adminNotes: reason,
                resolvedAt: new Date(),
              },
            }
          : null
      );

      setShowBanModal(false);
    } catch (err) {
      console.error('Error banning user:', err);
      setError('Failed to ban user');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error || 'Report not found'}</p>
        <button
          onClick={() => navigate('/reports')}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-500"
        >
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Reports
          </button>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Report Details</h1>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Report Information</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {typeLabels[report.reportedType] || report.reportedType}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Reason</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {reasonLabels[report.reason] || report.reason}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Reporter</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {report.reporterName || report.reporterId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(report.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>

            {report.description && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.description}</dd>
              </div>
            )}
          </div>

          {/* Content Snapshot */}
          {report.contentSnapshot && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Reported Content</h2>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                {report.contentSnapshot.userName && (
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    By: {report.contentSnapshot.userName}
                  </p>
                )}
                {report.contentSnapshot.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {report.contentSnapshot.content}
                  </p>
                )}
                {report.contentSnapshot.images && report.contentSnapshot.images.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.contentSnapshot.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Reported content ${index + 1}`}
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resolution Info */}
          {report.resolution && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Resolution</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Action Taken</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.resolution.action}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Resolved At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(report.resolution.resolvedAt).toLocaleString()}
                  </dd>
                </div>
              </dl>
              {report.resolution.adminNotes && (
                <div className="mt-4">
                  <dt className="text-sm font-medium text-gray-500">Admin Notes</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.resolution.adminNotes}</dd>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          {report.status !== 'resolved' && report.status !== 'dismissed' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900">Actions</h2>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => setShowDismissModal(true)}
                  className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Resolve with Warning
                </button>
                <button
                  onClick={() => {
                    setBanType('temporary');
                    setShowBanModal(true);
                  }}
                  className="w-full rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500"
                >
                  Issue Temporary Ban
                </button>
                <button
                  onClick={() => {
                    setBanType('permanent');
                    setShowBanModal(true);
                  }}
                  className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Issue Permanent Ban
                </button>
              </div>
            </div>
          )}

          {/* Reported User Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Reported User</h2>
            {reportedUser ? (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  {reportedUser.avatar ? (
                    <img
                      src={reportedUser.avatar}
                      alt={reportedUser.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {reportedUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{reportedUser.name}</p>
                    <p className="text-sm text-gray-500">@{reportedUser.username}</p>
                  </div>
                </div>

                {reportedUserBan?.isBanned && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md">
                    <p className="text-sm font-medium text-red-800">Currently Banned</p>
                    <p className="text-sm text-red-700">{reportedUserBan.banReason}</p>
                    {reportedUserBan.banExpiresAt && (
                      <p className="text-xs text-red-600 mt-1">
                        Expires: {new Date(reportedUserBan.banExpiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <dl className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Posts</dt>
                    <dd className="text-sm text-gray-900">{reportedUser.postCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Followers</dt>
                    <dd className="text-sm text-gray-900">{reportedUser.followerCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Joined</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(reportedUser.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">User not found</p>
            )}
          </div>

          {/* Moderation History */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Moderation History</h2>
            {moderationHistory.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {moderationHistory.map((action) => (
                  <li key={action.id} className="text-sm">
                    <p className="font-medium text-gray-900">
                      {action.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                    <p className="text-gray-500">{action.reason}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No previous moderation actions</p>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss Modal */}
      <ActionModal
        isOpen={showDismissModal}
        onClose={() => setShowDismissModal(false)}
        title="Dismiss Report"
        description="This will mark the report as dismissed. The reporter will not be notified."
        actionLabel="Dismiss Report"
        actionType="primary"
        onAction={(notes) => handleStatusUpdate('dismissed', 'dismissed', notes)}
        isLoading={isUpdating}
        notesLabel="Reason for dismissal"
        notesPlaceholder="Why is this report being dismissed?"
      />

      {/* Resolve Modal */}
      <ActionModal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve with Warning"
        description="This will resolve the report and issue a warning to the user."
        actionLabel="Issue Warning"
        actionType="primary"
        onAction={(notes) => handleStatusUpdate('resolved', 'warning', notes)}
        isLoading={isUpdating}
        notesLabel="Warning message"
        notesPlaceholder="What warning should be issued?"
      />

      {/* Ban Modal */}
      <ActionModal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title={`Issue ${banType === 'permanent' ? 'Permanent' : 'Temporary'} Ban`}
        description={
          banType === 'permanent'
            ? 'This will permanently ban the user from the platform.'
            : `This will ban the user for ${banDuration} days.`
        }
        actionLabel={banType === 'permanent' ? 'Permanently Ban User' : 'Ban User'}
        actionType="danger"
        onAction={handleBanUser}
        isLoading={isUpdating}
        notesLabel="Ban reason"
        notesPlaceholder="Why is this user being banned?"
      />

      {/* Ban Duration Selector (shown in ban modal) */}
      {showBanModal && banType === 'temporary' && (
        <div className="fixed inset-0 z-40" style={{ pointerEvents: 'none' }}>
          <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 z-50" style={{ pointerEvents: 'auto' }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ban Duration
            </label>
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
        </div>
      )}
    </div>
  );
}
