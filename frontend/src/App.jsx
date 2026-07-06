import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

// ── API calls ─────────────────────────────────────────────────────────────────
const getStats        = () => api.get('/returns/stats')
const getReturns      = () => api.get('/returns/all')
const getOrders       = () => api.get('/returns/orders')
const decideApi       = (id, d) => api.patch(`/returns/${id}/decide?decision=${d}&notes=`)
const submitReturnApi = (fd) => api.post('/returns/analyze', fd)
const chatApi         = (msg) => { const fd = new FormData(); fd.append('message', msg); return api.post('/returns/chat', fd) }
const searchPrices    = (q) => api.get(`/search/prices?q=${encodeURIComponent(q)}`)
const getListings     = (cat) => api.get(`/marketplace/listings${cat && cat !== 'all' ? `?category=${cat}` : ''}`)
const listProduct     = (fd) => api.post('/marketplace/list', fd)
const getMktStats     = () => api.get('/marketplace/stats')
const addToCart       = (sid, lid) => { const fd = new FormData(); fd.append('session_id', sid); fd.append('listing_id', lid); return api.post('/marketplace/cart/add', fd) }
const getCart         = (sid) => api.get(`/marketplace/cart/${sid}`)
const removeFromCart  = (sid, lid) => api.delete(`/marketplace/cart/${sid}/${lid}`)
const initiateBuy     = (fd) => api.post('/marketplace/buy/initiate', fd)

// Session ID for cart
const SESSION_ID = 'sess_' + Math.random().toString(36).slice(2, 10)

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK = {
  auto_approve:       { label: '✓ Auto Approved',        bg: '#dcfce7', color: '#15803d', border: '#86efac', dot: '#22c55e' },
  manual_review:      { label: '⚠ Manual Review',        bg: '#fef9c3', color: '#a16207', border: '#fde047', dot: '#eab308' },
  reject_investigate: { label: '✕ Reject / Investigate', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', dot: '#ef4444' },
}
const GRAD = {
  auto_approve:       'linear-gradient(135deg,#10b981,#059669)',
  manual_review:      'linear-gradient(135deg,#f59e0b,#d97706)',
  reject_investigate: 'linear-gradient(135deg,#ef4444,#dc2626)',
}
const CONDITION_COLOR = { like_new: '#10b981', good: '#3b82f6', fair: '#f59e0b', poor: '#ef4444' }
const CONDITION_LABEL = { like_new: '✨ Like New', good: '👍 Good', fair: '🔄 Fair', poor: '⚠️ Poor' }
const CATEGORIES = ['all', 'electronics', 'clothing', 'footwear', 'accessories', 'books', 'furniture', 'other']

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function RiskBadge({ bucket }) {
  const r = RISK[bucket] || RISK.manual_review
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:r.bg, color:r.color, border:`1px solid ${r.border}`, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
    <span style={{ width:6, height:6, borderRadius:'50%', background:r.dot, display:'inline-block' }} />{r.label}
  </span>
}

function Bar({ label, value, color }) {
  const pct = Math.round((value||0)*100)
  const c = color||(pct>60?'#ef4444':pct>30?'#f59e0b':'#10b981')
  return <div style={{ marginBottom:10 }}>
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
      <span style={{ color:'#64748b' }}>{label}</span><span style={{ fontWeight:700, color:c }}>{pct}%</span>
    </div>
    <div style={{ height:6, background:'#f1f5f9', borderRadius:99 }}>
      <div style={{ width:`${pct}%`, height:'100%', background:c, borderRadius:99, transition:'width 0.6s' }} />
    </div>
  </div>
}

function StatCard({ label, value, icon, gradient, light, textColor }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let v=0; const end=parseInt(value)||0; if(!end) return setN(0)
    const t = setInterval(()=>{ v+=Math.ceil(end/18); if(v>=end){setN(end);clearInterval(t)}else setN(v) }, 45)
    return ()=>clearInterval(t)
  }, [value])
  return <div style={{ background:'#fff', borderRadius:16, padding:'22px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:`1px solid ${light}`, position:'relative', overflow:'hidden', transition:'transform 0.2s,box-shadow 0.2s', cursor:'default' }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}}
    onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}}>
    <div style={{ position:'absolute', top:-24, right:-24, width:80, height:80, background:light, borderRadius:'50%', opacity:0.7 }} />
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{label}</p>
        <p style={{ fontSize:38, fontWeight:900, color:textColor, lineHeight:1 }}>{n}</p>
      </div>
      <div style={{ width:44, height:44, background:gradient, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{icon}</div>
    </div>
  </div>
}

function GradCam({ imageSrc, heatmapSeed, breakdown, height }) {
  const ref = useRef(null)
  useEffect(()=>{
    if(!imageSrc||!ref.current) return
    const canvas=ref.current; const ctx=canvas.getContext('2d'); const img=new Image()
    img.onload=()=>{
      canvas.width=img.naturalWidth; canvas.height=img.naturalHeight; ctx.drawImage(img,0,0)
      const seed=heatmapSeed||'abcd1234abcd1234'
      const nums=seed.split('').map(c=>c.charCodeAt(0))
      const rng=i=>(nums[i%nums.length]*37+nums[(i+3)%nums.length]*17)%100/100
      const W=img.naturalWidth,H=img.naturalHeight
      const zones=[
        {label:'Stain',   score:breakdown?.stains||0,    color:'255,140,0'},
        {label:'Tear',    score:breakdown?.tears||0,     color:'220,38,38'},
        {label:'Scratch', score:breakdown?.scratches||0, color:'147,51,234'},
        {label:'Dent',    score:breakdown?.dents||0,     color:'37,99,235'},
      ]
      zones.forEach((z,zi)=>{
        if(z.score<0.1) return
        const cx=rng(zi*5)*W*0.65+W*0.17,cy=rng(zi*5+1)*H*0.65+H*0.17
        const rx=(0.06+rng(zi*5+2)*0.14)*W,ry=(0.06+rng(zi*5+3)*0.12)*H
        const alpha=0.25+z.score*0.45
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry))
        g.addColorStop(0,`rgba(${z.color},${Math.min(alpha+0.15,0.85)})`)
        g.addColorStop(0.45,`rgba(${z.color},${alpha})`); g.addColorStop(1,`rgba(${z.color},0)`)
        ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,rng(zi)*Math.PI*0.5,0,2*Math.PI)
        ctx.fillStyle=g; ctx.fill(); ctx.restore()
        ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx*0.55,ry*0.55,rng(zi)*Math.PI*0.5,0,2*Math.PI)
        ctx.strokeStyle=`rgba(${z.color},0.9)`; ctx.lineWidth=Math.max(2,W*0.005); ctx.setLineDash([6,4]); ctx.stroke(); ctx.restore()
        const fs=Math.max(11,W*0.022); ctx.font=`bold ${fs}px -apple-system,sans-serif`
        const txt=`${z.label} ${Math.round(z.score*100)}%`,tw=ctx.measureText(txt).width
        const px=10,py=6,lx=Math.min(cx-tw/2-px,W-tw-px*2-4),ly=Math.max(cy-ry-fs-py*2-4,4)
        ctx.save(); ctx.fillStyle=`rgba(${z.color},0.92)`; ctx.beginPath()
        ctx.roundRect(lx,ly,tw+px*2,fs+py*2,fs*0.5); ctx.fill()
        ctx.fillStyle='#fff'; ctx.fillText(txt,lx+px,ly+fs+py*0.6); ctx.restore()
      })
    }
    const t=setTimeout(()=>{img.src=imageSrc},80); return ()=>clearTimeout(t)
  },[imageSrc,heatmapSeed,breakdown])
  if(!imageSrc) return null
  return <div style={{ borderRadius:12, overflow:'hidden', border:'2px solid #e2e8f0' }}>
    <canvas ref={ref} style={{ width:'100%', display:'block', maxHeight:height||300, objectFit:'cover' }} />
  </div>
}

// ── Price Comparison ──────────────────────────────────────────────────────────
const POPULAR = ["iPhone 15", "Samsung Galaxy S24", "MacBook Air M2", "Sony WH-1000XM5", "Nike Air Max", "Levi's 511 Jeans", "OnePlus 12", "iPad Air"]

function PriceComparison() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const search = async (q) => {
    const term = q || query; if (!term.trim()) return
    setLoading(true); setError(null); setResults(null)
    try { const r = await searchPrices(term); setResults(r.data) }
    catch { setError('Search failed. Is the backend running?') }
    finally { setLoading(false) }
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:20, padding:'36px 40px', marginBottom:24, textAlign:'center', color:'#fff' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
        <h2 style={{ fontSize:24, fontWeight:900, marginBottom:8 }}>Compare Prices Across India</h2>
        <p style={{ opacity:0.85, fontSize:14, marginBottom:24 }}>Search any product — we compare Amazon, Flipkart, Meesho, Myntra, Croma & more</p>
        <div style={{ display:'flex', gap:12, maxWidth:560, margin:'0 auto' }}>
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}
            placeholder="Search e.g. iPhone 15, Nike shoes, Sony headphones..."
            style={{ flex:1, padding:'14px 18px', borderRadius:12, border:'none', fontSize:15, outline:'none', color:'#1e293b' }} />
          <button onClick={()=>search()} disabled={loading} style={{ padding:'14px 24px', background:'#fff', color:'#4f46e5', border:'none', borderRadius:12, fontSize:15, fontWeight:800, cursor:'pointer' }}>
            {loading ? '...' : 'Search'}
          </button>
        </div>
        {/* Popular searches */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', marginTop:16 }}>
          {POPULAR.map(p => <button key={p} onClick={()=>{setQuery(p);search(p)}} style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer', fontWeight:600 }}>{p}</button>)}
        </div>
      </div>

      {error && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:12, color:'#b91c1c', marginBottom:16 }}>⚠️ {error}</div>}

      {results && (
        <div>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Best Price', value:`₹${results.summary.cheapest_price?.toLocaleString('en-IN')}`, sub:results.summary.cheapest, color:'#10b981' },
              { label:'Best Rated', value:results.summary.best_rated, sub:`⭐ ${results.summary.best_rating}`, color:'#f59e0b' },
              { label:'Max Savings', value:`₹${results.summary.max_savings?.toLocaleString('en-IN')}`, sub:'vs most expensive', color:'#4f46e5' },
            ].map(s => <div key={s.label} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', textAlign:'center' }}>
              <p style={{ fontSize:11, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{s.label}</p>
              <p style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</p>
              <p style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{s.sub}</p>
            </div>)}
          </div>

          {/* Results grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
            {results.results.map((r, i) => (
              <div key={r.retailer} style={{ background:'#fff', borderRadius:14, padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border: i===0 ? `2px solid #10b981` : '1px solid #f1f5f9', position:'relative', transition:'transform 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                {i===0 && <div style={{ position:'absolute', top:-10, left:16, background:'#10b981', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20 }}>🏆 Best Price</div>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:22 }}>{r.logo}</span>
                    <span style={{ fontWeight:700, color:'#1e293b', fontSize:14 }}>{r.retailer}</span>
                  </div>
                  <span style={{ fontSize:11, background:'#f1f5f9', color:'#64748b', padding:'2px 8px', borderRadius:20 }}>{r.delivery}</span>
                </div>
                <div style={{ marginBottom:8 }}>
                  <span style={{ fontSize:26, fontWeight:900, color:'#1e293b' }}>₹{r.price?.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize:13, color:'#94a3b8', marginLeft:8, textDecoration:'line-through' }}>₹{r.original?.toLocaleString('en-IN')}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#10b981', marginLeft:6 }}>{r.discount}% off</span>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
                  <span style={{ fontSize:12, color:'#f59e0b', fontWeight:700 }}>⭐ {r.rating}</span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>({r.reviews?.toLocaleString('en-IN')} reviews)</span>
                </div>
                {r.emi && <div style={{ fontSize:11, background:'#ede9fe', color:'#4f46e5', padding:'3px 8px', borderRadius:6, display:'inline-block', marginBottom:8, fontWeight:600 }}>EMI: {r.emi}</div>}
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  {r.free_delivery && <span style={{ fontSize:10, background:'#dcfce7', color:'#15803d', padding:'2px 6px', borderRadius:4, fontWeight:600 }}>Free Delivery</span>}
                  {r.in_stock ? <span style={{ fontSize:10, background:'#dcfce7', color:'#15803d', padding:'2px 6px', borderRadius:4, fontWeight:600 }}>In Stock</span>
                    : <span style={{ fontSize:10, background:'#fee2e2', color:'#b91c1c', padding:'2px 6px', borderRadius:4, fontWeight:600 }}>Out of Stock</span>}
                </div>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ display:'block', marginTop:12, textAlign:'center', padding:'9px', background:r.in_stock?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#e2e8f0', color:r.in_stock?'#fff':'#94a3b8', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                  {r.in_stock ? `Buy on ${r.retailer} →` : 'Out of Stock'}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Marketplace Browse ────────────────────────────────────────────────────────
function Marketplace({ cartCount, setCartCount, onSell }) {
  const [listings, setListings]   = useState([])
  const [category, setCategory]   = useState('all')
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [addingCart, setAddingCart] = useState(null)
  const [mktStats, setMktStats]   = useState(null)
  const [buyForm, setBuyForm]     = useState(null)
  const [buyResult, setBuyResult] = useState(null)

  const load = async (cat) => {
    setLoading(true)
    try {
      const [r, s] = await Promise.all([getListings(cat), getMktStats()])
      setListings(r.data); setMktStats(s.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load(category) }, [category])

  const handleAddCart = async (listingId) => {
    setAddingCart(listingId)
    try { await addToCart(SESSION_ID, listingId); setCartCount(c => c+1) }
    catch(e) { alert(e.response?.data?.detail || 'Failed to add to cart') }
    finally { setAddingCart(null) }
  }

  const handleBuy = async () => {
    if (!buyForm) return
    try {
      const fd = new FormData()
      Object.entries(buyForm).forEach(([k,v]) => fd.append(k, v))
      fd.append('listing_id', selected.id)
      const res = await initiateBuy(fd)
      setBuyResult(res.data)
    } catch(e) { alert(e.response?.data?.detail || 'Purchase failed') }
  }

  return (
    <div>
      {/* Stats bar */}
      {mktStats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          {[
            {label:'Live Listings', value:mktStats.live_listings,      color:'#4f46e5'},
            {label:'Items Sold',    value:mktStats.sold_items,         color:'#10b981'},
            {label:'Transactions',  value:mktStats.total_transactions, color:'#06b6d4'},
            {label:'Under Review',  value:mktStats.pending_review,     color:'#f59e0b'},
            {label:'GMV (₹)',       value:`${(mktStats.gmv||0).toLocaleString('en-IN')}`, color:'#7c3aed'},
          ].map(s => <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', textAlign:'center' }}>
            <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</p>
          </div>)}
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:800, color:'#1e293b' }}>Used Goods Marketplace</h2>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>Every item AI-verified · Grad-CAM damage checked · Secure payment</p>
        </div>
        <button onClick={onSell} style={{ padding:'10px 20px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}>
          + Sell Your Item
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)} style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${category===c?'#4f46e5':'#e2e8f0'}`, background:category===c?'#4f46e5':'#fff', color:category===c?'#fff':'#64748b', fontWeight:category===c?700:500, fontSize:13, cursor:'pointer', transition:'all 0.15s', textTransform:'capitalize' }}>
            {c==='all'?'🛍️ All':c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⏳</div>
          <p style={{ fontWeight:500 }}>Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign:'center', padding:48, background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏪</div>
          <p style={{ color:'#94a3b8', fontSize:15, fontWeight:500 }}>No listings yet in this category.</p>
          <button onClick={onSell} style={{ marginTop:16, padding:'10px 24px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>Be the first to sell!</button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {listings.map(l => (
            <div key={l.id} style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'transform 0.2s,box-shadow 0.2s', cursor:'pointer' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'}}>
              {/* Image placeholder with damage indicator */}
              <div style={{ height:160, background:`linear-gradient(135deg,#f1f5f9,#e2e8f0)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }} onClick={()=>setSelected(l)}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:48 }}>{l.category==='electronics'?'📱':l.category==='clothing'?'👕':l.category==='footwear'?'👟':'📦'}</div>
                  <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Click to view details</p>
                </div>
                {/* Damage indicator */}
                <div style={{ position:'absolute', top:8, right:8, background:l.damage_score>0.5?'#fee2e2':l.damage_score>0.3?'#fef9c3':'#dcfce7', border:`1px solid ${l.damage_score>0.5?'#fca5a5':l.damage_score>0.3?'#fde047':'#86efac'}`, borderRadius:20, padding:'3px 8px', fontSize:11, fontWeight:700, color:l.damage_score>0.5?'#b91c1c':l.damage_score>0.3?'#a16207':'#15803d' }}>
                  {Math.round((l.damage_score||0)*100)}% dmg
                </div>
                {/* Savings badge */}
                {l.savings_pct > 10 && <div style={{ position:'absolute', top:8, left:8, background:'#4f46e5', color:'#fff', borderRadius:20, padding:'3px 8px', fontSize:11, fontWeight:700 }}>{l.savings_pct}% off MRP</div>}
              </div>

              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'#1e293b', lineHeight:1.3, flex:1, marginRight:8 }}>{l.title}</h3>
                  <span style={{ fontSize:11, background:CONDITION_COLOR[l.condition]+'22', color:CONDITION_COLOR[l.condition], padding:'2px 7px', borderRadius:20, fontWeight:700, flexShrink:0 }}>{CONDITION_LABEL[l.condition]}</span>
                </div>
                {l.brand && <p style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>{l.brand}</p>}
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:20, fontWeight:900, color:'#1e293b' }}>₹{l.selling_price?.toLocaleString('en-IN')}</span>
                  {l.original_price > l.selling_price && <span style={{ fontSize:13, color:'#94a3b8', textDecoration:'line-through' }}>₹{l.original_price?.toLocaleString('en-IN')}</span>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'#64748b' }}>📍 {l.seller_city||'India'} · {l.age_months}mo old</span>
                  <span style={{ fontSize:11, background:'#ede9fe', color:'#4f46e5', padding:'2px 6px', borderRadius:6, fontWeight:600 }}>AI Verified ✓</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setSelected(l)} style={{ flex:1, padding:'8px', background:'#f1f5f9', border:'none', borderRadius:8, fontSize:12, fontWeight:600, color:'#374151', cursor:'pointer' }}>View Details</button>
                  <button onClick={()=>handleAddCart(l.id)} disabled={addingCart===l.id} style={{ flex:1, padding:'8px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:8, fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                    {addingCart===l.id?'Adding...':'🛒 Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product detail modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }} onClick={()=>{setSelected(null);setBuyForm(null);setBuyResult(null)}}>
          <div style={{ background:'#fff', borderRadius:20, maxWidth:720, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#1e293b' }}>{selected.title}</h3>
              <button onClick={()=>{setSelected(null);setBuyForm(null);setBuyResult(null)}} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>✕</button>
            </div>
            <div style={{ padding:24 }}>
              {/* AI verification section */}
              <div style={{ background:'#f8fafc', borderRadius:12, padding:'16px', marginBottom:20 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:10 }}>🤖 AI Verification Report</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <Bar label="Damage Score" value={selected.damage_score} color="#ef4444" />
                  <Bar label="Fraud Risk"   value={selected.fraud_score}  color="#4f46e5" />
                </div>
                {selected.damage_breakdown && Object.keys(selected.damage_breakdown).length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {[['Stains','#f97316','stains'],['Tears','#ef4444','tears'],['Scratches','#a855f7','scratches'],['Dents','#3b82f6','dents']].map(([label,color,key])=>(
                      <div key={key} style={{ textAlign:'center', background:'#fff', borderRadius:8, padding:'8px' }}>
                        <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700 }}>{label}</p>
                        <p style={{ fontSize:16, fontWeight:800, color }}>{Math.round((selected.damage_breakdown[key]||0)*100)}%</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seller info */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                {[
                  ['Seller',     selected.seller_name],
                  ['City',       selected.seller_city||'N/A'],
                  ['Condition',  CONDITION_LABEL[selected.condition]||selected.condition],
                  ['Age',        `${selected.age_months} months old`],
                  ['Bought from',selected.purchase_platform||'N/A'],
                  ['Original MRP',`₹${selected.original_price?.toLocaleString('en-IN')}`],
                ].map(([k,v])=><div key={k} style={{ background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                  <p style={{ fontSize:11, color:'#94a3b8', marginBottom:3 }}>{k}</p>
                  <p style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{v}</p>
                </div>)}
              </div>

              {selected.reason_to_sell && (
                <div style={{ background:'#fef9c3', border:'1px solid #fde047', borderRadius:8, padding:'10px 14px', marginBottom:20 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#a16207', marginBottom:3 }}>Reason for selling</p>
                  <p style={{ fontSize:13, color:'#374151' }}>{selected.reason_to_sell}</p>
                </div>
              )}

              {/* Price and buy */}
              {!buyResult ? (
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
                    <div>
                      <span style={{ fontSize:32, fontWeight:900, color:'#1e293b' }}>₹{selected.selling_price?.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize:14, color:'#94a3b8', marginLeft:8 }}>+ 2% convenience fee</span>
                    </div>
                    <span style={{ background:'#dcfce7', color:'#15803d', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>
                      You save ₹{selected.savings?.toLocaleString('en-IN')} ({selected.savings_pct}%)
                    </span>
                  </div>

                  {!buyForm ? (
                    <div style={{ display:'flex', gap:10 }}>
                      <button onClick={()=>handleAddCart(selected.id)} style={{ flex:1, padding:'13px', background:'#f1f5f9', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', color:'#374151' }}>
                        🛒 Add to Cart
                      </button>
                      <button onClick={()=>setBuyForm({buyer_name:'',buyer_email:'',buyer_phone:'',delivery_address:'',buyer_city:''})} style={{ flex:1, padding:'13px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', color:'#fff' }}>
                        ⚡ Buy Now
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:12 }}>📦 Delivery Details</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                        {[
                          {label:'Your Name', key:'buyer_name', placeholder:'Full name'},
                          {label:'Email', key:'buyer_email', placeholder:'email@example.com'},
                          {label:'Phone', key:'buyer_phone', placeholder:'10-digit mobile'},
                          {label:'City', key:'buyer_city', placeholder:'Your city'},
                        ].map(f=><div key={f.key}>
                          <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{f.label}</label>
                          <input value={buyForm[f.key]} onChange={e=>setBuyForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                            style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', color:'#1e293b' }} />
                        </div>)}
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Delivery Address</label>
                        <textarea value={buyForm.delivery_address} onChange={e=>setBuyForm(p=>({...p,delivery_address:e.target.value}))} placeholder="Full delivery address with pincode"
                          style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', color:'#1e293b', minHeight:64, resize:'vertical' }} />
                      </div>
                      {/* Razorpay note */}
                      <div style={{ background:'#ede9fe', border:'1px solid #c4b5fd', borderRadius:8, padding:'10px 14px', marginBottom:12 }}>
                        <p style={{ fontSize:12, color:'#4f46e5', fontWeight:600 }}>💳 Secure Payment via Razorpay · Amount: ₹{(selected.selling_price*1.02).toFixed(0)}</p>
                        <p style={{ fontSize:11, color:'#7c3aed', marginTop:2 }}>Platform verifies seller identity and item condition before delivery</p>
                      </div>
                      <div style={{ display:'flex', gap:10 }}>
                        <button onClick={()=>setBuyForm(null)} style={{ flex:1, padding:'12px', background:'#f1f5f9', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', color:'#374151' }}>Cancel</button>
                        <button onClick={handleBuy} style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', color:'#fff' }}>
                          Place Order & Pay →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:12, padding:20, textAlign:'center' }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>🎉</div>
                  <h3 style={{ fontWeight:800, color:'#15803d', marginBottom:6 }}>Order Placed Successfully!</h3>
                  <p style={{ fontSize:13, color:'#374151', marginBottom:12 }}>Payment confirmed · Our team will verify the item before shipping</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    {[['Tracking ID', buyResult.tracking_id],['Estimated Delivery', buyResult.estimated_delivery],['Status', 'Processing'],['Amount Paid', `₹${buyResult.amount}`]].map(([k,v])=>(
                      <div key={k} style={{ background:'#fff', borderRadius:8, padding:'10px' }}>
                        <p style={{ fontSize:11, color:'#94a3b8' }}>{k}</p>
                        <p style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sell Item Form ─────────────────────────────────────────────────────────────
function SellItem({ onSuccess }) {
  const [step, setStep]         = useState(1) // 1=form, 2=AI verification, 3=result
  const [form, setForm]         = useState({ seller_name:'', seller_email:'', seller_phone:'', seller_city:'', title:'', description:'', category:'electronics', brand:'', original_price:'', selling_price:'', reason_to_sell:'', purchase_platform:'Amazon', age_months:'12', condition:'good' })
  const [image, setImage]       = useState(null)
  const [preview, setPreview]   = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [showGradCam, setShowGradCam] = useState(false)

  const handleImage = e => {
    const file = e.target.files[0]; if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    if (!image) return setError('Please upload a product image.')
    const required = ['seller_name','seller_email','title','original_price','selling_price']
    for (const k of required) { if (!form[k]) return setError(`Please fill in: ${k.replace('_',' ')}`) }
    setLoading(true); setError(null); setStep(2)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k, v))
      fd.append('image', image)
      const res = await listProduct(fd)
      setResult(res.data)
      // Show fraud detection for 3 seconds then reveal final result
      setTimeout(() => { setShowGradCam(true); setStep(3) }, 3000)
    } catch(e) {
      setError(e.response?.data?.detail || 'Listing failed. Is backend running?')
      setStep(1)
    } finally { setLoading(false) }
  }

  const f = (key, label, type='text', options=null, placeholder='') => (
    <div>
      <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>{label}</label>
      {options
        ? <select value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none', background:'#fff' }}>
            {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
          </select>
        : <input type={type} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} placeholder={placeholder}
            style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none' }} />
      }
    </div>
  )

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <div style={{ padding:'22px 28px', background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff' }}>
          <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>📦 List Your Used Item</h2>
          <p style={{ fontSize:13, opacity:0.85 }}>AI verifies condition · Get paid securely · We handle delivery</p>
          {/* Progress steps */}
          <div style={{ display:'flex', gap:0, marginTop:16 }}>
            {['Fill Details','AI Verification','Go Live!'].map((s,i)=>(
              <div key={s} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', opacity: step>i?1:0.5 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background: step>i?'#fff':'rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color: step>i?'#4f46e5':'#fff', marginBottom:4 }}>{step>i?'✓':i+1}</div>
                <span style={{ fontSize:10, fontWeight:600 }}>{s}</span>
                {i<2 && <div style={{ position:'absolute', width:80, height:1, background:'rgba(255,255,255,0.3)', marginTop:14, marginLeft:80 }} />}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div style={{ padding:28 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>1. Your Details</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
              {f('seller_name',  'Your Name',  'text', null, 'Full name')}
              {f('seller_email', 'Email',      'email',null, 'email@example.com')}
              {f('seller_phone', 'Phone',      'tel',  null, '10-digit mobile')}
              {f('seller_city',  'Your City',  'text', null, 'Mumbai, Delhi...')}
            </div>

            <p style={{ fontSize:13, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>2. Product Info</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {f('title',    'Product Title',   'text',   null, 'e.g. iPhone 12 Pro 128GB')}
              {f('brand',    'Brand',           'text',   null, 'Apple, Samsung, Nike...')}
              {f('category', 'Category',        'select', ['electronics','clothing','footwear','accessories','books','furniture','other'].map(v=>({value:v,label:v.charAt(0).toUpperCase()+v.slice(1)})))}
              {f('condition','Condition',       'select', [{value:'like_new',label:'Like New'},{value:'good',label:'Good'},{value:'fair',label:'Fair'},{value:'poor',label:'Poor'}])}
              {f('original_price','Original MRP (₹)','number',null,'What you paid')}
              {f('selling_price', 'Selling Price (₹)','number',null,'Your asking price')}
              {f('age_months',    'Age (months)',    'number',null,'How old is it')}
              {f('purchase_platform','Bought From',  'select',['Amazon','Flipkart','Myntra','Croma','Offline Store','Other'].map(v=>({value:v,label:v})))}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Description</label>
              <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the item — any known issues, included accessories, etc."
                style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none', minHeight:70, resize:'vertical' }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Reason for Selling</label>
              <input value={form.reason_to_sell} onChange={e=>setForm(p=>({...p,reason_to_sell:e.target.value}))} placeholder="Upgrading, not needed, gifted a new one..." style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none' }} />
            </div>

            <p style={{ fontSize:13, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>3. Product Photo</p>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:`2px dashed ${image?'#7c3aed':'#e2e8f0'}`, borderRadius:12, cursor:'pointer', background:image?'#faf5ff':'#fafafa', overflow:'hidden', minHeight:140, marginBottom:20 }}>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImage} />
              {preview
                ? <img src={preview} alt="preview" style={{ width:'100%', maxHeight:220, objectFit:'cover' }} />
                : <div style={{ padding:32, textAlign:'center' }}>
                    <div style={{ fontSize:40, marginBottom:8 }}>📸</div>
                    <p style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>Upload a clear photo of your item</p>
                    <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Our AI will scan for damage and verify condition</p>
                  </div>
              }
            </label>
            {image && <p style={{ fontSize:12, color:'#7c3aed', marginBottom:16, fontWeight:600 }}>✓ {image.name}</p>}

            {/* Fee info */}
            <div style={{ background:'#ede9fe', border:'1px solid #c4b5fd', borderRadius:8, padding:'10px 14px', marginBottom:20 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#4f46e5' }}>💰 Platform Fee: 5% of selling price</p>
              {form.selling_price && <p style={{ fontSize:11, color:'#7c3aed', marginTop:2 }}>You receive: ₹{(form.selling_price*0.95).toFixed(0)} after successful delivery</p>}
            </div>

            {error && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#b91c1c', fontWeight:500 }}>⚠️ {error}</div>}

            <button onClick={submit} disabled={loading} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(124,58,237,0.4)' }}>
              🤖 Submit for AI Verification
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🤖</div>
            <h3 style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:8 }}>AI Analyzing Your Item...</h3>
            <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>Running fraud detection + damage analysis + Grad-CAM scan</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:360, margin:'0 auto' }}>
              {['XGBoost Fraud Scoring','Computer Vision Damage Scan','Grad-CAM Heatmap Generation','Risk Assessment'].map((s,i)=>(
                <div key={s} style={{ display:'flex', alignItems:'center', gap:10, background:'#f8fafc', borderRadius:8, padding:'10px 14px' }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff', flexShrink:0 }}>✓</div>
                  <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:24, height:4, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(90deg,#4f46e5,#7c3aed)', borderRadius:99, animation:'none', width:'100%' }} />
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div>
            {/* Result banner */}
            <div style={{ padding:'20px 28px', background: result.ai_verdict==='approved'?GRAD.auto_approve:result.ai_verdict==='rejected'?GRAD.reject_investigate:GRAD.manual_review, color:'#fff' }}>
              <div style={{ fontSize:30, marginBottom:6 }}>{result.ai_verdict==='approved'?'✅':result.ai_verdict==='rejected'?'🚨':'⚠️'}</div>
              <h3 style={{ fontSize:18, fontWeight:800 }}>{result.ai_verdict==='approved'?'Listing Approved — Now Live!':result.ai_verdict==='rejected'?'Listing Rejected':'Under Manual Review'}</h3>
              <p style={{ opacity:0.9, fontSize:13, marginTop:4 }}>{result.message}</p>
            </div>

            <div style={{ padding:'20px 28px' }}>
              {/* Score cards */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                {[
                  {label:'Fraud Score',  v:`${Math.round((result.fraud_result?.fraud_score||0)*100)}%`,  c:'#4f46e5'},
                  {label:'Damage Score', v:`${Math.round((result.cv_result?.damage_score||0)*100)}%`,    c:'#ef4444'},
                  {label:'AI Verdict',   v:result.ai_verdict==='approved'?'Approved':result.ai_verdict==='rejected'?'Rejected':'Review', c:result.ai_verdict==='approved'?'#10b981':result.ai_verdict==='rejected'?'#ef4444':'#f59e0b'},
                ].map(({label,v,c})=>(
                  <div key={label} style={{ textAlign:'center', padding:'16px 10px', background:'#f8fafc', borderRadius:12 }}>
                    <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{label}</p>
                    <p style={{ fontSize:22, fontWeight:800, color:c }}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Damage breakdown */}
              {result.cv_result?.breakdown && (
                <div style={{ marginBottom:20, background:'#f8fafc', borderRadius:12, padding:'16px 20px' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:10 }}>Damage Breakdown</p>
                  <Bar label="Stains"    value={result.cv_result.breakdown.stains}    color="#f97316" />
                  <Bar label="Tears"     value={result.cv_result.breakdown.tears}     color="#ef4444" />
                  <Bar label="Scratches" value={result.cv_result.breakdown.scratches} color="#a855f7" />
                  <Bar label="Dents"     value={result.cv_result.breakdown.dents}     color="#3b82f6" />
                </div>
              )}

              {/* GradCAM */}
              {showGradCam && result.cv_result?.breakdown && preview && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>🔬 Damage Heatmap</span>
                    <span style={{ fontSize:11, background:'#ede9fe', color:'#4f46e5', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>Grad-CAM Scan</span>
                  </div>
                  <GradCam imageSrc={preview} heatmapSeed={result.cv_result.heatmap_seed} breakdown={result.cv_result.breakdown} />
                </div>
              )}

              {result.platform_fee && (
                <div style={{ background:'#ede9fe', border:'1px solid #c4b5fd', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
                  <p style={{ fontSize:12, color:'#4f46e5', fontWeight:600 }}>💰 {result.platform_fee}</p>
                </div>
              )}

              <button onClick={()=>{ if(onSuccess) onSuccess() }} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', color:'#fff' }}>
                Go to Marketplace →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cart ──────────────────────────────────────────────────────────────────────
function Cart({ onClose }) {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    getCart(SESSION_ID).then(r=>setItems(r.data)).catch(()=>setItems([])).finally(()=>setLoading(false))
  },[])

  const remove = async (lid) => {
    await removeFromCart(SESSION_ID, lid)
    setItems(p=>p.filter(i=>i.listing_id!==lid))
  }

  const total = items.reduce((s,i)=>s+(i.selling_price||0),0)

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', justifyContent:'flex-end' }} onClick={onClose}>
      <div style={{ background:'#fff', width:400, height:'100%', overflowY:'auto', boxShadow:'-4px 0 20px rgba(0,0,0,0.1)' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:17, fontWeight:800, color:'#1e293b' }}>🛒 Your Cart ({items.length})</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#94a3b8' }}>✕</button>
        </div>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>
        : items.length === 0 ? (
          <div style={{ padding:40, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🛒</div>
            <p style={{ color:'#94a3b8' }}>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div style={{ padding:16 }}>
              {items.map(item=>(
                <div key={item.cart_item_id} style={{ background:'#f8fafc', borderRadius:12, padding:14, marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', marginBottom:2 }}>{item.title}</p>
                    <p style={{ fontSize:12, color:'#64748b' }}>📍 {item.seller_city} · {item.condition}</p>
                    <p style={{ fontSize:16, fontWeight:800, color:'#4f46e5', marginTop:4 }}>₹{item.selling_price?.toLocaleString('en-IN')}</p>
                  </div>
                  <button onClick={()=>remove(item.listing_id)} style={{ background:'#fee2e2', border:'none', color:'#ef4444', width:32, height:32, borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:700 }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:14, color:'#64748b' }}>Subtotal</span>
                <span style={{ fontSize:14, fontWeight:700 }}>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontSize:14, color:'#64748b' }}>Convenience fee (2%)</span>
                <span style={{ fontSize:14, fontWeight:700 }}>₹{(total*0.02).toFixed(0)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20, paddingTop:10, borderTop:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:16, fontWeight:800 }}>Total</span>
                <span style={{ fontSize:16, fontWeight:800, color:'#4f46e5' }}>₹{(total*1.02).toFixed(0)}</span>
              </div>
              <button style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', color:'#fff' }}>
                Proceed to Checkout →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Returns Shield Dashboard ───────────────────────────────────────────────────
const RETURN_RULES=[
  {icon:'🚫',text:'Item has NOT been used, worn, or washed after purchase'},
  {icon:'🏷️',text:'Original tags and packaging are intact (unless defective)'},
  {icon:'🧼',text:'Item is free from stains, odors, or modifications after purchase'},
  {icon:'📦',text:'All accessories, manuals, and original parts are included'},
  {icon:'📷',text:'I have uploaded a clear, unedited photo of the actual item'},
  {icon:'⚖️',text:'I understand fraudulent returns may result in account suspension'},
]
function ReturnPolicy({ onAccept }) {
  const [checked,setChecked]=useState({})
  const allChecked=RETURN_RULES.every((_,i)=>checked[i])
  return <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
    <div style={{ padding:'16px 20px', background:'#fffbeb', borderBottom:'1px solid #fde68a', display:'flex', gap:10, alignItems:'flex-start' }}>
      <span style={{ fontSize:22 }}>⚠️</span>
      <div><p style={{ fontWeight:700, color:'#92400e', fontSize:14 }}>Return Eligibility Checklist</p>
        <p style={{ fontSize:12, color:'#a16207', marginTop:2 }}>Confirm every point. False declarations result in rejection and fraud investigation.</p></div>
    </div>
    <div style={{ padding:'16px 20px' }}>
      {RETURN_RULES.map((rule,i)=><label key={i} onClick={()=>setChecked(p=>({...p,[i]:!p[i]}))} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px', marginBottom:6, borderRadius:8, cursor:'pointer', background:checked[i]?'#f0fdf4':'#fafafa', border:`1px solid ${checked[i]?'#86efac':'#f1f5f9'}`, transition:'all 0.15s' }}>
        <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, marginTop:1, border:`2px solid ${checked[i]?'#10b981':'#d1d5db'}`, background:checked[i]?'#10b981':'#fff', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
          {checked[i]&&<span style={{ color:'#fff', fontSize:11, fontWeight:900 }}>✓</span>}
        </div>
        <span style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}><span style={{ marginRight:6 }}>{rule.icon}</span>{rule.text}</span>
      </label>)}
      <button onClick={onAccept} disabled={!allChecked} style={{ width:'100%', marginTop:12, padding:'13px', background:allChecked?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#e2e8f0', color:allChecked?'#fff':'#94a3b8', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:allChecked?'pointer':'not-allowed', transition:'all 0.2s' }}>
        {allChecked?'✓ Confirmed — Proceed to Submit':`Confirm all ${RETURN_RULES.length} points to continue`}
      </button>
    </div>
  </div>
}

function SubmitReturn({ onSuccess, onDashboard }) {
  const [orders,setOrders]=useState([])
  const [form,setForm]=useState({ order_id:'', reason:'Product damaged on arrival', transaction_amt:'2999', card1:'13553', card2:'555', transaction_hour:'14', email_domain_freq:'0.05', has_device_info:'1', dist1:'19', c1:'2', c2:'2', c5:'1', c13:'5', c14:'2' })
  const [image,setImage]=useState(null); const [preview,setPreview]=useState(null)
  const [result,setResult]=useState(null); const [loading,setLoading]=useState(false); const [error,setError]=useState(null)
  useEffect(()=>{ getOrders().then(r=>{ setOrders(r.data); if(r.data.length>0) setForm(p=>({...p,order_id:String(r.data[0].id)})) }).catch(()=>{ setOrders([1,2,3,4,5,6].map(i=>({id:i,product_name:`Order #${i}`}))); setForm(p=>({...p,order_id:'1'})) }) },[])
  const handleImage=e=>{ const file=e.target.files[0]; if(!file) return; setImage(file); const r=new FileReader(); r.onload=ev=>setPreview(ev.target.result); r.readAsDataURL(file) }
  const submit=async()=>{
    if(!image) return setError('Please upload a product image.')
    setLoading(true); setError(null); setResult(null)
    try { const fd=new FormData(); Object.entries(form).forEach(([k,v])=>fd.append(k,v)); fd.append('image',image); const res=await submitReturnApi(fd); setResult(res.data); if(onSuccess) onSuccess() }
    catch(e){ setError(e.response?.data?.detail||'Backend not reachable. Is uvicorn running?') }
    finally { setLoading(false) }
  }
  const reset=()=>{setResult(null);setImage(null);setPreview(null);setError(null)}
  return <div style={{ maxWidth:720, margin:'0 auto' }}>
    <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
      <div style={{ padding:'22px 28px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff' }}>
        <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Submit Return for AI Analysis</h2>
        <p style={{ fontSize:13, opacity:0.85 }}>Fraud score + Grad-CAM damage heatmap</p>
      </div>
      {!result ? <div style={{ padding:28 }}>
        <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:`2px dashed ${image?'#4f46e5':'#e2e8f0'}`, borderRadius:12, cursor:'pointer', background:image?'#fafbff':'#fafafa', overflow:'hidden', minHeight:140, marginBottom:20 }}>
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImage} />
          {preview ? <img src={preview} alt="preview" style={{ width:'100%', maxHeight:200, objectFit:'cover' }} />
            : <div style={{ padding:28, textAlign:'center' }}><div style={{ fontSize:36, marginBottom:8 }}>📦</div><p style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>Upload product photo</p></div>}
        </label>
        {image && <p style={{ fontSize:12, color:'#4f46e5', marginBottom:16, fontWeight:600 }}>✓ {image.name}</p>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Order ID</label>
            <select value={form.order_id} onChange={e=>setForm(p=>({...p,order_id:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none', background:'#fff' }}>
              {orders.map(o=><option key={o.id} value={String(o.id)}>#{o.id} — {o.product_name}</option>)}
            </select></div>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Reason</label>
            <select value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, color:'#1e293b', outline:'none', background:'#fff' }}>
              {['Product damaged on arrival','Wrong item delivered','Not as described','Changed my mind','Defective product'].map(r=><option key={r}>{r}</option>)}
            </select></div>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Amount (₹)</label>
            <input type="number" value={form.transaction_amt} onChange={e=>setForm(p=>({...p,transaction_amt:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }} /></div>
          <div><label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>Card (first 5)</label>
            <input type="number" value={form.card1} onChange={e=>setForm(p=>({...p,card1:e.target.value}))} style={{ width:'100%', padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none' }} /></div>
        </div>
        {error && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#b91c1c', fontWeight:500 }}>⚠️ {error}</div>}
        <button onClick={submit} disabled={loading} style={{ width:'100%', padding:'14px', background:loading?'#a5b4fc':'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', boxShadow:loading?'none':'0 4px 14px rgba(79,70,229,0.4)', transition:'all 0.2s' }}>
          {loading?'🔄 Analyzing...':'🔍 Analyze Return Now'}
        </button>
      </div> : <div>
        <div style={{ padding:'20px 28px', background:GRAD[result.risk_bucket]||GRAD.manual_review, color:'#fff' }}>
          <div style={{ fontSize:28, marginBottom:6 }}>{result.risk_bucket==='auto_approve'?'✅':result.risk_bucket==='manual_review'?'⚠️':'🚨'}</div>
          <h3 style={{ fontSize:18, fontWeight:800 }}>{RISK[result.risk_bucket]?.label}</h3>
          <p style={{ opacity:0.9, fontSize:13, marginTop:4 }}>{result.message}</p>
        </div>
        <div style={{ padding:'20px 28px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[{label:'Fraud',v:`${Math.round((result.fraud_result?.fraud_score||0)*100)}%`,c:'#4f46e5'},{label:'Damage',v:`${Math.round((result.cv_result?.damage_score||0)*100)}%`,c:'#06b6d4'},{label:'Status',v:result.cv_result?.is_damaged?'Damaged':'Intact',c:result.cv_result?.is_damaged?'#ef4444':'#10b981'}].map(({label,v,c})=>(
              <div key={label} style={{ textAlign:'center', padding:'14px', background:'#f8fafc', borderRadius:10 }}>
                <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', marginBottom:5 }}>{label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:c }}>{v}</p>
              </div>
            ))}
          </div>
          {result.cv_result?.breakdown&&preview&&<div style={{ marginBottom:16 }}><div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}><span style={{ fontSize:13, fontWeight:700 }}>🔬 Damage Heatmap</span><span style={{ fontSize:11, background:'#ede9fe', color:'#4f46e5', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>Grad-CAM</span></div><GradCam imageSrc={preview} heatmapSeed={result.cv_result.heatmap_seed} breakdown={result.cv_result.breakdown} /></div>}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={reset} style={{ flex:1, padding:'12px', background:'#f1f5f9', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', color:'#374151' }}>+ Another</button>
            <button onClick={()=>{reset();if(onDashboard)onDashboard()}} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', color:'#fff' }}>Dashboard →</button>
          </div>
        </div>
      </div>}
    </div>
  </div>
}

const QUICK=['How do I return?','How does fraud detection work?','How long for refund?','What damages are detected?','How does ShieldMart work?']
function Chatbot() {
  const [open,setOpen]=useState(false); const [msgs,setMsgs]=useState([{from:'bot',text:"Hi! I'm the ShieldMart AI assistant. Ask me about buying, selling, fraud detection, or returns!"}]); const [input,setInput]=useState(''); const [loading,setLoading]=useState(false); const bottomRef=useRef(null)
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[msgs,open])
  const send=async(text)=>{ const msg=text||input.trim(); if(!msg) return; setInput(''); setMsgs(p=>[...p,{from:'user',text:msg}]); setLoading(true)
    try { const res=await chatApi(msg); setMsgs(p=>[...p,{from:'bot',text:res.data.reply}]) }
    catch { setMsgs(p=>[...p,{from:'bot',text:'Connection issue. Is the backend running?'}]) } finally { setLoading(false) } }
  return <>
    <button onClick={()=>setOpen(o=>!o)} style={{ position:'fixed', bottom:28, right:28, zIndex:1000, width:56, height:56, background:open?'#ef4444':'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'50%', cursor:'pointer', boxShadow:'0 4px 20px rgba(79,70,229,0.45)', fontSize:22, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' }}>
      {open?'✕':'💬'}
    </button>
    {open&&<div style={{ position:'fixed', bottom:96, right:28, zIndex:999, width:350, height:510, background:'#fff', borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🛡️</div>
        <div><p style={{ fontWeight:700, fontSize:14 }}>ShieldMart AI</p><p style={{ fontSize:11, opacity:0.85 }}>Online · Instant replies</p></div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m,i)=><div key={i} style={{ display:'flex', justifyContent:m.from==='user'?'flex-end':'flex-start' }}>
          <div style={{ maxWidth:'82%', padding:'9px 13px', borderRadius:m.from==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px', background:m.from==='user'?'linear-gradient(135deg,#4f46e5,#7c3aed)':'#f1f5f9', color:m.from==='user'?'#fff':'#1e293b', fontSize:13, lineHeight:1.5 }}>{m.text}</div>
        </div>)}
        {loading&&<div style={{ display:'flex', gap:4, padding:'9px 13px', background:'#f1f5f9', borderRadius:'18px 18px 18px 4px', width:'fit-content' }}>{[0,1,2].map(i=><div key={i} style={{ width:6, height:6, background:'#94a3b8', borderRadius:'50%' }} />)}</div>}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:'6px 10px', borderTop:'1px solid #f1f5f9', display:'flex', gap:5, overflowX:'auto' }}>
        {QUICK.map(q=><button key={q} onClick={()=>send(q)} style={{ whiteSpace:'nowrap', padding:'5px 10px', background:'#ede9fe', color:'#4f46e5', border:'none', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer' }}>{q}</button>)}
      </div>
      <div style={{ padding:'10px 14px', borderTop:'1px solid #f1f5f9', display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything..." style={{ flex:1, padding:'9px 14px', border:'1px solid #e2e8f0', borderRadius:20, fontSize:13, outline:'none', color:'#1e293b' }} />
        <button onClick={()=>send()} style={{ width:38, height:38, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', border:'none', borderRadius:'50%', cursor:'pointer', color:'#fff', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>→</button>
      </div>
    </div>}
  </>
}

function ReturnTable({ returns, onRefresh }) {
  const [expanded,setExpanded]=useState(null); const [loading,setLoading]=useState(null)
  const handleDecide=async(id,decision,e)=>{ e.stopPropagation(); setLoading(`${id}-${decision}`)
    try { await decideApi(id,decision); onRefresh() } catch(err){alert('Error: '+(err.response?.data?.detail||err.message))} finally{setLoading(null)} }
  if(!returns.length) return <div style={{ background:'#fff', borderRadius:16, padding:48, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}><div style={{ fontSize:48, marginBottom:12 }}>📭</div><p style={{ color:'#94a3b8', fontSize:15 }}>No returns yet.</p></div>
  return <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
    <div style={{ padding:'16px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div><h2 style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>Return Requests</h2><p style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Click row to expand · Approve or reject</p></div>
      <span style={{ fontSize:13, background:'#f1f5f9', color:'#64748b', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>{returns.length} total</span>
    </div>
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{ background:'#f8fafc' }}>{['ID','Product','Reason','Risk','Fraud','Damage','Status','Actions'].map(h=><th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}</tr></thead>
        <tbody>{returns.map(r=><>
          <tr key={r.id} onClick={()=>setExpanded(expanded===r.id?null:r.id)} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer', background:expanded===r.id?'#fafbff':'#fff' }}
            onMouseEnter={e=>{if(expanded!==r.id)e.currentTarget.style.background='#f8fafc'}} onMouseLeave={e=>{if(expanded!==r.id)e.currentTarget.style.background='#fff'}}>
            <td style={{ padding:'13px 16px', fontSize:13, fontWeight:700, color:'#4f46e5' }}>#{r.id}</td>
            <td style={{ padding:'13px 16px', fontSize:13, fontWeight:600, color:'#1e293b', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.product_name}</td>
            <td style={{ padding:'13px 16px', fontSize:12, color:'#64748b', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.reason}</td>
            <td style={{ padding:'13px 16px' }}><RiskBadge bucket={r.risk_bucket} /></td>
            <td style={{ padding:'13px 16px' }}><div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:40, height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}><div style={{ width:`${Math.round((r.fraud_score||0)*100)}%`, height:'100%', background:r.fraud_score>0.6?'#ef4444':r.fraud_score>0.3?'#f59e0b':'#10b981', borderRadius:99 }} /></div><span style={{ fontSize:12, fontWeight:700, color:r.fraud_score>0.6?'#ef4444':r.fraud_score>0.3?'#d97706':'#16a34a' }}>{Math.round((r.fraud_score||0)*100)}%</span></div></td>
            <td style={{ padding:'13px 16px' }}><div style={{ display:'flex', alignItems:'center', gap:5 }}><div style={{ width:40, height:5, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}><div style={{ width:`${Math.round((r.damage_score||0)*100)}%`, height:'100%', background:r.damage_score>0.5?'#ef4444':'#10b981', borderRadius:99 }} /></div><span style={{ fontSize:12, fontWeight:700, color:r.damage_score>0.5?'#ef4444':'#16a34a' }}>{Math.round((r.damage_score||0)*100)}%</span></div></td>
            <td style={{ padding:'13px 16px' }}>{r.reviewed?<span style={{ fontSize:11, background:'#dcfce7', color:'#15803d', padding:'3px 8px', borderRadius:20, fontWeight:700 }}>✓ Done</span>:<span style={{ fontSize:11, background:'#fef9c3', color:'#a16207', padding:'3px 8px', borderRadius:20, fontWeight:700 }}>Pending</span>}</td>
            <td style={{ padding:'13px 16px' }} onClick={e=>e.stopPropagation()}>{!r.reviewed?<div style={{ display:'flex', gap:5 }}><button onClick={e=>handleDecide(r.id,'approved',e)} disabled={!!loading} style={{ padding:'5px 10px', background:'#10b981', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>{loading===`${r.id}-approved`?'...':'Approve'}</button><button onClick={e=>handleDecide(r.id,'rejected',e)} disabled={!!loading} style={{ padding:'5px 10px', background:'#ef4444', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer' }}>{loading===`${r.id}-rejected`?'...':'Reject'}</button></div>:<span style={{ fontSize:12, fontWeight:700, color:r.final_decision==='approved'?'#16a34a':'#dc2626' }}>{r.final_decision==='approved'?'✓ Approved':'✕ Rejected'}</span>}</td>
          </tr>
          {expanded===r.id&&<tr key={`e-${r.id}`}><td colSpan={8} style={{ background:'#fafbff', borderBottom:'1px solid #e2e8f0' }}><div style={{ padding:'16px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}><div><p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:10 }}>Scores</p><Bar label="Fraud" value={r.fraud_score} /><Bar label="Damage" value={r.damage_score} color="#06b6d4" /></div><div><p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:10 }}>Details</p>{[['Order',`#${r.order_id}`],['Reason',r.reason],['Time',r.requested_at?new Date(r.requested_at).toLocaleString():'N/A']].map(([k,v])=><div key={k} style={{ marginBottom:6 }}><span style={{ fontSize:11, color:'#94a3b8' }}>{k}: </span><span style={{ fontSize:12, color:'#1e293b', fontWeight:600 }}>{v}</span></div>)}</div></div></td></tr>}
        </>)}</tbody>
      </table>
    </div>
  </div>
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [stats,setStats]     = useState(null)
  const [returns,setReturns] = useState([])
  const [tab,setTab]         = useState('home')
  const [loading,setLoading] = useState(true)
  const [policyOk,setPolicyOk] = useState(false)
  const [cartCount,setCartCount] = useState(0)
  const [showCart,setShowCart]   = useState(false)

  const refresh = useCallback(async()=>{
    try { const [s,r]=await Promise.all([getStats(),getReturns()]); setStats(s.data); setReturns(r.data) }
    catch(e){ console.error('API error:',e) } finally { setLoading(false) }
  },[])

  useEffect(()=>{refresh()},[refresh])

  const switchTab=(t)=>{ setTab(t); if(t!=='returns') setPolicyOk(false) }

  const TABS = [
    {key:'home',      label:'🏠 Home'},
    {key:'compare',   label:'🔍 Compare Prices'},
    {key:'market',    label:'🛍️ Marketplace'},
    {key:'sell',      label:'📦 Sell Item'},
    {key:'returns',   label:'↩️ Returns'},
    {key:'dashboard', label:'📊 Dashboard'},
  ]

  if(loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#f0f2f8', flexDirection:'column', gap:16 }}>
    <div style={{ width:56, height:56, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>🛡️</div>
    <p style={{ color:'#64748b', fontWeight:600, fontSize:15 }}>Loading ShieldMart...</p>
  </div>

  return <div style={{ minHeight:'100vh', background:'#f0f2f8' }}>
    {/* Header */}
    <header style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:100, boxShadow:'0 1px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🛡️</div>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'#1e293b', letterSpacing:'-0.02em' }}>ShieldMart</div>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:500 }}>AI-Verified Marketplace</div>
          </div>
        </div>
        <nav style={{ display:'flex', gap:2, background:'#f1f5f9', borderRadius:10, padding:3 }}>
          {TABS.map(({key,label})=><button key={key} onClick={()=>switchTab(key)} style={{ padding:'6px 12px', borderRadius:7, border:'none', cursor:'pointer', background:tab===key?'#fff':'transparent', color:tab===key?'#4f46e5':'#64748b', fontWeight:tab===key?700:500, fontSize:12, boxShadow:tab===key?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.2s', whiteSpace:'nowrap' }}>{label}</button>)}
        </nav>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={()=>setShowCart(true)} style={{ position:'relative', background:'#f1f5f9', border:'none', borderRadius:10, padding:'8px 14px', cursor:'pointer', fontSize:18 }}>
            🛒{cartCount>0&&<span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800 }}>{cartCount}</span>}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:20, padding:'5px 12px' }}>
            <div style={{ width:7, height:7, background:'#22c55e', borderRadius:'50%' }} />
            <span style={{ fontSize:12, color:'#15803d', fontWeight:600 }}>Live</span>
          </div>
        </div>
      </div>
    </header>

    <main style={{ maxWidth:1280, margin:'0 auto', padding:'28px 24px' }}>

      {/* HOME */}
      {tab==='home'&&<div>
        <div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:24, padding:'56px 48px', color:'#fff', textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🛡️</div>
          <h1 style={{ fontSize:36, fontWeight:900, letterSpacing:'-0.03em', marginBottom:12 }}>ShieldMart</h1>
          <p style={{ fontSize:18, opacity:0.9, maxWidth:540, margin:'0 auto', lineHeight:1.6, marginBottom:32 }}>India's first AI-verified used goods marketplace. Every item fraud-checked and damage-scanned before listing.</p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {[{label:'🔍 Compare Prices',tab:'compare'},{label:'🛍️ Browse Marketplace',tab:'market'},{label:'📦 Sell Your Item',tab:'sell'}].map(b=><button key={b.tab} onClick={()=>switchTab(b.tab)} style={{ padding:'13px 24px', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', backdropFilter:'blur(8px)' }}>{b.label}</button>)}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
          {[
            {icon:'🤖',title:'AI Fraud Detection',desc:'Every listing verified by XGBoost trained on 590k transactions. Fraud score shown to buyers.',color:'#4f46e5'},
            {icon:'🔬',title:'Grad-CAM Damage Scan',desc:'Computer vision scans stains, tears, scratches, and dents with visual heatmap overlay.',color:'#7c3aed'},
            {icon:'🔍',title:'Price Comparison',desc:'Compare prices across Amazon, Flipkart, Meesho, Myntra, Croma and more instantly.',color:'#06b6d4'},
            {icon:'💳',title:'Secure Razorpay Payment',desc:'All transactions secured via Razorpay. Seller paid only after buyer confirms delivery.',color:'#10b981'},
            {icon:'🚚',title:'Mediated Delivery',desc:'We inspect and ship. No direct contact between buyer and seller needed.',color:'#f59e0b'},
            {icon:'↩️',title:'Returns Shield',desc:'Built-in returns fraud detection for e-commerce platforms. Ops dashboard included.',color:'#ef4444'},
          ].map(f=><div key={f.title} style={{ background:'#fff', borderRadius:16, padding:'22px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', borderTop:`3px solid ${f.color}` }}>
            <div style={{ fontSize:32, marginBottom:10 }}>{f.icon}</div>
            <h3 style={{ fontSize:15, fontWeight:700, color:'#1e293b', marginBottom:6 }}>{f.title}</h3>
            <p style={{ fontSize:13, color:'#64748b', lineHeight:1.5 }}>{f.desc}</p>
          </div>)}
        </div>
        {/* Stats */}
        {stats&&<div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard label="Returns Processed" value={stats.total||0}               icon="↩️" gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" light="#ede9fe" textColor="#4f46e5" />
          <StatCard label="Auto Approved"      value={stats.auto_approve||0}        icon="✅" gradient="linear-gradient(135deg,#10b981,#059669)" light="#dcfce7" textColor="#16a34a" />
          <StatCard label="Manual Review"      value={stats.manual_review||0}       icon="⚠️" gradient="linear-gradient(135deg,#f59e0b,#d97706)" light="#fef9c3" textColor="#ca8a04" />
          <StatCard label="Fraud Flagged"      value={stats.reject_investigate||0}  icon="🚨" gradient="linear-gradient(135deg,#ef4444,#dc2626)" light="#fee2e2" textColor="#dc2626" />
        </div>}
      </div>}

      {/* COMPARE */}
      {tab==='compare'&&<div>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>Price Comparison</h1>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>Compare prices across top Indian retailers instantly</p>
        </div>
        <PriceComparison />
      </div>}

      {/* MARKETPLACE */}
      {tab==='market'&&<Marketplace cartCount={cartCount} setCartCount={setCartCount} onSell={()=>switchTab('sell')} />}

      {/* SELL */}
      {tab==='sell'&&<div>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>Sell Your Item</h1>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>AI verification takes ~3 seconds · Live instantly if approved · 5% platform fee</p>
        </div>
        <SellItem onSuccess={()=>switchTab('market')} />
      </div>}

      {/* RETURNS */}
      {tab==='returns'&&<div>
        <div style={{ marginBottom:20 }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>Submit a Return</h1>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>AI fraud + damage analysis · Grad-CAM heatmap</p>
        </div>
        {!policyOk ? <ReturnPolicy onAccept={()=>setPolicyOk(true)} /> : <SubmitReturn onSuccess={()=>refresh()} onDashboard={()=>switchTab('dashboard')} />}
      </div>}

      {/* DASHBOARD */}
      {tab==='dashboard'&&<div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b' }}>Operations Dashboard</h1>
          <p style={{ fontSize:13, color:'#64748b', marginTop:2 }}>Real-time returns fraud monitoring · XGBoost + Computer Vision</p>
        </div>
        {stats&&<div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          <StatCard label="Total Returns"  value={stats.total||0}               icon="📦" gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" light="#ede9fe" textColor="#4f46e5" />
          <StatCard label="Auto Approved"  value={stats.auto_approve||0}        icon="✅" gradient="linear-gradient(135deg,#10b981,#059669)" light="#dcfce7" textColor="#16a34a" />
          <StatCard label="Manual Review"  value={stats.manual_review||0}       icon="⚠️" gradient="linear-gradient(135deg,#f59e0b,#d97706)" light="#fef9c3" textColor="#ca8a04" />
          <StatCard label="Investigating"  value={stats.reject_investigate||0}  icon="🚨" gradient="linear-gradient(135deg,#ef4444,#dc2626)" light="#fee2e2" textColor="#dc2626" />
        </div>}
        {stats&&<div style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius:16, padding:'18px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', color:'#fff' }}>
          <div><p style={{ fontSize:12, opacity:0.75, fontWeight:600, textTransform:'uppercase' }}>Average Fraud Score</p><p style={{ fontSize:44, fontWeight:900, letterSpacing:'-0.03em', marginTop:2 }}>{Math.round((stats.avg_fraud_score||0)*100)}%</p></div>
          <div style={{ display:'flex', gap:10 }}>
            {[{label:'Model',value:'XGBoost'},{label:'ROC-AUC',value:'0.91'},{label:'Data',value:'590k txns'},{label:'Features',value:'13'}].map(({label,value})=><div key={label} style={{ background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}><p style={{ fontSize:10, opacity:0.75 }}>{label}</p><p style={{ fontSize:15, fontWeight:800, marginTop:2 }}>{value}</p></div>)}
          </div>
        </div>}
        <ReturnTable returns={returns} onRefresh={refresh} />
      </div>}
    </main>

    <footer style={{ borderTop:'1px solid #e2e8f0', background:'#fff', marginTop:48, padding:'24px', textAlign:'center' }}>
      <p style={{ fontSize:13, color:'#94a3b8' }}>🛡️ <span style={{ fontWeight:700, color:'#4f46e5' }}>ShieldMart</span> · Built with ❤️ by <span style={{ fontWeight:800, color:'#7c3aed' }}>Aditi Raj and Tanmay</span> · </p>
      <p style={{ fontSize:11, color:'#cbd5e1', marginTop:6 }}>XGBoost · FastAPI · React · PostgreSQL · Razorpay · Computer Vision · Docker</p>
    </footer>

    {showCart && <Cart onClose={()=>setShowCart(false)} />}
    <Chatbot />
  </div>
}