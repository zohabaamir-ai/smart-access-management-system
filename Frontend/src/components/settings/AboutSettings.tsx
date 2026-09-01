import Card from '../common/Card'
import SystemLogo from '../branding/SystemLogo'

/* =============================================================
   ABOUT

   What this product is. Visible to every role.
============================================================= */

const FACTS = [
  { label: 'Application', value: 'Smart Access Management System' },
  { label: 'Version', value: '1.0.0' },
  { label: 'Interface', value: 'React + TypeScript' },
  { label: 'Core Capability', value: 'Face recognition' },
]

function AboutSettings() {
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <SystemLogo variant="full" size="sm" />

        <p className="mt-4 max-w-prose text-sm leading-6 text-slate-600 dark:text-slate-300">
          Smart Access Management System is an
          operations console for managing
          people, cameras, and recognition
          activity. Enroll the people the
          system should recognize, configure
          cameras for each entry point, and
          review recognition events in
          Activity. Live recognition runs
          through dedicated camera stations.
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-800"
            >
              <dt className="text-xs text-slate-500 dark:text-slate-500">
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900 dark:text-white">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
        Authentication and authorization are
        enforced by the application on every
        request. Roles: Super Admin, Admin,
        Operator.
      </div>
    </div>
  )
}

export default AboutSettings
