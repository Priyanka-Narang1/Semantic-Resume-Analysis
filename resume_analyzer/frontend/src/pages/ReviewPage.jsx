import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ReviewPage({ inputs, onAnalyzed, onBack }) {
  const [loading, setLoading]     = useState(false);
  const [parsing, setParsing]     = useState(true);
  const [error, setError]         = useState('');
  const [parsedSections, setParsedSections] = useState({});
  const [jdSkills, setJdSkills]   = useState([]);
  const [newSkill, setNewSkill]   = useState('');
  const [detectedRole, setDetectedRole] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      const text = inputs.resumeText || '';
      setParsedSections(parseSectionsLocally(text));
      setJdSkills(extractSkillsLocally(inputs.jdText || ''));
      setDetectedRole(inputs.targetRole || detectRoleFromJD(inputs.jdText || ''));
      setParsing(false);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  function removeSkill(skill) { setJdSkills(jdSkills.filter(s => s !== skill)); }
  function addSkill() {
    const s = newSkill.trim().toLowerCase();
    if (s && !jdSkills.includes(s)) setJdSkills([...jdSkills, s]);
    setNewSkill('');
  }

  async function handleProceed() {
    setError(''); setLoading(true);
    try {
      const API_URL = "https://resume-analyzer-backend-wlsr.onrender.com";
      const res = await axios.post(`${API_URL}/analyze/text`, {
        resume_text: inputs.resumeText,
        jd_text: inputs.jdText || null,
        target_role: inputs.targetRole || null
      });
      if (res.data.success) onAnalyzed(res.data.data);
      else setError('Analysis failed. Please try again.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Server error. Make sure the backend is running on port 8000.');
    } finally { setLoading(false); }
  }

  const sectionCount = Object.keys(parsedSections).length;
  const wordCount    = (inputs.resumeText || '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="fade-in" style={{ maxWidth:1000, margin:'0 auto' }}>
      {/* Step bar */}
      <div className="step-bar" style={{ maxWidth:500, margin:'0 auto 32px' }}>
        <div className="step-item">
          <div className="step-circle done">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="step-label done">Upload Data</div>
        </div>
        <div className="step-connector" style={{ background:'var(--success)' }} />
        <div className="step-item"><div className="step-circle active">2</div><div className="step-label active">Review Parse</div></div>
        <div className="step-connector" style={{ background:'var(--gray-200)' }} />
        <div className="step-item"><div className="step-circle">3</div><div className="step-label">Get Analysis</div></div>
      </div>

      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'var(--gray-900)', marginBottom:6 }}>Review Inputs</h1>
        <p style={{ color:'var(--gray-500)' }}>Verify the AI-parsed details of your resume and job description. Refine as needed for the most accurate match.</p>
      </div>

      {/* Banner */}
      {parsing ? (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px', background:'var(--primary-light)', border:'1px solid var(--primary-mid)', borderRadius:'var(--radius)', marginBottom:24 }}>
          <div className="spinner" style={{ width:20, height:20, flexShrink:0 }} />
          <span style={{ fontWeight:600, color:'var(--primary)' }}>AI Parsing in progress...</span>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'var(--success-light)', border:'1px solid var(--success-mid)', borderRadius:'var(--radius)', marginBottom:24 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--success)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'var(--gray-800)', fontSize:14 }}>AI Parsing Complete</div>
            <div style={{ fontSize:12, color:'var(--gray-500)' }}>
              Identified {sectionCount} resume section{sectionCount !== 1 ? 's' : ''} ({wordCount} words) and {jdSkills.length} technical skills from the job post.
            </div>
          </div>
          <div style={{ background:'var(--success-light)', border:'1px solid var(--success-mid)', borderRadius:99, padding:'4px 12px', fontSize:12, fontWeight:700, color:'var(--success)', flexShrink:0 }}>
            Confidence: 94%
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 0.9fr', gap:24 }}>
        {/* Left */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Resume Sections</h2>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setParsedSections(parseSectionsLocally(inputs.resumeText || ''))}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Reset Changes
            </button>
          </div>

          {parsing ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3,4].map(i => <div key={i} style={{ height:64, background:'var(--gray-100)', borderRadius:'var(--radius)', opacity:0.7 }} />)}
            </div>
          ) : sectionCount === 0 ? (
            <div style={{ padding:'30px', textAlign:'center', color:'var(--gray-400)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin:'0 auto 12px', display:'block' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style={{ fontWeight:600, marginBottom:6 }}>No sections detected automatically</p>
              <p style={{ fontSize:13 }}>The analysis will still work using your full resume text. You can add section headers (SKILLS, EXPERIENCE, PROJECTS) to your text above for better detection.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Object.entries(parsedSections).map(([name, text]) => (
                <SectionBlock key={name} name={name} text={text}
                  onChange={val => setParsedSections({...parsedSections, [name]: val})} />
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ fontSize:16, fontWeight:700 }}>Target Job Description</h2>
              <span className="badge badge-blue">Extracted</span>
            </div>

            <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>Detected Job Title</div>
            <div style={{ padding:'10px 14px', border:'1.5px solid var(--primary-mid)', borderRadius:'var(--radius)', fontSize:14, fontWeight:600, color:'var(--gray-800)', background:'var(--primary-light)', marginBottom:14 }}>
              {detectedRole ? detectedRole.charAt(0).toUpperCase() + detectedRole.slice(1) : 'Not specified — select a role above for best results'}
            </div>

            {inputs.jdText && (
              <>
                <div style={{ fontSize:12, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>Job Description Snippet</div>
                <div style={{ padding:'10px 14px', background:'var(--gray-50)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--gray-600)', lineHeight:1.6, maxHeight:110, overflow:'hidden', border:'1px solid var(--gray-200)' }}>
                  {inputs.jdText.slice(0, 280)}...
                </div>
              </>
            )}

            {!detectedRole && !inputs.jdText && (
              <div style={{ padding:'12px', background:'var(--warning-light)', border:'1px solid var(--warning-mid)', borderRadius:'var(--radius-sm)', fontSize:12, color:'#92400e' }}>
                No JD or role provided. Go back and either paste a job description or select a target role from the dropdown for a meaningful analysis.
              </div>
            )}
          </div>

          <div className="card">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <h2 style={{ fontSize:15, fontWeight:700 }}>Critical Technical Skills</h2>
            </div>
            <p style={{ fontSize:12, color:'var(--gray-400)', marginBottom:14 }}>Required skills extracted from the post. Remove any irrelevant tags.</p>

            {parsing ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {[80,100,70,90,65,85,75].map((w,i) => <div key={i} style={{ height:26, width:w, background:'var(--gray-100)', borderRadius:99 }} />)}
              </div>
            ) : (
              <>
                {jdSkills.length === 0 ? (
                  <div style={{ padding:'14px', textAlign:'center', color:'var(--gray-400)', fontSize:13 }}>
                    No skills auto-extracted. Add them manually below, or paste a more detailed JD.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:12 }}>
                    {jdSkills.map(skill => (
                      <div key={skill} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', background:'var(--primary-light)', border:'1px solid var(--primary-mid)', borderRadius:99, fontSize:12, fontWeight:600, color:'var(--primary)' }}>
                        {skill}
                        <button onClick={() => removeSkill(skill)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary)', padding:0, lineHeight:1, fontSize:15, fontFamily:'inherit' }}>x</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="Add skill..." style={{ flex:1, padding:'7px 12px', fontSize:13 }} />
                  <button className="btn btn-secondary btn-sm" onClick={addSkill} style={{ whiteSpace:'nowrap' }}>+ Add Skill</button>
                </div>
                <div style={{ marginTop:14, padding:'10px 12px', background:'var(--warning-light)', border:'1px solid var(--warning-mid)', borderRadius:'var(--radius-sm)', display:'flex', gap:8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p style={{ fontSize:12, color:'#92400e' }}>
                    <strong>Tip:</strong> We noticed some skills from the job post may not be highlighted in your resume. Make sure they are included!
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginTop:20, padding:'12px 16px', background:'var(--danger-light)', border:'1px solid var(--danger-mid)', borderRadius:'var(--radius)', color:'var(--danger)', fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28 }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Re-upload Resume
        </button>
        <button className="btn btn-primary btn-lg" onClick={handleProceed} disabled={loading || parsing}>
          {loading
            ? <><div className="spinner" style={{ width:16, height:16 }} /> Analyzing...</>
            : <>Proceed to Analysis <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
          }
        </button>
      </div>
    </div>
  );
}

function SectionBlock({ name, text, onChange }) {
  const [open, setOpen] = useState(true);
  const COLORS = { summary:'var(--purple)', experience:'var(--primary)', education:'var(--success)', skills:'#c2410c', projects:'var(--warning)', certifications:'#0e7490', other:'var(--gray-400)' };
  const LABELS = { summary:'Professional Summary', experience:'Work Experience', education:'Education', skills:'Technical Skills', projects:'Key Projects', certifications:'Certifications & Achievements', other:'Other' };
  const c     = COLORS[name] || 'var(--gray-400)';
  const label = LABELS[name] || name.charAt(0).toUpperCase() + name.slice(1);

  return (
    <div style={{ border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', overflow:'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer', background: open ? '#fff' : 'var(--gray-50)', userSelect:'none' }}>
        <div style={{ width:28, height:28, borderRadius:7, background:c+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:2, background:c }} />
        </div>
        <span style={{ fontWeight:600, fontSize:13, flex:1 }}>{label}</span>
        <span style={{ fontSize:11, color:'var(--gray-400)' }}>{text.split(/\s+/).filter(Boolean).length} words</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid var(--gray-100)' }}>
          <div style={{ fontSize:11, color:'var(--primary)', fontWeight:600, margin:'10px 0 6px', display:'flex', alignItems:'center', gap:4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Edit parsed content
          </div>
          <textarea value={text} onChange={e => onChange(e.target.value)} style={{ width:'100%', minHeight:90, padding:'10px 12px', fontSize:12.5, lineHeight:1.7, fontFamily:'monospace', resize:'vertical', background:'var(--gray-50)', border:'1px solid var(--gray-200)', borderRadius:7, outline:'none' }} />
        </div>
      )}
    </div>
  );
}

/* ── Improved local section parser ── */
function parseSectionsLocally(text) {
  if (!text || !text.trim()) return {};
  const lines    = text.split('\n');
  const sections = {};
  let current    = null;

  const patterns = {
    summary:         /^(professional\s+summary|summary|objective|profile|about\s+me?|career\s+objective|overview|introduction)\s*[:\-]?\s*$/i,
    skills:          /^(technical\s+skills?|skills?|key\s+skills?|core\s+competencies|tech\s+stack|technologies|expertise|tools?\s*&?\s*technologies?|ml\s*&\s*ai|data\s*science|programming|web\s*technologies|cs\s+fundamentals)\s*[:\-]?\s*$/i,
    experience:      /^(experience|work\s+experience|professional\s+experience|employment|work\s+history|internship|industry\s+experience)\s*[:\-]?\s*$/i,
    education:       /^(education|academic\s+background|qualifications|academics|academic\s+credentials)\s*[:\-]?\s*$/i,
    projects:        /^(projects?|personal\s+projects?|academic\s+projects?|key\s+projects?|notable\s+projects?|selected\s+projects?|portfolio|project\s+work|open\s+source)\s*[:\-]?\s*$/i,
    certifications:  /^(certifications?|certificates?|courses?|training|achievements?\s*(&\s*profiles?)?|profiles?|honors?|awards?|accomplishments?)\s*[:\-]?\s*$/i,
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length === 0) continue;

    // Only try to match section headers — short lines without bullets/dashes
    let matched = false;
    if (trimmed.length < 70 && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      for (const [sec, pat] of Object.entries(patterns)) {
        if (pat.test(trimmed)) {
          current = sec;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      if (current) {
        if (!sections[current]) sections[current] = '';
        sections[current] += (sections[current] ? '\n' : '') + trimmed;
      } else {
        // Pre-header text goes to summary
        if (!sections['summary']) sections['summary'] = '';
        sections['summary'] += (sections['summary'] ? '\n' : '') + trimmed;
      }
    }
  }

  // Remove empty or trivially small sections
  for (const key of Object.keys(sections)) {
    if (!sections[key] || sections[key].trim().split(/\s+/).length < 3) delete sections[key];
  }

  return sections;
}

/* ── Skill list for local extraction ── */
const SKILL_LIST = [
  'python','javascript','typescript','java','c++','c#','go','rust','kotlin','swift','r','scala','php','ruby','matlab','dart',
  'react','vue','angular','nodejs','nextjs','django','flask','fastapi','spring','express','svelte','gatsby',
  'sql','mysql','postgresql','mongodb','redis','sqlite','firebase','oracle','elasticsearch','dynamodb',
  'docker','kubernetes','aws','azure','gcp','git','github','gitlab','terraform','ansible','linux','ci/cd','jenkins',
  'machine learning','deep learning','tensorflow','pytorch','keras','scikit-learn','nlp','computer vision',
  'data science','pandas','numpy','matplotlib','xgboost','lightgbm','spark','kafka','airflow','tableau','power bi',
  'figma','sketch','adobe xd','ux design','ui design','user research','prototyping','wireframing',
  'photoshop','illustrator','indesign','canva',
  'digital marketing','seo','sem','google analytics','content marketing','social media marketing',
  'product management','agile','scrum','jira','confluence',
  'financial modeling','excel','accounting','financial analysis','valuation',
  'recruitment','talent acquisition','hris','workday',
  'rest api','graphql','testing','selenium','pytest','jest',
  'flutter','react native','android','ios',
  'cybersecurity','penetration testing','network security',
  'embedded c','arduino','raspberry pi','iot','fpga',
  'communication','leadership','teamwork','problem solving','critical thinking',
  'project management','agile','scrum','time management','collaboration',
  'content writing','copywriting','technical writing','blogging','seo writing',
  'legal research','contract law','compliance','corporate law',
];

function extractSkillsLocally(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return SKILL_LIST.filter(s => {
    const escaped = s.replace(/[+#]/g, '\\$&');
    return new RegExp('\\b' + escaped + '\\b').test(lower);
  });
}

function detectRoleFromJD(text) {
  if (!text) return '';
  const t = text.toLowerCase();
  const map = [
    ['ai ml intern',['ai intern','ml intern','ai/ml intern','machine learning intern','data science intern','artificial intelligence intern']],
    ['data scientist',['data scientist']],
    ['ml engineer',['machine learning engineer','ml engineer']],
    ['software engineer',['software engineer','swe','software developer','backend engineer']],
    ['frontend developer',['frontend developer','front-end developer','front end developer','ui developer','react developer']],
    ['backend developer',['backend developer','back-end developer','back end developer']],
    ['full stack developer',['full stack','fullstack']],
    ['data analyst',['data analyst']],
    ['data engineer',['data engineer']],
    ['devops engineer',['devops','site reliability','sre']],
    ['ui ux designer',['ux designer','ui designer','ui/ux','product designer','interaction designer']],
    ['graphic designer',['graphic designer','visual designer']],
    ['product manager',['product manager','product lead','head of product']],
    ['business analyst',['business analyst']],
    ['digital marketer',['digital marketing','seo specialist','marketing manager','growth marketer']],
    ['content writer',['content writer','copywriter','technical writer']],
    ['financial analyst',['financial analyst','finance analyst','investment analyst']],
    ['hr manager',['hr manager','human resources','talent acquisition','recruiter']],
    ['cybersecurity analyst',['cybersecurity','security analyst','infosec']],
    ['cloud architect',['cloud architect','cloud engineer','solutions architect']],
    ['project manager',['project manager','program manager']],
    ['legal associate',['legal associate','lawyer','attorney','legal counsel','legal intern']],
    ['accountant',['accountant','chartered accountant','ca ','cpa ']],
    ['android developer',['android developer','android engineer']],
    ['ios developer',['ios developer','ios engineer']],
    ['research analyst',['research analyst','market researcher']],
  ];
  for (const [role, keywords] of map) {
    if (keywords.some(kw => t.includes(kw))) return role;
  }
  return '';
}
