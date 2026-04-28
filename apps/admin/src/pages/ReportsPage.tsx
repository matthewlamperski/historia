import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getReports } from '../services/adminService';
import { Report, ReportStatus } from '../types';
import ReportCard from '../components/ReportCard';

const statusTabs: { label: string; value: ReportStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
];

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = (searchParams.get('status') as ReportStatus | 'all') || 'all';

  useEffect(() => {
    async function fetchReports() {
      try {
        setIsLoading(true);
        const status = currentStatus === 'all' ? undefined : currentStatus;
        const data = await getReports(status);
        setReports(data);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReports();
  }, [currentStatus]);

  const handleTabChange = (status: ReportStatus | 'all') => {
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>

      {/* Status Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${currentStatus === tab.value
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
              {tab.value === 'pending' && reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Reports List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : reports.length > 0 ? (
          <div className="grid gap-4">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
              />
            </svg>
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No reports found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {currentStatus === 'all'
                ? 'There are no reports to review.'
                : `There are no ${currentStatus} reports.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
