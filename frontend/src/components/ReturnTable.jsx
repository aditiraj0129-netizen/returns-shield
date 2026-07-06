import { useState } from 'react'
import RiskBadge from './RiskBadge'
import { makeDecision } from '../api'

export default function ReturnTable({ returns, onRefresh }) {
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(null)

  const decide = async (id, decision, e) => {
    e.stopPropagation()
    setLoading(`${id}-${decision}`)
    try {
      await makeDecision(id, decision)
      onRefresh()
    } catch(err) {
      alert('Error: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(null)
    }
  }

  if (returns.length === 0) return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p style={{ color: '#94a3b8', fontSize: 15 }}>No return requests yet. Submit one to get started!</p>
    </div>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>Return Requests</h2>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Click any row to expand details · Approve or reject flagged returns</p>
        </div>
        <span style={{ fontSize: 13, background: '#f1f5f9', color: '#64748b', padding: '4px 12px', borderRadius: 20, fontWeight: 600 }}>
          {returns.length} requests
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['ID', 'Product', 'Reason', 'Risk Level', 'Fraud', 'Damage', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {returns.map((r, i) => (
              <>
                <tr key={r.id}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  style={{ borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: expanded === r.id ? '#fafbff' : '#fff', transition: 'background 0.15s' }}
                  onMouseEnter={e => { if (expanded !== r.id) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (expanded !== r.id) e.currentTarget.style.background = '#fff' }}
                >
                  <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#4f46e5' }}>#{r.id}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name}</div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                  <td style={{ padding: '14px 16px' }}><RiskBadge bucket={r.risk_bucket} /></td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((r.fraud_score||0)*100)}%`, height: '100%', background: r.fraud_score > 0.6 ? '#ef4444' : r.fraud_score > 0.3 ? '#f59e0b' : '#10b981', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.fraud_score > 0.6 ? '#ef4444' : r.fraud_score > 0.3 ? '#d97706' : '#16a34a' }}>
                        {Math.round((r.fraud_score||0)*100)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 40, height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round((r.damage_score||0)*100)}%`, height: '100%', background: r.damage_score > 0.5 ? '#ef4444' : '#10b981', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.damage_score > 0.5 ? '#ef4444' : '#16a34a' }}>
                        {Math.round((r.damage_score||0)*100)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {r.reviewed
                      ? <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>✓ Reviewed</span>
                      : <span style={{ fontSize: 11, background: '#fef9c3', color: '#a16207', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>Pending</span>
                    }
                  </td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    {!r.reviewed ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={(e) => decide(r.id, 'approved', e)} disabled={!!loading}
                          style={{ padding: '5px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {loading === `${r.id}-approved` ? '...' : 'Approve'}
                        </button>
                        <button onClick={(e) => decide(r.id, 'rejected', e)} disabled={!!loading}
                          style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {loading === `${r.id}-rejected` ? '...' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 700, color: r.final_decision === 'approved' ? '#16a34a' : '#dc2626' }}>
                        {r.final_decision === 'approved' ? '✓ Approved' : '✕ Rejected'}
                      </span>
                    )}
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr key={`detail-${r.id}`}>
                    <td colSpan={8} style={{ background: '#fafbff', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Score Analysis</p>
                          {[['Fraud Risk', r.fraud_score], ['Damage', r.damage_score]].map(([label, val]) => {
                            const pct = Math.round((val||0)*100)
                            const col = pct > 60 ? '#ef4444' : pct > 30 ? '#f59e0b' : '#10b981'
                            return (
                              <div key={label} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span style={{ color: '#64748b' }}>{label}</span>
                                  <span style={{ fontWeight: 700, color: col }}>{pct}%</span>
                                </div>
                                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 99, transition: 'width 0.5s' }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>Return Details</p>
                          {[['Order ID', `#${r.order_id}`], ['Reason', r.reason], ['Submitted', r.requested_at ? new Date(r.requested_at).toLocaleString() : 'N/A']].map(([k, v]) => (
                            <div key={k} style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{k}: </span>
                              <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12 }}>AI Decision</p>
                          <RiskBadge bucket={r.risk_bucket} />
                          <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
                            {r.risk_bucket === 'auto_approve' && 'Low fraud signals and minor damage detected. System auto-approved this return.'}
                            {r.risk_bucket === 'manual_review' && 'Moderate risk signals detected. A human reviewer should verify this return.'}
                            {r.risk_bucket === 'reject_investigate' && 'High fraud probability detected. This return has been flagged for investigation.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
               