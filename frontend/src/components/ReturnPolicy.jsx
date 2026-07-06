import { useState } from 'react'

const RULES = [
  { icon: '🚫', text: 'Item has NOT been used, worn, or washed after purchase' },
  { icon: '🏷️', text: 'Original tags and packaging are intact (unless item arrived defective)' },
  { icon: '🧼', text: 'Item is free from stains, odors, or personal modifications' },
  { icon: '📦', text: 'All accessories, manuals, and parts are included' },
  { icon: '📷', text: 'I have uploaded a clear, unedited photo of the actual item' },
  { icon: '⚖️', text: 'I understand that fraudulent returns may result in account suspension' },
]

export default function ReturnPolicy({ onAccept }) {
  const [checked, setChecked] = useState({})

  const allChecked = RULES.every((_, i) => checked[i])

  const toggle = (i) => setChecked(p => ({ ...p, [i]: !p[i] }))

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div>
          <p style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>Return Eligibility Checklist</p>
          <p style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>Please confirm all points before submitting. False declarations may result in claim rejection and account review.</p>
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {RULES.map((rule, i) => (
          <label key={i} onClick={() => toggle(i)} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '10px', marginBottom: 4,
            borderRadius: 8, cursor: 'pointer',
            background: checked[i] ? '#f0fdf4' : '#fafafa',
            border: `1px solid ${checked[i] ? '#86efac' : '#f1f5f9'}`,
            transition: 'all 0.15s'
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
              border: `2px solid ${checked[i] ? '#10b981' : '#d1d5db'}`,
              background: checked[i] ? '#10b981' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}>
              {checked[i] && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.4 }}>
              <span style={{ marginRight: 6 }}>{rule.icon}</span>
              {rule.text}
            </span>
          </label>
        ))}

        <button
          onClick={onAccept}
          disabled={!allChecked}
          style={{
            width: '100%', marginTop: 12, padding: '12px',
            background: allChecked ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#e2e8f0',
            color: allChecked ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: allChecked ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}>
          {allChecked ? '✓ I Confirm — Proceed to Submit' : `Check all ${RULES.length} boxes to continue`}
        </button>
      </div>
    </div>
  )
}