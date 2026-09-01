import {
  useMemo,
  useState,
} from 'react'

import useAsyncData from '../../hooks/useAsyncData'
import { getUsers } from '../../services/userService'

import type { ManagementUser } from './types'

/* =============================================================
   useUserDirectory

   Owns the management-user list: fetch lifecycle plus a simple
   client-side search over name / username / role. The backend
   GET /users returns every account (no server-side search or
   pagination); V1 has a small number of admin accounts.
============================================================= */

export function useUserDirectory() {
  const [users, setUsers] = useState<
    ManagementUser[]
  >([])

  const [searchQuery, setSearchQuery] =
    useState('')

  const {
    loading: isLoading,
    error,
    reload: fetchUsers,
  } = useAsyncData<ManagementUser[]>(
    async () => {
      const data = await getUsers()

      setUsers(data)

      return data
    },
    {
      apiErrorFallback:
        'Unable to load users.',
      networkFallback:
        'Unable to load users.',
    },
  )

  const filteredUsers = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase()

    if (!query) {
      return users
    }

    return users.filter(
      (user) =>
        user.full_name
          .toLowerCase()
          .includes(query) ||
        user.display_name
          .toLowerCase()
          .includes(query) ||
        user.username
          .toLowerCase()
          .includes(query) ||
        user.role
          .toLowerCase()
          .includes(query),
    )
  }, [users, searchQuery])

  return {
    users,
    setUsers,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    fetchUsers,
  }
}

export default useUserDirectory
