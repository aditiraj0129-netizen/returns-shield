export default function Header({ tab, setTab, onRefresh, live }) {
  return (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 8px rgba(0,0,0,0.06)'
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🛡️
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Returns Shield</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>AI Fraud Detection Platform</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'submit', label: '+ New Return' },
            { key: 'guide', label: '📖 How It Works' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#4f46e5' : '#64748b',
              fontWeight: tab === key ? 700 : 500,
              fontSize: 13,
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </nav>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '5px 12px' }}>
            <div style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%' }} className="pulse" />
            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Live</span>
          </div>
          <button onClick={onRefresh} style={{
            padding: '7px 14px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, transition: 'background 0.2s'
          }}>↻ Refresh</button>
        </div>
      </div>
    </header>
  )
}