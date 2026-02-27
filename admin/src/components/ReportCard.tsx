import { Link } from 'react-router-dom';
import { Report } from '../types';
import StatusBadge from './StatusBadge';

interface ReportCardProps {
  report: Report;
}

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

export default function ReportCard({ report }: ReportCardProps) {
  return (
    <Link
      to={`/reports/${report.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
              {typeLabels[report.reportedType] || report.reportedType}
            </span>
            <StatusBadge status={report.status} />
          </div>
          <span className="text-sm text-gray-500">
            {new Date(report.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Reason:</span>
            <span className="text-sm text-gray-900">
              {reasonLabels[report.reason] || report.reason}
            </span>
          </div>

          {report.reporterName && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Reporter:</span>
              <span className="text-sm text-gray-900">{report.reporterName}</span>
            </div>
          )}

          {report.reportedUserName && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Reported User:</span>
              <span className="text-sm text-gray-900">{report.reportedUserName}</span>
            </div>
          )}

          {report.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mt-2">
              {report.description}
            </p>
          )}

          {report.contentSnapshot?.content && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 line-clamp-2">
                "{report.contentSnapshot.content}"
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
