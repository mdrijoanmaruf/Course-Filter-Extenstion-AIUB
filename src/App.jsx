import { useEffect, useMemo, useState } from 'react'

const features = [
  'Course name and Class ID search',
  'Status filter (Freshman, Sophomore, etc.)',
  'Day of week filter',
  'Time slot range filter',
  'Clash detection and routine builder',
  'Alternative sections viewer',
]

function getChromeApi() {
  if (typeof globalThis === 'undefined') return null
  return globalThis.chrome ?? null
}

function storageGetEnabled(api) {
  return new Promise((resolve) => {
    try {
      api.storage.sync.get({ extensionEnabled: true }, (result) => {
        resolve(Boolean(result?.extensionEnabled ?? true))
      })
    } catch {
      resolve(true)
    }
  })
}

function queryCurrentTab(api) {
  return new Promise((resolve) => {
    try {
      api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs?.[0] ?? null)
      })
    } catch {
      resolve(null)
    }
  })
}

function setEnabled(api, enabled) {
  return new Promise((resolve) => {
    try {
      api.storage.sync.set({ extensionEnabled: enabled }, () => resolve())
    } catch {
      resolve()
    }
  })
}

function reloadTab(api, tabId) {
  if (!tabId) return
  try {
    api.tabs.reload(tabId)
  } catch {
    // no-op
  }
}

function App() {
  const chromeApi = useMemo(getChromeApi, [])
  const [enabled, setEnabledState] = useState(true)
  const [currentTab, setCurrentTab] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function initPopup() {
      if (!chromeApi) {
        setReady(true)
        return
      }

      const [enabledState, tab] = await Promise.all([
        storageGetEnabled(chromeApi),
        queryCurrentTab(chromeApi),
      ])

      setEnabledState(enabledState)
      setCurrentTab(tab)
      setReady(true)
    }

    initPopup()
  }, [chromeApi])

  const isOfferedPage = Boolean(
    currentTab?.url?.includes('portal.aiub.edu/Student/Section/Offered'),
  )

  const status = useMemo(() => {
    if (!ready) {
      return {
        text: 'Loading extension status...',
        classes: 'bg-slate-100 text-slate-700 border-slate-200',
      }
    }

    if (!chromeApi) {
      return {
        text: 'Open as a Chrome extension popup to use toggle controls.',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    }

    if (!enabled) {
      return {
        text: 'Extension is disabled. Toggle ON to activate.',
        classes: 'bg-red-50 text-red-700 border-red-200',
      }
    }

    if (isOfferedPage) {
      return {
        text: 'Filter panel is active on this page.',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    }

    return {
      text: 'Go to Offered Courses page to use filters.',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
    }
  }, [chromeApi, enabled, isOfferedPage, ready])

  const handleToggle = async () => {
    if (!chromeApi) return
    const next = !enabled
    setEnabledState(next)
    await setEnabled(chromeApi, next)
    reloadTab(chromeApi, currentTab?.id)
  }

  return (
    <div className="relative w-[340px] overflow-hidden rounded-2xl border border-aiub-blue/15 bg-gradient-to-br from-white via-aiub-sky to-[#dbeaff] font-display text-[#20314f] shadow-card">
      <div className="absolute -top-14 right-[-52px] h-40 w-40 rounded-full bg-aiub-blue/20 blur-2xl" />

      <header className="relative flex items-center gap-3 bg-gradient-to-r from-aiub-navy via-aiub-blue to-[#2f7be7] px-4 py-4 text-white">
        <img
          src="/aiub.jpg"
          alt="AIUB"
          className="h-10 w-10 rounded-xl border border-white/40 object-cover"
        />
        <div>
          <h1 className="text-[15px] font-bold leading-tight tracking-wide">AIUB Portal+</h1>
          <p className="text-[11px] text-white/75">Portal Enhancement Suite</p>
        </div>
      </header>

      <main className="relative space-y-3 px-4 pb-3 pt-4">
        <section className="flex items-center justify-between rounded-xl border border-aiub-blue/15 bg-white/90 px-3 py-3 shadow-sm">
          <div>
            <p className="text-[13px] font-bold text-aiub-navy">Extension</p>
            <p className={`text-[11px] font-semibold ${enabled ? 'text-aiub-success' : 'text-aiub-danger'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            disabled={!chromeApi}
            aria-label="Enable or disable extension"
            className={`relative h-7 w-14 rounded-full border transition ${enabled ? 'border-aiub-blue bg-aiub-blue' : 'border-slate-300 bg-slate-300'} ${chromeApi ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
          >
            <span
              className={`absolute top-[2px] h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-[31px]' : 'left-[3px]'}`}
            />
          </button>
        </section>

        <section className={`rounded-lg border px-3 py-2 text-center text-[12px] font-semibold ${status.classes}`}>
          {status.text}
        </section>

        <section className="rounded-xl border border-aiub-blue/15 bg-white/90 px-3 py-3 shadow-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Features</p>
          <ul className="space-y-1.5">
            {features.map((item) => (
              <li key={item} className="relative pl-3.5 text-[12px] leading-5 text-slate-700">
                <span className="absolute left-0 top-2 h-1.5 w-1.5 rounded-full bg-aiub-blue" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="px-4 pb-4 text-center text-[11px] text-slate-500">
        Developed by{' '}
        <a
          href="https://rijoan.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-aiub-blue hover:underline"
        >
          Md Rijoan Maruf
        </a>
      </footer>
    </div>
  )
}

export default App
