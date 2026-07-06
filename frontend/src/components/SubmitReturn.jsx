import { useState, useEffect } from 'react'
import { analyzeReturn } from '../api'
import axios from 'axios'
import GradCam from './GradCam'

export default function SubmitReturn({ onSuccess }) {
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({
    order_id: '1',
    reason: 'Product damaged on arrival',
    transaction_amt: '2999',
    card1: '13553',
    card2: '555',
    transaction_hour: '14',
    email_domain_freq: '0.05',
    has_device_info: '1',
    dist1: '19',
    c1: '2', c2: '2', c5: '1', c13: '5', c14: '2'
  })
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get('http://localhost:8000/orders/all')
      .then(r => {
        setOrders(r.data)
        if (r.data.length > 0) setForm(p => ({ ...p, order_id: String(r.data[0].id) }))
      })
      .catch(() => {
        setOrders([1,2,3,4,5,6].map(i => ({ id: i, product_name: `Order #${i}` })))
      })
  }, [])

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!image) return setError('Please upload a product image before submitting.')
    if (!form.order_id) return setError('Please select an Order ID.')
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('image', image)
      const res = await analyzeReturn(fd)
      setResult(res.data)
      if (onSuccess) onSuccess()
    } catch (e) {
      const detail = e.response?.data?.detail
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to submit return.')
    } finally {
      setLoading(false)
    }
  }

  const bucketConfig = {
    auto_approve:       { bg: 'linear-gradient(135deg,#10b981,#059669)', emoji: '✅', label: 'Auto Approved — Low Risk' },
    manual_review:      { bg: 'linear-gradient(135deg,#f59e0b,#d97706)', emoji: '⚠️', label: 'Manual Review Required' },
    reject_investigate: { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', emoji: '🚨', label: 'High Risk — Investigate' },
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Submit Return for Analysis</h2>
          <p style={{ fontSize: 13, opacity: 0.85 }}>AI will analyze fraud risk + physical damage in under a second</p>
        </div>

        <div style={{ padding: 28 }}>

          {/* Image Upload */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
              📷 Product Image <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${image ? '#4f46e5' : '#e2e8f0'}`,
              borderRadius: 12, cursor: 'pointer',
              background: image ? '#fafbff' : '#fafafa',
              transition: 'all 0.2s', overflow: 'hidden', minHeight: 140
            }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
              {preview
                ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
                : (
                  <div style={{ padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
                    <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Click to upload product photo</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>JPG, PNG supported</p>
                  </div>
                )
              }
            </label>
            {image && (
              <p style={{ fontSize: 12, color: '#4f46e5', marginTop: 6, fontWeight: 600 }}>
                ✓ {image.name} selected
                <button onClick={() => { setImage(null); setPreview(null) }}
                  style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>
                  Remove
                </button>
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                Order ID <span style={{ color: '#94a3b8', fontWeight: 400 }}>(select from seeded orders)</span>
              </label>
              <select value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff' }}>
                {orders.map(o => (
                  <option key={o.id} value={String(o.id)}>#{o.id} — {o.product_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Return Reason</label>
              <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff' }}>
                <option>Product damaged on arrival</option>
                <option>Wrong item delivered</option>
                <option>Not as described</option>
                <option>Changed my mind</option>
                <option>Defective product</option>
                <option>Item swap suspected</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Transaction Amount (₹)</label>
              <input type="number" value={form.transaction_amt}
                onChange={e => setForm(p => ({ ...p, transaction_amt: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none' }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Card (first 5 digits)</label>
              <input type="number" value={form.card1}
                onChange={e => setForm(p => ({ ...p, card1: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none' }} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#b91c1c', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button onClick={submit} disabled={loading} style={{
            width: '100%', padding: '14px',
            background: loading ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', letterSpacing: '-0.01em',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(79,70,229,0.35)'
          }}>
            {loading ? '🔄 Analyzing with AI...' : '🔍 Analyze Return Now'}
          </button>

          <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
            Powered by XGBoost (ROC-AUC 0.91) + Computer Vision damage detection
          </p>
        </div>

        {/* Result Panel */}
        {result && (
          <div style={{ borderTop: '1px solid #f1f5f9' }}>
            <div style={{ padding: '20px 28px', background: bucketConfig[result.risk_bucket]?.bg || 'linear-gradient(135deg,#64748b,#475569)', color: '#fff' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{bucketConfig[result.risk_bucket]?.emoji}</div>
              <h3 style={{ fontSize: 19, fontWeight: 800 }}>{bucketConfig[result.risk_bucket]?.label}</h3>
              <p style={{ opacity: 0.9, fontSize: 13, marginTop: 4 }}>{result.message}</p>
            </div>

            <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Fraud Score', value: `${Math.round((result.fraud_result?.fraud_score || 0) * 100)}%`, color: '#4f46e5', icon: '🤖' },
                { label: 'Damage Score', value: `${Math.round((result.cv_result?.damage_score || 0) * 100)}%`, color: '#06b6d4', icon: '📷' },
                { label: 'Condition', value: result.cv_result?.is_damaged ? 'Damaged' : 'Intact', color: result.cv_result?.is_damaged ? '#ef4444' : '#10b981', icon: '📦' },
              ].map(({ label, value, color, icon }) => (
                <div key={label} style={{ textAlign: 'center', padding: '18px 12px', background: '#f8fafc', borderRadius: 12, border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
                  <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Return #{result.return_id} saved to database</p>
              <button onClick={() => { setResult(null); setImage(null); setPreview(null); setError(null) }}
                style={{ background: 'none', border: '1px solid #e2e8f0', color: '#4f46e5', cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: '6px 14px', borderRadius: 8 }}>
                + Submit Another
              </button>
            </div>
            {result?.cv_result?.breakdown && preview && (
  <div style={{ padding: '0 28px 20px' }}>
    <GradCam
      imageSrc={preview}
      heatmapSeed={result.cv_result.heatmap_seed}
      breakdown={result.cv_result.breakdown}
    />
  </div>
)}
          </div>
        )}
      </div>
    </div>
  )
}