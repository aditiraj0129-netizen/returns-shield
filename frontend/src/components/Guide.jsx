export default function Guide() {
  const steps = [
    { n: '01', icon: '📦', title: 'Customer Initiates Return', desc: 'When a customer requests a return, the ops team submits the order details and a photo of the returned item through Returns Shield.' },
    { n: '02', icon: '🤖', title: 'AI Fraud Scoring', desc: 'Our XGBoost model (ROC-AUC: 0.91, trained on 590k transactions) analyses behavioral signals — transaction amount, card patterns, account age, email domain frequency — to compute a fraud probability score.' },
    { n: '03', icon: '📷', title: 'CV Damage Detection', desc: 'Computer vision analyses the uploaded product photo to detect physical damage or tampering, scoring it from 0% (pristine) to 100% (severely damaged).' },
    { n: '04', icon: '⚖️', title: 'Risk Triage Decision', desc: 'Both signals are fused into a final risk bucket: Auto Approve (low risk), Manual Review (moderate), or Reject & Investigate (high fraud probability).' },
    { n: '05', icon: '👩‍💼', title: 'Human-in-the-Loop', desc: 'Manual review cases appear in the dashboard where ops agents can approve or reject with full score explanations — making the AI decision transparent and auditable.' },
  ]

  const features = [
    { icon: '🎯', label: '0.91 ROC-AUC', desc: 'Fraud model accuracy' },
    { icon: '⚡', label: '<200ms', desc: 'Analysis response time' },
    { icon: '🔍', label: '13 Features', desc: 'Behavioral signals tracked' },
    { icon: '🧠', label: 'XGBoost + CV', desc: 'Dual-model pipeline' },
  ]

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 20, padding: '40px', color: '#fff', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em' }}>How Returns Shield Works</h1>
        <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          An AI-powered returns fraud detection system that fuses machine learning and computer vision to protect e-commerce operations.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {features.map(f => (
          <div key={f.label} style={{ background: '#fff', borderRadius: 12, padding: '20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5', marginBottom: 2 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>The Analysis Pipeline</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 20, paddingBottom: i < steps.length - 1 ? 24 : 0, position: 'relative' }}>
              {i < steps.length - 1 && <div style={{ position: 'absolute', left: 20, top: 44, width: 2, height: 'calc(100% - 20px)', background: '#e2e8f0' }} />}
              <div style={{ flexShrink: 0, width: 40, height: 40, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 8px rgba(79,70,229,0.3)', position: 'relative', zIndex: 1 }}>
                {s.icon}
              </div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#4f46e5', background: '#ede9fe', padding: '2px 7px', borderRadius: 20 }}>{s.n}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{s.title}</h3>
                </div>
                <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>Quick Start Guide</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { step: '1', text: 'Go to "+ New Return" tab and fill in the order details' },
            { step: '2', text: 'Upload a clear photo of the returned product' },
            { step: '3', text: 'Click "Analyze Return Now" — AI processes in real time' },
            { step: '4', text: 'Review the risk score and approve/reject from Dashboard' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ width: 28, height: 28, background: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{step}</div>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: 16, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>Tech Stack</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['Python', 'FastAPI', 'XGBoost', 'TensorFlow', 'PostgreSQL', 'React', 'Docker', 'Recharts', 'IEEE-CIS Dataset', 'EfficientNetB0'].map(t => (
            <span key={t} style={{ fontSize: 12, background: '#fff', border: '1px solid #e2e8f0', color: '#4f46e5', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}