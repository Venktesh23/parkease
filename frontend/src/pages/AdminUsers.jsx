import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useRefetchOnFocus } from '../hooks/useRefetchOnFocus'
import { useToast } from '../components/Toast'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data)
    } catch {
      showToast('Failed to load users', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchUsers(false) }, [fetchUsers])
  useRefetchOnFocus(() => fetchUsers(true))

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">System Users</h2>
        <p className="page-subtitle">All registered accounts in the platform</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id}>
                  <td className="td-muted-id">#{u.user_id}</td>
                  <td className="td-strong">{u.first_name} {u.last_name}</td>
                  <td className="td-secondary">{u.email}</td>
                  <td className="td-secondary">{u.phone || '-'}</td>
                  <td><StatusBadge status={u.role} /></td>
                  <td className="td-secondary">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
