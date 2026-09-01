import { useState } from 'react'

import { Download } from 'lucide-react'

import { isAuthExpired } from '../../services/api'
import { exportActivityCsv } from '../../services/activityService'
import { hasPermission } from '../../services/permissions'

import useToast from '../../components/common/toast/useToast'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Alert from '../../components/common/Alert'
import Button from '../../components/common/Button'

import ActivityFilterBar from '../../components/activity/ActivityFilterBar'
import ActivityTable from '../../components/activity/ActivityTable'
import useActivityFeed from '../../components/activity/useActivityFeed'

/* =============================================================
   ACTIVITY

   The historical record of the recognition system — who was
   recognized, at which camera, and when. Filterable and
   exportable; not notifications, not reports.
============================================================= */

function ActivityPage() {
  const toast = useToast()

  const canExport = hasPermission(
    'export_activity',
  )

  const feed = useActivityFeed()

  const [isExporting, setIsExporting] =
    useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const blob = await exportActivityCsv(
        feed.exportFilters,
      )
      const url = URL.createObjectURL(blob)
      const link =
        document.createElement('a')
      link.href = url
      link.download = 'activity.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.show({
        message: 'Activity exported',
      })
    } catch (caught) {
      if (isAuthExpired(caught)) return
      toast.show({
        tone: 'fault',
        message:
          caught instanceof Error &&
          caught.message &&
          !caught.message.startsWith(
            'ACTIVITY_EXPORT_FAILED',
          )
            ? caught.message
            : 'Could not export activity.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Remounts the table (resetting its "show more" page) whenever
  // the filter set changes.
  const tableKey = [
    feed.startDate,
    feed.endDate,
    feed.activeQuery.trim(),
    feed.personIds.join('.'),
    feed.cameraIds.join('.'),
  ].join('|')

  const count = feed.events.length
  const meta = feed.isLoading
    ? undefined
    : feed.hasActiveFilters
      ? `${count} of ${feed.totalInRange} · filtered`
      : `${count} ${
          count === 1 ? 'event' : 'events'
        }`

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity"
        description="Review recognition activity and events."
        meta={meta}
        actions={
          canExport && (
            <Button
              variant="secondary"
              icon={<Download size={16} />}
              onClick={handleExport}
              loading={isExporting}
              disabled={feed.isLoading}
            >
              Export CSV
            </Button>
          )
        }
      />

      {feed.error && (
        <Alert variant="error">
          {feed.error}
        </Alert>
      )}

      <Card className="p-4 sm:p-5">
        <ActivityFilterBar
          startDate={feed.startDate}
          endDate={feed.endDate}
          rangeInvalid={feed.rangeInvalid}
          onStartDateChange={
            feed.setStartDate
          }
          onEndDateChange={feed.setEndDate}
          search={feed.search}
          onSearchChange={feed.setSearch}
          personIds={feed.personIds}
          onPersonIdsChange={
            feed.setPersonIds
          }
          cameraIds={feed.cameraIds}
          onCameraIdsChange={
            feed.setCameraIds
          }
          hasActiveFilters={
            feed.hasActiveFilters
          }
          onClearAll={feed.clearAll}
          isLoading={feed.isLoading}
        />
      </Card>

      <ActivityTable
        key={tableKey}
        events={feed.events}
        isLoading={feed.isLoading}
        hasActiveFilters={
          feed.hasActiveFilters
        }
        query={feed.activeQuery}
      />
    </div>
  )
}

export default ActivityPage
