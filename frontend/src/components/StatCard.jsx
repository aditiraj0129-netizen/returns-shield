import { useEffect, useState } from 'react'

export default function StatCard({ label, value, color, icon, subtitle }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let start = 0
    const end = parseInt(value) || 0
    if (end === 0) return setDisplayed(0)
    const step = Math.ceil(end / 20)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setDisplayed(end); clearInterval(timer) }
      else setDisplayed(start)
    }, 40)
    return () => clearInterval(timer)
  }, [value])

  const configs = {
    indigo: { gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)', light: '#ede9fe', text: '#4f46e5', border: '#c4b5fd' },
    green:  { gradient: 'linear-gradient(135deg, #10b981, #059669)', light: '#dcfce7', text: '#16a34a', border: '#86efac' },
    amber:  { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', light: '#fef9c3', text: '#ca8a04', border: '#fde047' },
    red:    { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', light: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  }
  const c = configs[color] || configs.indigo

  return (
    <div className="animate-in" style={{
      background: '#fff', borderRadius: 16, padding: '24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      border: `1px solid ${c.border}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default',
      position: 'relative', overflow: 'hidden'
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: c.light, borderRadius: '50%', opacity: 0.6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <div>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: c.text, lineHeight: 1, letterSpacing: '-0.02em' }}>{displayed}</p>
          {subtitle && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{subtitle}</p>}
        </div>
        <div style={{ width: 44, height: 44, background: c.gradient, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {icon}
        </div>
      </div>
    </div>
  )
}