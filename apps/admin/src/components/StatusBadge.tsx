import { ReportStatus } from '../types';

interface StatusBadgeProps {
  status: ReportStatus;
}

const statusStyles: Record<ReportStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  reviewing: { bg: 'bg-blue-100', text: 'text-blue-800' },
  resolved: { bg: 'bg-green-100', text: 'text-green-800' },
  dismissed: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = statusStyles[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.bg} ${styles.text}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
