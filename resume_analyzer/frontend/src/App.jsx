import React, { useState } from 'react';
import './index.css';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import MatchOverview from './pages/MatchOverview';
import DetailedGaps from './pages/DetailedGaps';
import LearningPlan from './pages/LearningPlan';

const NAV = [
  { id: 'upload',   label: 'Upload Data',     icon: UploadIcon },
  { id: 'review',   label: 'Review Input',     icon: ReviewIcon },
  { id: 'match',    label: 'Match Overview',   icon: MatchIcon },
  { id: 'gaps',     label: 'Detailed Gaps',    icon: GapIcon },
  { id: 'roadmap',  label: 'Learning Plan',    icon: RoadmapIcon },
];

export default function App() {
  const [page, setPage] = useState('upload');
  const [result, setResult] = useState(null);
  const [rawInputs, setRawInputs] = useState(null);

  const unlocked = result
    ? ['upload','review','match','gaps','roadmap']
    : rawInputs
    ? ['upload','review']
    : ['upload'];

  function handleParsed(inputs) {
    setRawInputs(inputs);
    setPage('review');
  }

  function handleAnalyzed(data) {
    setResult(data);
    setPage('match');
  }

  function handleReset() {
    setResult(null);
    setRawInputs(null);
    setPage('upload');
  }

  const hardGaps = result?.gap_analysis?.summary?.hard_gap_count ?? 0;

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={handleReset}>
          <div style={{
            width:32, height:32, borderRadius:9,
            background:'linear-gradient(135deg,#2563eb,#06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:800, fontSize:15
          }}>J</div>
          <span style={{ fontWeight:800, fontSize:16, color:'var(--gray-900)' }}>JobFit</span>
          <span style={{
            background:'var(--primary-light)', color:'var(--primary)',
            fontSize:10, fontWeight:700, padding:'2px 8px',
            borderRadius:99, letterSpacing:'0.04em'
          }}>AI</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {result && (
            <span style={{ fontSize:12, color:'var(--gray-400)' }}>
              Analyzing: <strong style={{ color:'var(--gray-700)' }}>{result.target_role || 'General'}</strong>
            </span>
          )}
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background:'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:12, fontWeight:700
          }}>U</div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div style={{ flex:1 }}>
            <div className="nav-section-label">Analysis</div>
            {NAV.map((item, i) => {
              const Icon = item.icon;
              const locked = !unlocked.includes(item.id);
              return (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''} ${locked ? 'disabled' : ''}`}
                  onClick={() => !locked && setPage(item.id)}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.id === 'gaps' && hardGaps > 0 && (
                    <span className="nav-badge">{hardGaps}</span>
                  )}
                </button>
              );
            })}
          </div>

          {result && (
            <div style={{ padding:'0 8px 16px' }}>
              <div style={{
                padding:'12px 14px', background:'var(--gray-50)',
                borderRadius:'var(--radius)', border:'1px solid var(--gray-200)'
              }}>
                <div style={{
                  fontSize:9, fontWeight:800, textTransform:'uppercase',
                  letterSpacing:'0.08em', color:'var(--primary)', marginBottom:4
                }}>Current Analysis</div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--gray-800)', marginBottom:2 }}>
                  {result.target_role
                    ? result.target_role.charAt(0).toUpperCase() + result.target_role.slice(1)
                    : 'General Role'}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>
                  {result.resume_info?.file_name || 'Resume'}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="main-content">
          {page === 'upload'  && <UploadPage onParsed={handleParsed} onReset={handleReset} />}
          {page === 'review'  && <ReviewPage inputs={rawInputs} onAnalyzed={handleAnalyzed} onBack={() => setPage('upload')} />}
          {page === 'match'   && result && <MatchOverview data={result} onFix={() => setPage('gaps')} />}
          {page === 'gaps'    && result && <DetailedGaps data={result} onRoadmap={() => setPage('roadmap')} />}
          {page === 'roadmap' && result && <LearningPlan data={result} />}
        </main>
      </div>
    </div>
  );
}

/* ── SVG icons (inline, no emoji, no unicode) ── */
function UploadIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}
function ReviewIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
}
function MatchIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function GapIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function RoadmapIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
