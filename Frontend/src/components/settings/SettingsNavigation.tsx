import {
  Info,
  LockKeyhole,
  Settings2,
  Shield,
} from 'lucide-react'

export type SettingsSection =
  | 'general'
  | 'security'
  | 'system'
  | 'about'

type SettingsNavigationProps = {
  activeSection: SettingsSection
  onSectionChange: (
    section: SettingsSection,
  ) => void
  isSuperAdmin: boolean
}

const SECTIONS = [
  {
    id: 'general' as const,
    label: 'My Preferences',
    icon: Settings2,
  },
  {
    id: 'security' as const,
    label: 'Security',
    icon: LockKeyhole,
  },
  {
    id: 'system' as const,
    label: 'System Settings',
    icon: Shield,
    superAdminOnly: true,
  },
  {
    id: 'about' as const,
    label: 'About',
    icon: Info,
  },
]

function SettingsNavigation({
  activeSection,
  onSectionChange,
  isSuperAdmin,
}: SettingsNavigationProps) {
  return (
    <nav
      aria-label="Settings sections"
      className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 lg:flex-col"
    >
      {SECTIONS.filter(
        (s) =>
          !s.superAdminOnly || isSuperAdmin,
      ).map((section) => {
        const Icon = section.icon
        const active =
          activeSection === section.id

        return (
          <button
            key={section.id}
            type="button"
            onClick={() =>
              onSectionChange(section.id)
            }
            className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
            }`}
          >
            <Icon
              size={16}
              className={
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500'
              }
            />
            {section.label}
          </button>
        )
      })}
    </nav>
  )
}

export default SettingsNavigation
