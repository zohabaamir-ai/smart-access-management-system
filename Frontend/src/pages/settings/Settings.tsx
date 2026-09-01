import { useState } from 'react'

import { getTokenPayload } from '../../services/auth'

import PageHeader from '../../components/common/PageHeader'
import NotAuthorized from '../../components/common/NotAuthorized'

import SettingsNavigation, {
  type SettingsSection,
} from '../../components/settings/SettingsNavigation'
import GeneralSettings from '../../components/settings/GeneralSettings'
import SecuritySettings from '../../components/settings/SecuritySettings'
import SystemSettings from '../../components/settings/SystemSettings'
import AboutSettings from '../../components/settings/AboutSettings'

/* =============================================================
   SETTINGS

   My Preferences (all roles), Security (all roles), System
   (Super Admin only — the section is not shown to anyone else),
   and About (all roles).
============================================================= */

function Settings() {
  const currentUser = getTokenPayload()
  const isSuperAdmin =
    currentUser?.role === 'super_admin'

  const [activeSection, setActiveSection] =
    useState<SettingsSection>('general')

  function renderSection() {
    switch (activeSection) {
      case 'security':
        return <SecuritySettings />
      case 'system':
        return isSuperAdmin ? (
          <SystemSettings />
        ) : (
          <NotAuthorized message="System configuration is available to the Super Admin only." />
        )
      case 'about':
        return <AboutSettings />
      case 'general':
      default:
        return <GeneralSettings />
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Your preferences and account options."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <SettingsNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isSuperAdmin={isSuperAdmin}
        />

        <main className="min-w-0">
          {renderSection()}
        </main>
      </div>
    </div>
  )
}

export default Settings
