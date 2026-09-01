import {
  useMemo,
  useState,
} from 'react'

import useAsyncData from '../../hooks/useAsyncData'
import { getPersons } from '../../services/personService'

import { normalizeCnicSearch } from './cnic'

import {
  type PersonView,
  type Person,
  type SortOption,
} from './types'

/* =============================================================
   usePersonDirectory

   Owns the person list: fetch, search (name / CNIC) and sort.
   The "show more / see less" windowing lives in the view
   components (grid: 12, table: 25) via usePagedList.
============================================================= */

export function usePersonDirectory() {
  const [persons, setPersons] =
    useState<Person[]>([])

  const [searchQuery, setSearchQuery] =
    useState('')

  const [view, setView] =
    useState<PersonView>('grid')

  const [sortOption, setSortOption] =
    useState<SortOption>('newest')

  const {
    loading: isLoading,
    error,
    reload: fetchPersons,
  } = useAsyncData<Person[]>(
    async () => {
      const data = await getPersons()
      setPersons(data)
      return data
    },
    {
      apiErrorFallback:
        'Failed to load persons.',
      networkFallback:
        'Failed to load persons.',
    },
  )

  const filteredPersons = useMemo(() => {
    const rawQuery = searchQuery
      .trim()
      .toLowerCase()

    const filtered = !rawQuery
      ? [...persons]
      : persons.filter((person) => {
          const nameMatch = person.name
            .toLowerCase()
            .includes(rawQuery)

          const normalizedQuery =
            normalizeCnicSearch(rawQuery)

          const personCnic =
            normalizeCnicSearch(
              person.identifier,
            )

          const cnicMatch =
            normalizedQuery.length > 0 &&
            personCnic.includes(
              normalizedQuery,
            )

          return nameMatch || cnicMatch
        })

    filtered.sort((a, b) => {
      if (sortOption === 'name-asc') {
        return a.name.localeCompare(
          b.name,
          undefined,
          { sensitivity: 'base' },
        )
      }
      if (sortOption === 'name-desc') {
        return b.name.localeCompare(
          a.name,
          undefined,
          { sensitivity: 'base' },
        )
      }

      const aTime = new Date(
        a.created_at,
      ).getTime()
      const bTime = new Date(
        b.created_at,
      ).getTime()

      return sortOption === 'oldest'
        ? aTime - bTime
        : bTime - aTime
    })

    return filtered
  }, [persons, searchQuery, sortOption])

  return {
    persons,
    setPersons,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    view,
    setView,
    sortOption,
    setSortOption,
    filteredPersons,
    fetchPersons,
  }
}

export default usePersonDirectory
