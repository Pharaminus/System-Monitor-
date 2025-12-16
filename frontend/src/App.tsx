import React, { useEffect, useMemo, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  CartesianGrid
} from 'recharts'
import { FixedSizeList as List } from 'react-window'
import { Bars3Icon, SunIcon, MoonIcon } from '@heroicons/react/24/outline'

type Core = { load: number; speed?: number }
type Metrics = { timestamp: string; cpu: { usage: number; cores?: Core[] }; memory: any; gpu?: any; processCount?: number }

function Header({ onLogout, onToggleSidebar, theme, onToggleTheme }: { onLogout: () => void; onToggleSidebar?: () => void; theme?: string; onToggleTheme?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Bars3Icon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold header-title">Realtime Monitor</h1>
      </div>
      <div className="flex items-center gap-3">
        <button title="Toggle theme" className="theme-toggle" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'night' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>
        <button className="px-3 py-1 bg-gray-100 rounded" onClick={onLogout}>Logout</button>
      </div>
    </div>
  )
}

function SystemCards({ latest }: { latest?: Metrics }) {
  const cpu = latest?.cpu?.usage ?? 0
  const memUsed = latest?.memory ? (latest.memory.used / latest.memory.total) * 100 : 0
  const swapTotal = latest?.memory?.swapTotal ?? null
  const swapUsed = latest?.memory?.swapUsed ?? null
  const swapPercent = (swapTotal && swapUsed) ? (swapUsed / swapTotal) * 100 : null
  // GPU: support multiple shapes. Backend may expose `gpu` as object or array.
  const gpuRaw = latest?.gpu ?? null
  let gpuInfo: { name?: string; util?: number; memUsed?: number; memTotal?: number; vendor?: string } | null = null
  let gpuCount = 0
  if (gpuRaw) {
    if (Array.isArray(gpuRaw) && gpuRaw.length) {
      gpuCount = gpuRaw.length
      const g = gpuRaw[0]
      gpuInfo = { name: g.name || g.gpu || 'GPU', vendor: g.vendor || null, util: g.util ?? g.utilization ?? g.usage ?? g.gpuUsage ?? null, memUsed: g.memUsed ?? g.memoryUsed ?? g.memory?.used ?? null, memTotal: g.memTotal ?? g.memoryTotal ?? g.memory?.total ?? null }
    } else if (typeof gpuRaw === 'object') {
      gpuCount = 1
      const g = gpuRaw as any
      gpuInfo = { name: g.name || g.gpu || 'GPU', vendor: g.vendor || null, util: g.util ?? g.utilization ?? g.usage ?? g.gpuUsage ?? null, memUsed: g.memUsed ?? g.memoryUsed ?? g.memory?.used ?? null, memTotal: g.memTotal ?? g.memoryTotal ?? g.memory?.total ?? null }
    }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
      <div className="card metric">
        <div className="metric-head">
          <div className="metric-label">CPU
            <span className="info-icon" tabIndex={0} aria-label="CPU info">
              i
              <span className="tooltip">Pourcentage d'utilisation CPU total. Moyenne sur tous les coeurs.</span>
            </span>
          </div>
          <div className="metric-value">{cpu.toFixed(1)}%</div>
        </div>
        <div className="metric-bar-bg"><div className="metric-bar" style={{ width: Math.min(100, Math.max(0, cpu)) + '%' }} /></div>
      </div>

      <div className="card metric">
        <div className="metric-head">
          <div className="metric-label">Memory
            <span className="info-icon" tabIndex={0} aria-label="Memory info">
              i
              <span className="tooltip">Mémoire utilisée / Mémoire totale. Inclut cache et buffers.</span>
            </span>
          </div>
          <div className="metric-value">{memUsed ? memUsed.toFixed(1) + '%' : '—'}</div>
        </div>
        <div className="metric-bar-bg"><div className="metric-bar" style={{ width: memUsed ? Math.min(100, Math.max(0, memUsed)) + '%' : '0%' }} /></div>
      </div>

      <div className="card metric">
        <div className="metric-head">
          <div className="metric-label">Processes
            <span className="info-icon" tabIndex={0} aria-label="Processes info">
              i
              <span className="tooltip">Nombre de processus actifs et en cours d'exécution sur le système.</span>
            </span>
          </div>
          <div className="metric-value">{latest && latest['processCount'] ? latest.processCount : '—'}</div>
        </div>
        <div className="metric-bar-bg"><div className="metric-bar" style={{ width: '6%' }} /></div>
      </div>

      <div className="card metric">
        <div className="metric-head">
          <div className="metric-label">Swap
            <span className="info-icon" tabIndex={0} aria-label="Swap info">
              i
              <span className="tooltip">Espace swap utilisé / total. Utile si la mémoire est saturée.</span>
            </span>
          </div>
          <div className="metric-value">{swapPercent !== null ? swapPercent.toFixed(1) + '%' : '—'}</div>
        </div>
        <div className="metric-bar-bg"><div className="metric-bar" style={{ width: swapPercent !== null ? Math.min(100, Math.max(0, swapPercent)) + '%' : '0%' }} /></div>
      </div>

      <div className="card metric">
        <div className="metric-head">
          <div className="metric-label">GPU {gpuCount > 1 ? `(${gpuCount})` : ''}
            <span className="info-icon" tabIndex={0} aria-label="GPU info">
              i
              <span className="tooltip">GPU utilisation et mémoire (si disponible).</span>
            </span>
          </div>
            <div className="metric-value">{gpuInfo ? (typeof gpuInfo.util === 'number' ? Number(gpuInfo.util).toFixed(1) + '%' : '—') : 'No GPU'}</div>
        </div>
        <div className="metric-bar-bg"><div className="metric-bar" style={{ width: gpuInfo && typeof gpuInfo.util === 'number' ? Math.min(100, Math.max(0, Number(gpuInfo.util))) + '%' : '0%' }} /></div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>{gpuInfo && gpuInfo.memUsed && gpuInfo.memTotal ? `${(gpuInfo.memUsed/1024/1024).toFixed(1)}MB / ${(gpuInfo.memTotal/1024/1024).toFixed(1)}MB` : (gpuInfo ? (gpuInfo.vendor ? gpuInfo.vendor : '') : 'No GPU data received')}</div>
      </div>
    </div>
  )
}

function GPUUsageChart({ history }: { history: Metrics[] }) {
  // Extract first GPU history if any
  const data = history.map(h => {
    const time = new Date(h.timestamp).toLocaleTimeString()
    const gpuRaw = h.gpu ?? null
    let util = null
    let memUsed = null
    let memTotal = null
    if (gpuRaw) {
      const g = Array.isArray(gpuRaw) ? gpuRaw[0] : gpuRaw
      if (g) {
        util = g.utilization ?? g.usage ?? g.util ?? g.gpuUsage ?? null
        memUsed = g.memoryUsed ?? g.memUsed ?? g.memory?.used ?? null
        memTotal = g.memoryTotal ?? g.memTotal ?? g.memory?.total ?? null
      }
    }
    return { time, util: util == null ? null : Number(util), memUsed: memUsed == null ? null : Number(memUsed), memTotal: memTotal == null ? null : Number(memTotal) }
  })

  if (!data.length) return null

  return (
    <div className="card">
      <div className="mb-2 font-medium">GPU Usage</div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip formatter={(value: any, name: any) => value == null ? '—' : (name === 'util' ? `${Number(value).toFixed(1)}%` : `${(Number(value)/1024/1024).toFixed(1)}MB`)} />
            <Line type="monotone" dataKey="util" stroke="#a78bfa" dot={false} strokeWidth={2} name="GPU %" />
            <Line type="monotone" dataKey="memUsed" stroke="#60a5fa" dot={false} strokeWidth={2} name="GPU mem (bytes)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function SwapChart({ history }: { history: Metrics[] }) {
  const data = history.map(h => ({ time: new Date(h.timestamp).toLocaleTimeString(), v: h.memory && h.memory.swapTotal ? ((h.memory.swapUsed || 0) / h.memory.swapTotal) * 100 : 0 }))
  return (
    <div className="card">
      <div className="mb-2 font-medium">Swap Usage</div>
      <div style={{ width: '100%', height: 140 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip formatter={(v: any) => v ? `${Number(v).toFixed(1)}%` : '0%'} />
            <Area type="monotone" dataKey="v" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.12} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CPUPerCore({ history }: { history: Metrics[] }) {
  const last = history[history.length - 1]
  const cores = last?.cpu?.cores || []

  // prepare series per core across history
  const series = useMemo(() => {
    const maxCores = Math.max(...history.map(h => h.cpu?.cores?.length || 0), cores.length)
    const arr: Array<{ time: string; [k: string]: number }> = history.map(h => ({ time: new Date(h.timestamp).toLocaleTimeString(), ...((h.cpu?.cores || []).reduce((acc: any, c: Core, i: number) => { acc[`c${i}`] = Number((c.load || 0).toFixed(2)); return acc }, {})) }))
    return { arr, maxCores }
  }, [history, cores.length])

  if (!history.length) return <div className="card">No data yet</div>

  const palette = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']

  return (
    <div className="card">
      <div className="mb-2 font-medium">Per-Core Load</div>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={series.arr}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            {Array.from({ length: series.maxCores }).map((_, i) => (
              <Area key={i} type="monotone" dataKey={`c${i}`} stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.15} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MemoryChart({ history }: { history: Metrics[] }) {
  const data = history.map(h => ({ time: new Date(h.timestamp).toLocaleTimeString(), used: h.memory ? (h.memory.used / h.memory.total) * 100 : 0 }))
  return (
    <div className="card">
      <div className="mb-2 font-medium">Memory Usage</div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="time" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="used" stroke="#ef4444" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MemDiskFlowChart({ history }: { history: Metrics[] }) {
  // Build series with memory percent and disk io (read/write) if present
  const raw = history.map(h => {
    const time = new Date(h.timestamp).toLocaleTimeString()
    const memPct = h.memory && h.memory.total ? (h.memory.used / h.memory.total) * 100 : 0
    // possible shapes for disk/io metrics (best-effort extraction)
    const r = h.disk?.read ?? h.io?.read ?? h.diskRead ?? h.disk?.r ?? 0
    const w = h.disk?.write ?? h.io?.write ?? h.diskWrite ?? h.disk?.w ?? 0
    const rN = Number(r) || 0
    const wN = Number(w) || 0
    return { time, memPct: Number(memPct.toFixed(2)), rRaw: rN, wRaw: wN }
  })

  // Choose display unit for IO (B/s, KB/s, MB/s) based on observed max
  const maxRaw = Math.max(...raw.map(d => Math.max(d.rRaw || 0, d.wRaw || 0)), 0)
  let ioUnit = 'B/s'
  let ioFactor = 1
  if (maxRaw >= 1024 * 1024) { ioUnit = 'MB/s'; ioFactor = 1024 * 1024 }
  else if (maxRaw >= 1024) { ioUnit = 'KB/s'; ioFactor = 1024 }

  // Prepare display fields (scaled)
  const data = raw.map(d => ({ ...d, r: +(d.rRaw / ioFactor).toFixed(2), w: +(d.wRaw / ioFactor).toFixed(2) }))

  const maxDisplayIO = Math.max(...data.map(d => Math.max(d.r || 0, d.w || 0)), 1)

  return (
    <div className="card">
      <div className="mb-2 font-medium">Memory vs Disk I/O (real-time)</div>
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 12, left: 6, bottom: 6 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, Math.ceil(maxDisplayIO * 1.15)]} tickFormatter={(v) => `${v}`} tick={{ fontSize: 11 }} />
            <Tooltip labelFormatter={(l) => `Time: ${l}`} formatter={(value: any, name: any) => {
              if (name === 'memPct') return `${Number(value).toFixed(1)}%`
              return `${Number(value).toFixed(2)} ${ioUnit}`
            }} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="memPct" stroke="#ef4444" fill="#ef4444" fillOpacity={0.06} name="Memory %" />
            <Line yAxisId="right" type="monotone" dataKey="r" stroke="#60a5fa" dot={false} strokeWidth={2} name={`Read (${ioUnit})`} />
            <Line yAxisId="right" type="monotone" dataKey="w" stroke="#f59e0b" dot={false} strokeWidth={2} name={`Write (${ioUnit})`} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProcessesTable({ processes, token }: { processes: any[]; token?: string | null }) {
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu')
  const [desc, setDesc] = useState(true)

  // columns configuration (local persisted)
  const allColumns = ['pid','user','priority','nice','virt','res','shr','state','cpu','memory','time','command','ppid','threads','start','cpuTime','flags']
  const defaultCols = ['pid','command','cpu','memory','user']
  const [visibleCols, setVisibleCols] = useState<string[]>(() => {
    try {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem('visibleCols') : null
      if (v) return JSON.parse(v)
    } catch (e) {}
    return defaultCols
  })
  const [showCols, setShowCols] = useState(false)

  // persist visibleCols
  useEffect(() => {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem('visibleCols', JSON.stringify(visibleCols)) } catch (e) {}
  }, [visibleCols])

  // process detail panel
  const [detailPid, setDetailPid] = useState<number|null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const openDetails = (pid: number) => { setDetailPid(pid); setDetailOpen(true) }
  const closeDetails = () => { setDetailPid(null); setDetailOpen(false) }

  // tree view state
  const [treeMode, setTreeMode] = useState(false)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggleExpanded = (pid: number) => setExpanded(e => ({ ...e, [pid]: !e[pid] }))

  const list = useMemo(() => {
    let out = processes.slice()
    if (filter) out = out.filter(p => ((p.name || p.command || '').toLowerCase().includes(filter.toLowerCase()) || String(p.pid).includes(filter)))
    out.sort((a, b) => {
      const get = (p: any) => sortBy === 'cpu' ? (p.cpu || 0) : sortBy === 'memory' ? (p.memory || 0) : sortBy === 'pid' ? p.pid : (p.name || '')
      const A = get(a), B = get(b)
      if (typeof A === 'number' && typeof B === 'number') return desc ? B - A : A - B
      return desc ? String(B).localeCompare(String(A)) : String(A).localeCompare(String(B))
    })
    return out
  }, [processes, filter, sortBy, desc])

  const doKill = async (pid: number) => {
    if (!window.confirm(`Kill process ${pid}?`)) return
    try {
      const res = await fetch(`http://localhost:4000/api/v1/servers/local/processes/${pid}/kill`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } })
      const j = await res.json()
      if (!res.ok) alert('Action failed: ' + (j.error || JSON.stringify(j)))
      else alert('Signal sent')
    } catch (e) {
      alert('Request failed')
    }
  }

  const doRenice = async (pid: number) => {
    const n = parseInt(prompt('New nice value (-20..19)', '0') || '0', 10)
    if (Number.isNaN(n)) return
    try {
      const res = await fetch(`http://localhost:4000/api/v1/servers/local/processes/${pid}/renice`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify({ nice: n }) })
      const j = await res.json()
      if (!res.ok) alert('Action failed: ' + (j.error || JSON.stringify(j)))
      else alert('Renice OK')
    } catch (e) {
      alert('Request failed')
    }
  }

  // build process tree by ppid
  const buildTree = (arr: any[]) => {
    const map = new Map<number, any>()
    arr.forEach(p => map.set(p.pid, { ...p, children: [] }))
    const roots: any[] = []
    arr.forEach(p => {
      const node = map.get(p.pid)
      const parent = p.ppid ? map.get(p.ppid) : null
      if (parent) parent.children.push(node)
      else roots.push(node)
    })
    return roots
  }

  const treeRoots = useMemo(() => buildTree(list), [list])

  const renderRow = (p: any, level = 0) => {
    const hasChildren = p.children && p.children.length > 0
    return (
      <React.Fragment key={p.pid}>
        <tr className={`border-b proc-row`} role="treeitem" aria-expanded={hasChildren ? !!expanded[p.pid] : undefined} tabIndex={0}>
          {visibleCols.includes('pid') && <td className="px-2 py-1" title={String(p.pid)}>{p.pid}</td>}
          {(visibleCols.includes('command') || visibleCols.includes('name')) && <td className="px-2 py-1 col-command" title={String(p.name ?? p.command)}>
            <div className="proc-name">
              <span style={{ paddingLeft: level * 12 }} className="proc-indent" />
              {hasChildren && (
                <button className="proc-toggle" aria-label={expanded[p.pid] ? 'Collapse' : 'Expand'} onClick={() => toggleExpanded(p.pid)}>
                  {expanded[p.pid] ? '▾' : '▸'}
                </button>
              )}
              <span>{p.name ?? p.command}</span>
            </div>
          </td>}
          {visibleCols.includes('priority') && <td className="px-2 py-1" title={String(p.priority ?? '-')}>{p.priority ?? '-'}</td>}
          {visibleCols.includes('nice') && <td className="px-2 py-1" title={String(p.nice ?? '-')}>{p.nice ?? '-'}</td>}
          {visibleCols.includes('virt') && <td className="px-2 py-1" title={String(p.virt ?? '-')}><span>{p.virt ?? '-'}</span></td>}
          {visibleCols.includes('res') && <td className="px-2 py-1" title={String(p.res ?? '-')}><span>{p.res ?? '-'}</span></td>}
          {visibleCols.includes('shr') && <td className="px-2 py-1" title={String(p.shr ?? '-')}><span>{p.shr ?? '-'}</span></td>}
          {visibleCols.includes('state') && <td className="px-2 py-1" title={String(p.state ?? '-')}>{p.state ?? '-'}</td>}
          {visibleCols.includes('cpu') && <td className="px-2 py-1 text-right" title={String(p.cpu ?? '0')}>{(p.cpu || 0).toFixed ? (p.cpu as number).toFixed(1) : p.cpu}</td>}
          {visibleCols.includes('memory') && <td className="px-2 py-1 text-right" title={p.memory ? String((p.memory / 1024 / 1024).toFixed(1) + 'MB') : '-'}>{p.memory ? (p.memory / 1024 / 1024).toFixed(1) + 'MB' : '-'}</td>}
          {visibleCols.includes('time') && <td className="px-2 py-1" title={String(p.time ?? '-')}>{p.time ?? '-'}</td>}
          {visibleCols.includes('user') && <td className="px-2 py-1" title={String(p.user ?? '-')}>{p.user}</td>}
          {visibleCols.includes('threads') && <td className="px-2 py-1" title={String(p.threads ?? '-')}>{p.threads ?? '-'}</td>}
          {visibleCols.includes('start') && <td className="px-2 py-1" title={String(p.start ?? '-')}>{p.start ?? '-'}</td>}
          {visibleCols.includes('cpuTime') && <td className="px-2 py-1" title={String(p.cpuTime ?? '-')}>{p.cpuTime ?? '-'}</td>}
          {visibleCols.includes('ppid') && <td className="px-2 py-1" title={String(p.ppid ?? '-')}>{p.ppid ?? '-'}</td>}
          {visibleCols.includes('flags') && <td className="px-2 py-1" title={String(p.flags ?? '-')}>{p.flags ?? '-'}</td>}
          <td className="px-2 py-1">
            <div className="flex gap-2">
              <button onClick={() => doKill(p.pid)} className="action-btn kill">Kill</button>
              <button onClick={() => doRenice(p.pid)} className="action-btn renice">Renice</button>
              <button onClick={() => openDetails(p.pid)} className="btn btn-ghost">Details</button>
            </div>
          </td>
        </tr>
        {hasChildren && expanded[p.pid] && p.children.map((c: any) => renderRow(c, level + 1))}
      </React.Fragment>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="processes-toolbar">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input placeholder="Search by name or pid" value={filter} onChange={e => setFilter(e.target.value)} className="search-input" />
            <label className="text-sm muted" style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="checkbox" checked={treeMode} onChange={e => setTreeMode(e.target.checked)} aria-label="Toggle tree view" /> <span>Tree</span>
            </label>
          </div>
          <div className="proc-header">
            <div className="controls">
              <label style={{display:'flex',alignItems:'center',gap:6}}>Sort:
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="select-input">
                  <option value="cpu">CPU</option>
                  <option value="memory">Memory</option>
                  <option value="pid">PID</option>
                  <option value="name">Name</option>
                </select>
              </label>
              <button onClick={() => setDesc(d => !d)} className="btn btn-ghost">{desc ? 'desc' : 'asc'}</button>
              <button onClick={() => setShowCols(s => !s)} className="btn btn-ghost">Columns</button>
            </div>
          </div>
        </div>
      </div>

      {showCols && (
        <div className="mb-2 p-2 border rounded">
          {allColumns.map(c => (
            <label key={c} style={{ marginRight: 8 }}>
              <input type="checkbox" checked={visibleCols.includes(c)} onChange={e => setVisibleCols(cols => e.target.checked ? [...cols, c] : cols.filter(x => x !== c))} /> {c}
            </label>
          ))}
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight: '72vh' }}>
        <table className="w-full text-sm process-table" role="tree">
          <thead className="text-left border-b">
            <tr>
              {visibleCols.includes('pid') && <th className="px-2 py-1 col-pid">PID</th>}
              {visibleCols.includes('user') && <th className="px-2 py-1">USER</th>}
              {visibleCols.includes('priority') && <th className="px-2 py-1">PRI</th>}
              {visibleCols.includes('nice') && <th className="px-2 py-1">NI</th>}
              {visibleCols.includes('virt') && <th className="px-2 py-1">VIRT</th>}
              {visibleCols.includes('res') && <th className="px-2 py-1">RES</th>}
              {visibleCols.includes('shr') && <th className="px-2 py-1">SHR</th>}
              {visibleCols.includes('state') && <th className="px-2 py-1">S</th>}
              {visibleCols.includes('cpu') && <th className="px-2 py-1 col-cpu">CPU%</th>}
              {visibleCols.includes('memory') && <th className="px-2 py-1 col-mem">Mem</th>}
              {visibleCols.includes('time') && <th className="px-2 py-1">TIME+</th>}
              {visibleCols.includes('command') && <th className="px-2 py-1">Command</th>}
              {visibleCols.includes('ppid') && <th className="px-2 py-1">PPID</th>}
              {visibleCols.includes('threads') && <th className="px-2 py-1">THR</th>}
              {visibleCols.includes('start') && <th className="px-2 py-1">START</th>}
              {visibleCols.includes('cpuTime') && <th className="px-2 py-1">CPU Time</th>}
              {visibleCols.includes('flags') && <th className="px-2 py-1">FLG</th>}
              <th className="px-2 py-1 col-actions">Actions</th>
            </tr>
          </thead>
            <tbody>
            {!treeMode && list.map(p => (
              <tr key={p.pid} className="border-b proc-row">
                {visibleCols.includes('pid') && <td className="px-2 py-1 col-pid" title={String(p.pid)}>{p.pid}</td>}
                {visibleCols.includes('user') && <td className="px-2 py-1" title={String(p.user ?? '-')}>{p.user ?? '-'}</td>}
                {visibleCols.includes('priority') && <td className="px-2 py-1" title={String(p.priority ?? '-')}>{p.priority ?? '-'}</td>}
                {visibleCols.includes('nice') && <td className="px-2 py-1" title={String(p.nice ?? '-')}>{p.nice ?? '-'}</td>}
                {visibleCols.includes('virt') && <td className="px-2 py-1" title={String(p.virt ?? '-')}>{p.virt ?? '-'}</td>}
                {visibleCols.includes('res') && <td className="px-2 py-1" title={String(p.res ?? '-')}>{p.res ?? '-'}</td>}
                {visibleCols.includes('shr') && <td className="px-2 py-1" title={String(p.shr ?? '-')}>{p.shr ?? '-'}</td>}
                {visibleCols.includes('state') && <td className="px-2 py-1" title={String(p.state ?? '-')}>{p.state ?? '-'}</td>}
                {visibleCols.includes('cpu') && <td className="px-2 py-1 col-cpu" title={String(p.cpu ?? '0')}>{(p.cpu || 0).toFixed ? (p.cpu as number).toFixed(1) : p.cpu}</td>}
                {visibleCols.includes('memory') && <td className="px-2 py-1 col-mem" title={p.memory ? String((p.memory / 1024 / 1024).toFixed(1) + 'MB') : '-'}>{p.memory ? (p.memory / 1024 / 1024).toFixed(1) + 'MB' : '-'}</td>}
                {visibleCols.includes('time') && <td className="px-2 py-1" title={String(p.time ?? '-')}>{p.time ?? '-'}</td>}
                {visibleCols.includes('command') && <td className="px-2 py-1 col-command" title={String(p.command ?? p.name)}>{p.command ?? p.name}</td>}
                {visibleCols.includes('ppid') && <td className="px-2 py-1" title={String(p.ppid ?? '-')}>{p.ppid ?? '-'}</td>}
                {visibleCols.includes('threads') && <td className="px-2 py-1" title={String(p.threads ?? '-')}>{p.threads ?? '-'}</td>}
                {visibleCols.includes('start') && <td className="px-2 py-1" title={String(p.start ?? '-')}>{p.start ?? '-'}</td>}
                {visibleCols.includes('cpuTime') && <td className="px-2 py-1" title={String(p.cpuTime ?? '-')}>{p.cpuTime ?? '-'}</td>}
                {visibleCols.includes('flags') && <td className="px-2 py-1" title={String(p.flags ?? '-')}>{p.flags ?? '-'}</td>}
                <td className="px-2 py-1 col-actions">
                  <div className="flex gap-2">
                    <button onClick={() => doKill(p.pid)} className="action-btn kill">Kill</button>
                    <button onClick={() => doRenice(p.pid)} className="action-btn renice">Renice</button>
                    <button onClick={() => openDetails(p.pid)} className="btn btn-ghost">Details</button>
                  </div>
                </td>
              </tr>
            ))}

            {treeMode && treeRoots.map(r => renderRow(r, 0))}
          </tbody>
        </table>
      </div>
      {/* Details panel */}
      {detailOpen && (
        <div className="mt-4 card">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Process details: {detailPid}</div>
            <div>
              <button className="btn btn-ghost" onClick={closeDetails}>Close</button>
            </div>
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto', fontSize: 13 }}>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(processes.find(p=>p.pid===detailPid) || {}, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar({ servers = [] as string[], onSelect = (s: string) => {} }: { servers?: string[]; onSelect?: (s: string) => void }) {
  return (
    <aside className="w-64 border-r h-full hidden md:flex flex-col">
      <div className="card">
        <div className="px-4 py-4 border-b font-semibold">Navigation</div>
        <nav className="flex-1 px-2 py-3">
          <ul className="space-y-1">
            <li>
              <button className="w-full text-left px-3 py-2 rounded sidebar-link">Dashboard</button>
            </li>
            <li>
              <button className="w-full text-left px-3 py-2 rounded sidebar-link">Servers</button>
            </li>
            <li>
              <button className="w-full text-left px-3 py-2 rounded sidebar-link">Alerts</button>
            </li>
            <li>
              <button className="w-full text-left px-3 py-2 rounded sidebar-link">Settings</button>
            </li>
          </ul>
        </nav>
        <div className="px-3 py-3 border-t">
          <div className="text-xs muted mb-2">Servers</div>
          <div className="space-y-1">
            {servers.length ? servers.map(s => (
              <button key={s} onClick={() => onSelect(s)} className="block w-full text-left px-3 py-1 rounded sidebar-link">{s}</button>
            )) : <div className="text-sm muted px-3">No servers</div>}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  const [metricsHistory, setMetricsHistory] = useState<Metrics[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [token, setToken] = useState<string | null>(null)
  const socketRef = useRef<any | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedServer, setSelectedServer] = useState('local')
  const [theme, setTheme] = useState<'light'|'night'>(() => {
    if (typeof window === 'undefined') return 'light'
    const t = localStorage.getItem('theme')
    if (t === 'night' || t === 'light') return t as 'light'|'night'
    if (t === 'blue') return 'night' // migrate older value
    return 'light'
  })

  useEffect(() => {
    let mounted = true
    const login = async () => {
      try {
        const r = await fetch('http://localhost:4000/api/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'guest' }) })
        const j = await r.json()
        if (!r.ok) return
        setToken(j.token)
        const socket = io('http://localhost:4000', { auth: { token: j.token } })
        socketRef.current = socket
        socket.on('connect', () => socket.emit('subscribe', { serverId: 'local' }))
        socket.on('metrics:update', (payload: any) => {
          if (!mounted) return
          setMetricsHistory(prev => {
            const next = [...prev, { timestamp: payload.timestamp, cpu: payload.cpu, memory: payload.memory, gpu: payload.gpu, processCount: payload.processes ? payload.processes.length : undefined }]
            if (next.length > 120) next.shift()
            return next
          })
          if (payload.processes && Array.isArray(payload.processes)) {
            setProcesses(payload.processes)
          }
        })
      } catch (e) {
        console.warn('login failed')
      }
    }
    login()

    return () => { mounted = false; if (socketRef.current) { socketRef.current.emit('unsubscribe'); socketRef.current.disconnect() } }
  }, [])

  // apply theme to document root and persist
  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        if (theme === 'night') document.documentElement.setAttribute('data-theme', 'night')
        else document.documentElement.removeAttribute('data-theme')
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', theme)
    } catch (e) {}
  }, [theme])

  useEffect(() => {
    let mounted = true
    const loadProcesses = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/v1/servers/local/processes', { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        const j = await res.json()
        if (!mounted) return
        if (j?.processes) setProcesses(j.processes)
        else if (Array.isArray(j)) setProcesses(j)
      } catch (e) {}
    }
    loadProcesses()
    const iv = setInterval(loadProcesses, 5000)
    return () => { mounted = false; clearInterval(iv) }
  }, [token])

  const latest = metricsHistory[metricsHistory.length - 1]

  const logout = () => { setToken(null); if (socketRef.current) { socketRef.current.emit('unsubscribe'); socketRef.current.disconnect(); socketRef.current = null } }

  const toggleSidebar = () => setSidebarOpen(s => !s)
  const toggleTheme = () => setTheme(t => t === 'night' ? 'light' : 'night')

  const servers = ['local']

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* Sidebar for md+ */}
        <Sidebar servers={servers} onSelect={(s) => setSelectedServer(s)} />

        {/* Mobile off-canvas drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black opacity-30" onClick={() => setSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-64 card shadow">
              <Sidebar servers={servers} onSelect={(s) => { setSelectedServer(s); setSidebarOpen(false) }} />
            </div>
          </div>
        )}

        <main className="flex-1 p-6">
          <div className="container">
            <div className="topbar card" role="banner">
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <span className="logo" aria-hidden />
                <div style={{display:'flex',flexDirection:'column'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="brand" aria-hidden>Realtime Monitor</span>
                    <span className="server-pill">{selectedServer}</span>
                  </div>
                  <div style={{fontSize:12, color:'var(--muted)'}}>Selected server: <strong style={{color:'var(--text-color)'}}>{selectedServer}</strong></div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button className="btn btn-ghost" onClick={toggleSidebar} aria-label="Toggle sidebar">☰</button>
                <button title="Toggle theme" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                  {theme === 'night' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                </button>
                <button className="btn btn-ghost" onClick={logout}>Logout</button>
              </div>
            </div>

            <div className="mb-4 text-sm muted">Selected server: <strong>{selectedServer}</strong></div>
            <SystemCards latest={latest} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <CPUPerCore history={metricsHistory} />
              <div className="mt-4">
                <MemoryChart history={metricsHistory} />
              </div>
              <div className="mt-4">
                <MemDiskFlowChart history={metricsHistory} />
              </div>
                <div className="mt-4">
                  <GPUUsageChart history={metricsHistory} />
                </div>
            </div>

            <div>
              <ProcessesTable processes={processes} token={token} />
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}
