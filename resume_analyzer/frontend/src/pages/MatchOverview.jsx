import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ScoreGauge from '../components/ScoreGauge';

export default function MatchOverview({ data, onFix }) {
  const score   = data.score_breakdown || {};
  const summary = data.gap_analysis?.summary || {};
  const gaps    = data.gap_analysis?.gaps || [];
  const resumeSkills = data.resume_skills || {};
  const jdSkills     = data.jd_skills || {};
  const finalScore   = score.final_score || 0;

  // Top gaps for scoring logic — assign impact based on severity, not array position
  const topGaps = gaps.filter(g => g.gap_type === 'HARD GAP').slice(0, 3);

  function getImpact(gap) {
    if (gap.severity >= 8) return 'high';
    if (gap.severity >= 5) return 'medium';
    return 'low';
  }

  // Category chart
  const CAT_LABELS = {
    programming_languages:'Languages', web_frameworks:'Frameworks',
    databases:'Databases', cloud_devops:'Cloud/DevOps', ml_ai:'ML/AI',
    design_ui_ux:'Design', marketing_growth:'Marketing',
    business_management:'Business', soft_skills:'Soft Skills', other:'Other'
  };
  const resumeCats = resumeSkills.skills_by_category || {};
  const jdCats     = jdSkills.skills_by_category || {};
  const allCats    = new Set([...Object.keys(resumeCats), ...Object.keys(jdCats)]);
  const chartData  = [];
  for (const cat of allCats) {
    const label = CAT_LABELS[cat];
    if (!label) continue;
    const yours = resumeCats[cat]?.length || 0;
    const req   = jdCats[cat]?.length || 0;
    if (yours > 0 || req > 0) chartData.push({ name:label, You:yours, Required:req });
  }
  chartData.sort((a,b) => (b.You + b.Required) - (a.You + a.Required));

  return (
    <div className="fade-in" style={{ maxWidth:960, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>Match Overview</h1>
          <p style={{ color:'var(--gray-500)', fontSize:13.5 }}>
            Detailed analysis of your fit for{' '}
            <strong style={{ color:'var(--gray-800)' }}>
              {data.target_role && data.target_role !== 'Not specified'
                ? data.target_role.charAt(0).toUpperCase() + data.target_role.slice(1)
                : 'this role'}
            </strong>
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Parsed Input
          </button>
          <button className="btn btn-primary btn-sm" onClick={onFix}>
            Fix Skill Gaps
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:24, marginBottom:24 }}>
        {/* Score card */}
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'32px 24px' }}>
          <ScoreGauge score={finalScore} size={180} />
          <div className="divider" style={{ width:'100%', margin:'20px 0 16px' }} />
          <div style={{ display:'flex', gap:24, width:'100%', justifyContent:'center' }}>
            <ScoreStat value={`${summary.match_count || 0}/${summary.total_jd_skills || 0}`} label="Matched" color="var(--gray-600)" />
            <ScoreStat value={summary.hard_gap_count || 0} label="Missing" color="var(--danger)" />
            <ScoreStat value={summary.transferable_count || 0} label="Bridgeable" color="var(--warning)" />
          </div>

          {summary.transferable_count > 0 && (
            <div style={{ marginTop:20, padding:'12px 16px', background:'var(--accent-light)', border:'1px solid #a5f3fc', borderRadius:'var(--radius)', width:'100%', display:'flex', alignItems:'flex-start', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#0e7490', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0e7490', marginBottom:2 }}>Optimization Ready</div>
                <div style={{ fontSize:12, color:'#164e63' }}>
                  {summary.transferable_count} skill gap{summary.transferable_count > 1 ? 's' : ''} can be bridged by updating your project descriptions.
                </div>
              </div>
              <button className="btn btn-sm" onClick={onFix} style={{ background:'#0e7490', color:'#fff', marginLeft:'auto', flexShrink:0 }}>
                Improve Score
              </button>
            </div>
          )}
        </div>

        {/* Scoring logic */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Scoring Logic Analysis</h2>
          </div>
          <p style={{ fontSize:12.5, color:'var(--gray-400)', marginBottom:18 }}>Citations from your resume affecting the total score.</p>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {topGaps.length > 0 ? topGaps.map((gap, i) => (
              <ScoringCard key={gap.skill} gap={gap} impact={getImpact(gap)} onFix={onFix} />
            )) : (
              (score.evidence || []).slice(0, 3).map((e, i) => (
                <div key={i} style={{ border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', padding:'14px' }}>
                  <p style={{ fontSize:13, color:'var(--gray-600)', lineHeight:1.6 }}>{e}</p>
                </div>
              ))
            )}
            {topGaps.length === 0 && !score.evidence?.length && (
              <div style={{ padding:'24px', textAlign:'center', color:'var(--gray-400)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" style={{ margin:'0 auto 8px', display:'block' }}><polyline points="20 6 9 17 4 12"/></svg>
                <p style={{ fontWeight:600, color:'var(--success)' }}>Excellent match — no critical gaps found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ marginBottom:8 }}>
            <h2 style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Skill Category Proficiency</h2>
            <p style={{ fontSize:13, color:'var(--gray-400)' }}>
              How many skills <strong style={{ color:'var(--primary)' }}>you have</strong> vs how many the job <strong style={{ color:'#94a3b8' }}>requires</strong> per category.
              Taller blue bar = stronger in that area. Taller gray bar = more to learn in that category.
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top:5, right:20, left:-10, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:11, fill:'var(--gray-500)', fontFamily:'Inter,sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'var(--gray-400)', fontFamily:'Inter,sans-serif' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius:10, border:'1px solid var(--gray-200)', fontSize:13, fontFamily:'Inter,sans-serif' }}
                formatter={(value, name) => [
                  `${value} skill${value !== 1 ? 's' : ''}`,
                  name === 'You' ? 'You have' : 'Job requires'
                ]}
              />
              <Legend
                formatter={(value) => value === 'You' ? 'You have' : 'Job requires'}
                wrapperStyle={{ fontSize:13, fontFamily:'Inter,sans-serif' }}
              />
              <Bar dataKey="You" fill="#2563eb" radius={[5,5,0,0]} name="You" />
              <Bar dataKey="Required" fill="#94a3b8" radius={[5,5,0,0]} name="Required" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CTA */}
      <div style={{ background:'linear-gradient(135deg, var(--primary-light), var(--accent-light))', border:'1px solid var(--primary-mid)', borderRadius:16, padding:'24px 28px', display:'flex', alignItems:'center', gap:20 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>Ready to close the gaps?</h3>
          <p style={{ fontSize:13, color:'var(--gray-500)' }}>The AI has generated a custom learning roadmap to help you hit 100%.</p>
        </div>
        <button className="btn btn-primary" onClick={onFix}>
          Generate Learning Plan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
      </div>
    </div>
  );
}

function ScoreStat({ value, label, color }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:22, fontWeight:800, color, marginBottom:2 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--gray-400)', fontWeight:500 }}>{label}</div>
    </div>
  );
}

function ScoringCard({ gap, impact, onFix }) {
  const impactConfig = {
    high:   { label:'High Impact',   cls:'impact-high' },
    medium: { label:'Medium Impact', cls:'impact-medium' },
    low:    { label:'Low Impact',    cls:'impact-low' },
  };
  const cfg = impactConfig[impact];
  const isSoft = gap.category === 'soft_skills';

  return (
    <div style={{ border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span className={`impact-pill ${cfg.cls}`}>{cfg.label}</span>
          {isSoft && (
            <span style={{ background:'#f0fdf4', color:'#166534', border:'1px solid #bbf7d0', borderRadius:99, fontSize:10, fontWeight:700, padding:'2px 8px' }}>
              Soft Skill
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, color:'var(--danger)', fontSize:12, fontWeight:600 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Deduction
        </div>
      </div>

      <p style={{ fontWeight:600, fontSize:14, color:'var(--gray-800)', marginBottom:8, textTransform:'capitalize' }}>
        Missing '{gap.skill}' {isSoft ? 'demonstrated' : 'listed'} in your resume.
      </p>

      <div className="evidence-quote">
        "{gap.reason?.split('\n')[0]?.slice(0, 150) || 'This skill is required by the job description.'}"
      </div>

      <button onClick={onFix} style={{ background:'none', border:'none', color:'var(--primary)', fontSize:12, fontWeight:600, cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:4, marginTop:8 }}>
        View optimization suggestion
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>
  );
}
