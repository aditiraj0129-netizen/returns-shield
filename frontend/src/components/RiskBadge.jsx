export default function RiskBadge({ bucket }) {
  const map = {
    auto_approve:       { label: '✓ Auto Approved', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
    manual_review:      { label: '⚠ Manual Review', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
    reject_investigate: { label: '✕ Investigate', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  }
  const s = map[bucket] || map.manual_review
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      padding: '4px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
    }}>{s.label}</span>
  )
}