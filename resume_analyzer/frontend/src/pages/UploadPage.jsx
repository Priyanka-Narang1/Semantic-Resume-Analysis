import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const ROLES = [
  // Tech
  'data scientist','ml engineer','ai ml intern','software engineer','software intern',
  'frontend developer','backend developer','full stack developer',
  'data analyst','data engineer','devops engineer','cloud architect',
  'android developer','ios developer','mobile developer',
  'cybersecurity analyst','embedded systems engineer',
  // Design
  'ui ux designer','graphic designer',
  // Business/Product
  'product manager','business analyst','project manager','research analyst',
  // Non-tech
  'digital marketer','content writer',
  'hr manager','financial analyst','legal associate','accountant',
];

const ROLE_GROUPS = [
  { label:'Technology & Engineering', roles:['data scientist','ml engineer','ai ml intern','software engineer','software intern','frontend developer','backend developer','full stack developer','data analyst','data engineer','devops engineer','cloud architect','android developer','ios developer','mobile developer','cybersecurity analyst','embedded systems engineer'] },
  { label:'Design', roles:['ui ux designer','graphic designer'] },
  { label:'Product & Business', roles:['product manager','business analyst','project manager','research analyst'] },
  { label:'Marketing & Content', roles:['digital marketer','content writer'] },
  { label:'Finance, HR & Legal', roles:['hr manager','financial analyst','legal associate','accountant'] },
];

const SAMPLES = [
  { label:'Software Engineer', role:'software engineer',
    resume:`John Smith\njohn@email.com | github.com/johnsmith\n\nSKILLS\nPython, JavaScript, React, Node.js, SQL, Git, Docker, HTML, CSS\n\nEXPERIENCE\nSoftware Developer - TechCorp (2022-2024)\n- Built REST APIs using Node.js serving 5000+ daily users\n- Improved page load speed by 40% through React optimization\n- Led a team of 3 developers to deliver features on schedule\n\nEDUCATION\nB.Tech Computer Science - Delhi University 2022\nCGPA: 8.1/10\n\nPROJECTS\nE-commerce Platform - Built with React, Node.js, MongoDB\nTask Manager App - Python Flask, PostgreSQL, deployed on AWS`,
    jd:`Software Engineer role.\nRequired: Python, JavaScript, React, SQL, Git, Docker, AWS, Testing\nPreferred: Kubernetes, TypeScript, CI/CD, GraphQL`
  },
  { label:'Data Analyst', role:'data analyst',
    resume:`Priya Patel\npriya@email.com\n\nSKILLS\nPython, Pandas, NumPy, SQL, Excel, Matplotlib\n\nEXPERIENCE\nData Intern - Analytics Co (2023)\n- Analyzed sales data for 10,000 records using Python\n- Created dashboards that reduced reporting time by 50%\n\nEDUCATION\nB.Sc Statistics - Mumbai University 2023\nCGPA: 7.8/10\n\nPROJECTS\nSales Forecasting Model - Python, scikit-learn, 85% accuracy`,
    jd:`Data Analyst role.\nRequired: SQL, Python, Excel, Statistics, Data Visualization\nPreferred: Tableau, Power BI, R, Machine Learning`
  },
];

export default function UploadPage({ onParsed }) {
  const [resumeText, setResumeText] = useState('');
  const [jdText, setJdText]         = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [inputMode, setInputMode]   = useState('text');
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractFailed, setExtractFailed] = useState(false);
  const fileInputRef = useRef();

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.pdf','.docx','.txt'].includes(ext)) {
      setError('Only PDF, DOCX, TXT files are supported.'); return;
    }
    setUploadedFile(file);
    setError('');
    setResumeText('');
    setExtractFailed(false);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/parse/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000
      });
      if (res.data.success && res.data.text && res.data.text.trim().length >= 50) {
        setResumeText(res.data.text);
        setExtractFailed(false);
      } else {
        setExtractFailed(true);
        setError('');
      }
    } catch (err) {
      setExtractFailed(true);
      setError('');
    } finally {
      setExtracting(false);
    }
  }, []);

  function loadSample(s) {
    setInputMode('text');
    setResumeText(s.resume);
    setJdText(s.jd);
    setTargetRole(s.role);
    setError('');
    setUploadedFile(null);
    setExtractFailed(false);
  }

  function handleSubmit() {
    setError('');
    if (extracting) { setError('Still reading the file, please wait...'); return; }
    if (resumeText.trim().length < 50) {
      if (inputMode === 'file' && uploadedFile && extractFailed) {
        setError('PDF text extraction failed. Switch to "Paste Text" tab and paste your resume text there.'); return;
      }
      if (inputMode === 'file' && uploadedFile) {
        setError('Still processing. If the issue persists, switch to Paste Text mode.'); return;
      }
      setError('Resume is too short. Paste your full resume text.'); return;
    }
    if (!jdText.trim() && !targetRole) {
      setError('Please add a job description or select a target role.'); return;
    }
    onParsed({ resumeText, jdText, targetRole, uploadedFile, inputMode });
  }

  const canSubmit = !extracting && resumeText.trim().length >= 50 && (jdText.trim().length > 0 || targetRole);

  return (
    <div className="fade-in" style={{ maxWidth:900, margin:'0 auto' }}>
      {/* Hero */}
      <div style={{ textAlign:'center', padding:'12px 0 40px' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--primary-light)', color:'var(--primary)', padding:'4px 14px', borderRadius:99, fontSize:12, fontWeight:600, marginBottom:16, border:'1px solid var(--primary-mid)' }}>
          AI-Powered Analysis
        </div>
        <h1 style={{ fontSize:36, fontWeight:800, color:'var(--gray-900)', marginBottom:12, lineHeight:1.2 }}>
          Unlock Your <span style={{ color:'var(--primary)' }}>Career Potential</span>
        </h1>
        <p style={{ color:'var(--gray-500)', fontSize:16, maxWidth:520, margin:'0 auto', lineHeight:1.6 }}>
          Analyze your resume against any job description to identify skill gaps and get a personalized learning roadmap.
        </p>
      </div>

      {/* Steps */}
      <div className="step-bar" style={{ maxWidth:500, margin:'0 auto 36px' }}>
        <div className="step-item"><div className="step-circle active">1</div><div className="step-label active">Upload Data</div></div>
        <div className="step-connector" style={{ background:'var(--gray-200)' }} />
        <div className="step-item"><div className="step-circle">2</div><div className="step-label">Review Parse</div></div>
        <div className="step-connector" style={{ background:'var(--gray-200)' }} />
        <div className="step-item"><div className="step-circle">3</div><div className="step-label">Get Analysis</div></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
        {/* Left: Resume */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'var(--primary-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2 style={{ fontSize:16, fontWeight:700 }}>Your Resume</h2>
          </div>

          <div className="tabs-bar" style={{ marginBottom:16 }}>
            <button className={`tab-btn ${inputMode==='text'?'active':''}`} onClick={() => { setInputMode('text'); setExtractFailed(false); }}>Paste Text</button>
            <button className={`tab-btn ${inputMode==='file'?'active':''}`} onClick={() => setInputMode('file')}>Upload File</button>
          </div>

          {inputMode === 'text' ? (
            <div>
              <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                placeholder={"Paste your full resume text here...\n\nInclude all sections:\n- Skills\n- Work Experience\n- Education\n- Projects\n- Certifications"}
                style={{ padding:'12px 14px', height:280, resize:'vertical', lineHeight:1.6, fontSize:13, fontFamily:'monospace', width:'100%', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', outline:'none', display:'block' }}
                onFocus={e => e.target.style.borderColor='var(--primary)'}
                onBlur={e => e.target.style.borderColor='var(--gray-200)'}
              />
              <div style={{ textAlign:'right', fontSize:11, color:'var(--gray-400)', marginTop:6 }}>
                {resumeText.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
          ) : (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                onClick={() => !extracting && fileInputRef.current.click()}
                style={{
                  border:`2px dashed ${dragOver ? 'var(--primary)' : resumeText ? 'var(--success)' : extractFailed ? 'var(--warning)' : 'var(--gray-300)'}`,
                  borderRadius:12, padding:'32px 20px', textAlign:'center',
                  cursor: extracting ? 'wait' : 'pointer',
                  background: resumeText ? 'var(--success-light)' : extractFailed ? 'var(--warning-light)' : dragOver ? 'var(--primary-light)' : 'var(--gray-50)',
                  transition:'all 0.2s', minHeight:180,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10
                }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display:'none' }}
                  onChange={e => handleFileSelect(e.target.files[0])} />

                {extracting ? (
                  <>
                    <div className="spinner" style={{ width:32, height:32 }} />
                    <div style={{ fontWeight:600, color:'var(--primary)', fontSize:14 }}>Reading {uploadedFile?.name}...</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)' }}>Extracting text from your resume</div>
                  </>
                ) : resumeText && uploadedFile ? (
                  <>
                    <div style={{ width:44, height:44, borderRadius:12, background:'var(--success-light)', border:'2px solid var(--success-mid)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div style={{ fontWeight:700, color:'var(--success)', fontSize:14 }}>{uploadedFile.name}</div>
                    <div style={{ fontSize:12, color:'var(--gray-500)' }}>
                      {resumeText.split(/\s+/).filter(Boolean).length} words extracted successfully
                    </div>
                    <div style={{ fontSize:11, color:'var(--gray-400)' }}>Click to change file</div>
                  </>
                ) : extractFailed ? (
                  <>
                    <div style={{ width:44, height:44, borderRadius:12, background:'var(--warning-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div style={{ fontWeight:700, color:'var(--warning)', fontSize:14 }}>Could not read this PDF</div>
                    <div style={{ fontSize:12, color:'var(--gray-600)', maxWidth:240, textAlign:'center' }}>
                      This PDF may be scanned or image-based. Switch to <strong>Paste Text</strong> and paste your resume text instead.
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setInputMode('text'); }}>
                      Switch to Paste Text
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ width:48, height:48, borderRadius:12, background:'var(--gray-100)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div style={{ fontWeight:600, color:'var(--gray-700)' }}>Upload Resume</div>
                    <div style={{ fontSize:12, color:'var(--gray-400)', maxWidth:220 }}>
                      Drag and drop your PDF or Word document, or click to browse
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop:2 }}>Choose File</button>
                  </>
                )}
              </div>

              {resumeText && uploadedFile && !extracting && (
                <div style={{ marginTop:10, padding:'10px 14px', background:'var(--success-light)', border:'1px solid var(--success-mid)', borderRadius:'var(--radius-sm)', fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ color:'var(--gray-600)' }}>Text extracted.</span>
                  <button onClick={() => setInputMode('text')} style={{ background:'none', border:'none', color:'var(--primary)', fontWeight:600, cursor:'pointer', fontSize:13, fontFamily:'inherit', marginLeft:'auto' }}>
                    Review extracted text
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Samples */}
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Or try a sample</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => loadSample(s)} className="btn btn-secondary btn-sm" style={{ fontSize:12 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: JD + Role */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
              </div>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Target Opportunity</h2>
            </div>

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--gray-600)', marginBottom:6 }}>Expected Role</label>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)}
              style={{ padding:'9px 12px', marginBottom:16, cursor:'pointer', fontSize:14, width:'100%', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', outline:'none', background:'#fff' }}>
              <option value="">Select a target role (optional)</option>
              {ROLE_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </optgroup>
              ))}
            </select>

            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--gray-600)', marginBottom:6 }}>Job Description</label>
            <textarea value={jdText} onChange={e => setJdText(e.target.value)}
              placeholder={"Paste the full job description here...\n\nInclude Requirements and About the Team sections for best results."}
              style={{ padding:'12px 14px', height:180, resize:'vertical', lineHeight:1.6, width:'100%', border:'1.5px solid var(--gray-200)', borderRadius:'var(--radius)', outline:'none', fontSize:14, display:'block' }}
              onFocus={e => e.target.style.borderColor='var(--primary)'}
              onBlur={e => e.target.style.borderColor='var(--gray-200)'}
            />

            <div style={{ marginTop:12, padding:'10px 12px', borderRadius:'var(--radius-sm)', background:'var(--gray-50)', border:'1px solid var(--gray-200)', display:'flex', gap:8, alignItems:'flex-start' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontSize:12, color:'var(--gray-500)' }}>
                <strong style={{ color:'var(--gray-700)' }}>Pro Tip: </strong>
                Include the "About the Team" and "Requirements" sections for the most accurate skill gap analysis.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ background:'var(--danger-light)', border:'1px solid var(--danger-mid)', borderRadius:'var(--radius)', padding:'12px 14px', color:'var(--danger)', fontSize:13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!canSubmit}
            style={{ width:'100%', justifyContent:'center' }}>
            {extracting
              ? <><div className="spinner" style={{ width:16, height:16 }} /> Reading file...</>
              : <>Analyze Resume <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
            }
          </button>

          <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-400)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              100% Secure and Private
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-400)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Covers 29 roles and 500+ skills
            </div>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginTop:52 }}>
        {[
          { color:'var(--primary)', bg:'var(--primary-light)', title:'Skill Gap Analysis', desc:'Identifies missing hard skills, soft skills, and tools across 22 skill categories covering tech, design, business, and more.',
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> },
          { color:'#c2410c', bg:'#fff7ed', title:'Smart Rewrites', desc:'Gets context from your actual resume to give specific, actionable advice — not generic templates. Mentions your own projects by name.',
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
          { color:'var(--success)', bg:'var(--success-light)', title:'Personalized Roadmap', desc:'Builds a phased learning plan with free courses, hackathon links, and realistic time estimates based on your specific gaps.',
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
        ].map(f => (
          <div key={f.title} style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius:14, padding:'24px 20px' }}>
            <div style={{ width:40, height:40, borderRadius:10, background:f.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>{f.icon}</div>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>{f.title}</h3>
            <p style={{ fontSize:13, color:'var(--gray-500)', lineHeight:1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
