import React, { useState } from 'react';

const GAP_CFG = {
  'HARD GAP':     { label:'Hard Gap',    color:'#b91c1c', bg:'#fef2f2', border:'#fecaca', dot:'#dc2626' },
  'TRANSFERABLE': { label:'Transferable',color:'#92400e', bg:'#fffbeb', border:'#fde68a', dot:'#d97706' },
  'PREFERRED GAP':{ label:'Preferred',  color:'#1e40af', bg:'#eff6ff', border:'#bfdbfe', dot:'#2563eb' },
};

const CAT_LABELS = {
  programming_languages:'Language', web_frameworks:'Framework', databases:'Database',
  cloud_devops:'Cloud/DevOps', ml_ai:'ML/AI', data_engineering:'Data Eng.',
  soft_skills:'Soft Skill', mobile:'Mobile', security:'Security', testing:'Testing', other:'Other'
};

// Render multi-line rewrite text (newlines and numbered lists)
function RewriteText({ text }) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div style={{ fontSize:13, color:'#1e40af', lineHeight:1.7 }}>
      {lines.map((line, i) => {
        const isNumbered = /^\d+\./.test(line.trim());
        const isBullet   = /^[-•]/.test(line.trim());
        const isHeader   = line.trim().endsWith(':') && line.length < 60;
        if (isHeader) return (
          <div key={i} style={{ fontWeight:700, color:'var(--primary)', marginTop: i > 0 ? 8 : 0, marginBottom:4, fontSize:12 }}>
            {line}
          </div>
        );
        if (isNumbered || isBullet) return (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:4, paddingLeft:4 }}>
            <span style={{ color:'var(--primary)', fontWeight:700, flexShrink:0, marginTop:1 }}>
              {isNumbered ? line.trim().match(/^\d+\./)[0] : '•'}
            </span>
            <span style={{ fontStyle:'italic' }}>
              {isNumbered ? line.trim().replace(/^\d+\.\s*/, '') : line.trim().replace(/^[-•]\s*/, '')}
            </span>
          </div>
        );
        return (
          <p key={i} style={{ marginBottom: i < lines.length - 1 ? 6 : 0, fontStyle:'italic' }}>
            {line}
          </p>
        );
      })}
    </div>
  );
}

export default function DetailedGaps({ data, onRoadmap }) {
  const [filter, setFilter]       = useState('all');
  const [addedToPlan, setAddedToPlan] = useState([]);

  const gaps    = data.gap_analysis?.gaps || [];
  const summary = data.gap_analysis?.summary || {};

  const counts = {
    all:         gaps.length,
    hard:        gaps.filter(g => g.gap_type === 'HARD GAP').length,
    transferable:gaps.filter(g => g.gap_type === 'TRANSFERABLE').length,
    preferred:   gaps.filter(g => g.gap_type === 'PREFERRED GAP').length,
  };

  const filtered = filter === 'all'          ? gaps
    : filter === 'hard'         ? gaps.filter(g => g.gap_type === 'HARD GAP')
    : filter === 'transferable' ? gaps.filter(g => g.gap_type === 'TRANSFERABLE')
    : gaps.filter(g => g.gap_type === 'PREFERRED GAP');

  function togglePlan(skill) {
    setAddedToPlan(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  }

  return (
    <div className="fade-in" style={{ maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>Detailed Gap Analysis</h1>
          <p style={{ color:'var(--gray-500)', fontSize:13.5 }}>
            We identified {gaps.length} areas for optimization to reach 100% role compatibility.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Re-analyze
          </button>
          <button className="btn btn-primary btn-sm" onClick={onRoadmap}>
            View Roadmap
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:24 }}>
        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ padding:'14px' }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--gray-400)', marginBottom:10 }}>Gap Categories</div>
            {[
              { key:'all',         label:'All Gaps',    count:counts.all },
              { key:'hard',        label:'Hard Gaps',   count:counts.hard,        color:'var(--danger)' },
              { key:'transferable',label:'Transferable',count:counts.transferable, color:'var(--warning)' },
              { key:'preferred',   label:'Preferred',   count:counts.preferred,   color:'var(--primary)' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', padding:'8px 10px', borderRadius:7, border:'none',
                background: filter === f.key ? 'var(--primary-light)' : 'transparent',
                color: filter === f.key ? 'var(--primary)' : 'var(--gray-600)',
                fontWeight: filter === f.key ? 600 : 500,
                cursor:'pointer', fontSize:13, fontFamily:'inherit', marginBottom:2
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  {f.key !== 'all' && <div style={{ width:7, height:7, borderRadius:'50%', background:f.color || 'var(--gray-400)' }} />}
                  {f.label}
                </div>
                <span style={{
                  background: filter === f.key ? 'var(--primary)' : 'var(--gray-200)',
                  color: filter === f.key ? '#fff' : 'var(--gray-600)',
                  borderRadius:99, padding:'1px 8px', fontSize:11, fontWeight:700
                }}>{f.count}</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding:'14px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', display:'flex', alignItems:'center', gap:5, marginBottom:8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Pro Tip
            </div>
            <p style={{ fontSize:12, color:'var(--gray-500)', lineHeight:1.6 }}>
              "Transferable" skills are often already in your background. Use the{' '}
              <strong style={{ color:'var(--primary)' }}>Suggested Rewrites</strong> to bridge
              these without taking new courses.
            </p>
          </div>

          {addedToPlan.length > 0 && (
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-400)', marginBottom:8 }}>Bulk Actions</div>
              <button className="btn btn-primary btn-sm" onClick={onRoadmap} style={{ width:'100%', justifyContent:'center' }}>
                View {addedToPlan.length} skill{addedToPlan.length > 1 ? 's' : ''} in Plan
              </button>
            </div>
          )}
        </div>

        {/* Gap list */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontSize:13, color:'var(--gray-500)', fontWeight:500 }}>Showing {filtered.length} items</span>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-500)' }}>
              Sort by: <strong style={{ color:'var(--gray-700)' }}>Priority</strong>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign:'center', padding:'40px', color:'var(--gray-400)' }}>
                No gaps in this category.
              </div>
            ) : (
              filtered.map((gap, i) => (
                <GapDetailCard
                  key={gap.skill + i}
                  gap={gap}
                  inPlan={addedToPlan.includes(gap.skill)}
                  onAddToPlan={() => togglePlan(gap.skill)}
                  onRoadmap={onRoadmap}
                />
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div style={{ marginTop:28, textAlign:'center' }}>
              <button className="btn btn-primary" onClick={onRoadmap}>
                Continue to Learning Roadmap
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GapDetailCard({ gap, inPlan, onAddToPlan, onRoadmap }) {
  const [open, setOpen] = useState(false);
  const cfg = GAP_CFG[gap.gap_type] || GAP_CFG['PREFERRED GAP'];
  const isSoftSkill = gap.category === 'soft_skills';

  return (
    <div style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:'var(--radius-lg)', overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
          {/* Left: gap info */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--gray-900)', textTransform:'capitalize' }}>{gap.skill}</h3>
              <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, borderRadius:99, fontSize:11, fontWeight:700, padding:'3px 10px' }}>
                {cfg.label}
              </span>
              {gap.category && (
                <span className="badge badge-gray" style={{ fontSize:11 }}>
                  {CAT_LABELS[gap.category] || gap.category}
                </span>
              )}
              {isSoftSkill && (
                <span className="badge" style={{ background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', fontSize:11 }}>
                  Soft Skill
                </span>
              )}
            </div>

            {/* Diagnostic */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-400)', marginBottom:6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Diagnostic: Why this is a gap
              </div>
              <p style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.65 }}>{gap.reason}</p>
            </div>

            {/* Severity */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:11, color:'var(--gray-400)', fontWeight:500, minWidth:52 }}>Severity</span>
              <div style={{ width:120 }}>
                <div className="progress-track" style={{ height:5 }}>
                  <div className="progress-fill" style={{
                    width:(gap.severity / 10 * 100) + '%',
                    background: gap.severity >= 7 ? 'var(--danger)' : gap.severity >= 4 ? 'var(--warning)' : 'var(--success)'
                  }} />
                </div>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color: gap.severity >= 7 ? 'var(--danger)' : gap.severity >= 4 ? 'var(--warning)' : 'var(--success)' }}>
                {gap.severity}/10
              </span>
            </div>
          </div>

          {/* Right: collapsed rewrite preview */}
          {!open && gap.rewrite_suggestion && (
            <div style={{ width:280, flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--primary)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Resume Strategy: Suggested Rewrite
              </div>
              <div className="rewrite-box">
                {/* Show first meaningful line only in collapsed state */}
                <p style={{ fontSize:12.5, color:'#1e40af', lineHeight:1.6, fontStyle:'italic' }}>
                  "{gap.rewrite_suggestion.split('\n').find(l => l.trim().length > 20) || gap.rewrite_suggestion.slice(0, 160)}"
                </p>
                <button onClick={() => setOpen(true)} style={{
                  background:'none', border:'none', color:'var(--primary)',
                  fontSize:11.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                  padding:'4px 0 0', display:'block'
                }}>
                  See full strategy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expanded detail */}
        {open && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--gray-100)' }} className="fade-in-fast">

            {/* Bridge info for transferable */}
            {gap.transferable_from?.length > 0 && (
              <div style={{ background:'var(--warning-light)', border:'1px solid var(--warning-mid)', borderRadius:'var(--radius)', padding:'12px 16px', marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--warning)', marginBottom:5, display:'flex', alignItems:'center', gap:6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Bridge Available — You Already Have a Head Start
                </div>
                <p style={{ fontSize:13, color:'#92400e', lineHeight:1.65 }}>
                  Your experience with <strong>{gap.transferable_from.join(', ')}</strong> transfers
                  directly to <strong>{gap.skill}</strong>. You do not need to start from scratch — 
                  you need to apply your existing knowledge in a new context and make it explicit on your resume.
                </p>
              </div>
            )}

            {/* Evidence from resume */}
            {gap.resume_evidence && gap.resume_evidence.trim() && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--gray-500)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Found in your resume
                </div>
                <div className="evidence-quote">
                  "{gap.resume_evidence}"
                </div>
              </div>
            )}

            {/* Full rewrite strategy */}
            {gap.rewrite_suggestion && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--primary)', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  {isSoftSkill ? 'Action Plan to Demonstrate This Skill' : 'How to Add This to Your Resume'}
                </div>
                <div className="rewrite-box" style={{ padding:'14px 16px' }}>
                  <RewriteText text={gap.rewrite_suggestion} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions row */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:14 }}>
          <button onClick={onAddToPlan} style={{
            display:'flex', alignItems:'center', gap:6,
            background: inPlan ? 'var(--success-light)' : 'var(--primary-light)',
            color: inPlan ? 'var(--success)' : 'var(--primary)',
            border: `1px solid ${inPlan ? 'var(--success-mid)' : 'var(--primary-mid)'}`,
            borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit'
          }}>
            {inPlan
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Added to Plan</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add to Plan</>
            }
          </button>

          <button onClick={() => setOpen(!open)} style={{
            display:'flex', alignItems:'center', gap:5,
            background:'none', border:'none', color:'var(--primary)',
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', padding:'6px 0'
          }}>
            {open ? 'Collapse' : 'View full details'}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <button style={{
            display:'flex', alignItems:'center', gap:5, background:'none', border:'none',
            color:'var(--gray-400)', fontSize:12, cursor:'pointer', fontFamily:'inherit',
            padding:'6px 0', marginLeft:'auto'
          }}>
            Mark as Known
          </button>
        </div>
      </div>
    </div>
  );
}
