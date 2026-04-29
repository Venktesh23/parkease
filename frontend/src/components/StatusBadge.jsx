const statusMap = {
  active: 'badge-active',
  available: 'badge-available',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  failed: 'badge-failed',
  unavailable: 'badge-unavailable',
  pending: 'badge-pending',
  electric: 'badge-electric',
  handicapped: 'badge-handicapped',
  standard: 'badge-standard',
  admin: 'badge-admin',
  customer: 'badge-customer',
  sedan: 'badge-standard',
  SUV: 'badge-standard',
  motorcycle: 'badge-standard',
  truck: 'badge-standard',
}

export default function StatusBadge({ status }) {
  const cls = statusMap[status] || 'badge-standard'
  return (
    <span className={`badge ${cls}`}>
      {status}
    </span>
  )
}
