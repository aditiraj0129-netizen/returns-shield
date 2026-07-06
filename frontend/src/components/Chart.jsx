import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export default function Chart({ stats, returns }) {
  const pieData = [
    { name: 'Auto Approved', value: stats.auto_approve || 0, color: '#10b981' },
    { name: 'Manual Review', value: stats.manual_review || 0, color: '#f59e0b' },
    { name: 'Investigating', value: stats.reject_investigate || 0, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const barData = returns.slice(0, 8).map(r => ({
    id: `#${r.id}`,
    fraud: Math.round((r.fraud_score || 0) * 100),
    damage: Math.round((r.damage_score || 0) * 100),
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Risk Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
              {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
          {pieData.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>{d.name} ({d.value})</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Fraud vs Damage Scores</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`]} />
            <Bar dataKey="fraud" name="Fraud" fill="#4f46e5" radius={[4,4,0,0]} />
            <Bar dataKey="damage" name="Damage" fill="#06b6d4" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}