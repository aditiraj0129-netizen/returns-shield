import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const QUICK = [
  "How do I return an item?",
  "How does fraud detection work?",
  "How long for a refund?",
  "What damages are detected?",
  "What is Returns Shield?",
]

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm the Returns Shield assistant. I can help with return policies, damage detection, fraud scoring, and refund timelines. What would you like to know?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(p => [...p, { from: 'user', text: msg }])
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('message', msg)
      const res = await axios.post('http://localhost:8000/returns/chat', fd)
      setMessages(p => [...p, { from: 'bot', text: res.data.reply }])
    } catch {
      setMessages(p => [...p, { from: 'bot', text: 'Sorry, I am having trouble connecting. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
        width: 56, height: 56,
        background: open ? '#ef4444' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        border: 'none', borderRadius: '50%', cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
        fontSize: 22, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s'
      }}>
        {open ? '✕' : '💬'}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 999,
          width: 360, height: 520,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'fadeIn 0.25s ease'
        }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡️</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Returns Shield AI</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, background: '#4ade80', borderRadius: '50%' }} />
                  <p style={{ fontSize: 11, opacity: 0.85 }}>Online · Instant replies</p>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: m.from === 'user' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#f1f5f9',
                  color: m.from === 'user' ? '#fff' : '#1e293b',
                  fontSize: 13, lineHeight: 1.5
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#f1f5f9', borderRadius: '18px 18px 18px 4px', width: 'fit-content' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, background: '#94a3b8', borderRadius: '50%', animation: `pulse 1s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                whiteSpace: 'nowrap', padding: '5px 10px',
                background: '#ede9fe', color: '#4f46e5',
                border: 'none', borderRadius: 20,
                fontSize: 11, fontWeight: 600, cursor: 'pointer'
              }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about returns..."
              style={{ flex: 1, padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 20, fontSize: 13, outline: 'none', color: '#1e293b' }}
            />
            <button onClick={() => send()} style={{
              width: 38, height: 38, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              border: 'none', borderRadius: '50%', cursor: 'pointer',
              color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>→</button>
          </div>
        </div>
      )}
    </>
  )
}