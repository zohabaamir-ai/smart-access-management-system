import { useAppPreferences } from '../../context/useAppPreferences'

import SettingsSection from './SettingsSection'
import ThemeOptionGrid from './ThemeOptionGrid'
import InterfaceDensityGrid from './InterfaceDensityGrid'
import PreferenceToggleRow from './PreferenceToggleRow'
import StartupPageSelect from './StartupPageSelect'
import ResetPreferencesCard from './ResetPreferencesCard'

function GeneralSettings() {
  const {
    theme,
    setTheme,
    interfaceDensity,
    setInterfaceDensity,
    startCollapsed,
    setStartCollapsed,
    reduceMotion,
    setReduceMotion,
    startupPage,
    setStartupPage,
    resetPreferences,
  } = useAppPreferences()

  return (
    <div className="space-y-5">
      <SettingsSection
        title="Appearance"
        description="Choose how the application looks."
      >
        <ThemeOptionGrid
          value={theme}
          onChange={setTheme}
        />
      </SettingsSection>

      <SettingsSection
        title="Interface"
        description="Configure how information is presented."
      >
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
          Interface Density
        </p>

        <InterfaceDensityGrid
          value={interfaceDensity}
          onChange={setInterfaceDensity}
        />

        <div className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
          <PreferenceToggleRow
            title="Start with collapsed sidebar"
            description="Open the app with the sidebar collapsed. You can still expand it anytime from the header."
            checked={startCollapsed}
            onChange={setStartCollapsed}
          />

          <PreferenceToggleRow
            title="Reduce Motion"
            description="Reduce interface animations and transitions."
            checked={reduceMotion}
            onChange={setReduceMotion}
          />

          <div className="py-5">
            <StartupPageSelect
              value={startupPage}
              onChange={setStartupPage}
            />
          </div>
        </div>
      </SettingsSection>

      <ResetPreferencesCard
        onReset={resetPreferences}
      />
    </div>
  )
}

export default GeneralSettings
