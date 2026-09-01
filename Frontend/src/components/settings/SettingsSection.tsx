import type { ReactNode } from 'react'

import Card from '../common/Card'

/* =============================================================
   SETTINGS SECTION

   Thin alias over <Card> for the settings screens, so the
   settings area and the rest of the app share one surface.
============================================================= */

type SettingsSectionProps = {
  title: string
  description: string
  children: ReactNode
  bodyClassName?: string
}

function SettingsSection({
  title,
  description,
  children,
  bodyClassName = 'p-6',
}: SettingsSectionProps) {
  return (
    <Card
      as="section"
      title={title}
      description={description}
      bodyClassName={bodyClassName}
    >
      {children}
    </Card>
  )
}

export default SettingsSection
