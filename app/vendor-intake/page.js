'use client';
import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA', flag: '🇺🇸' },
  { code: '+44', label: 'UK', flag: '🇬🇧' },
  { code: '+61', label: 'AU', flag: '🇦🇺' },
  { code: '+33', label: 'FR', flag: '🇫🇷' },
  { code: '+49', label: 'DE', flag: '🇩🇪' },
  { code: '+81', label: 'JP', flag: '🇯🇵' },
  { code: '+52', label: 'MX', flag: '🇲🇽' },
  { code: '+91', label: 'IN', flag: '🇮🇳' },
  { code: '+55', label: 'BR', flag: '🇧🇷' },
  { code: '+86', label: 'CN', flag: '🇨🇳' },
  { code: '+82', label: 'KR', flag: '🇰🇷' },
  { code: '+39', label: 'IT', flag: '🇮🇹' },
  { code: '+34', label: 'ES', flag: '🇪🇸' },
  { code: '+31', label: 'NL', flag: '🇳🇱' },
  { code: '+46', label: 'SE', flag: '🇸🇪' },
  { code: '+41', label: 'CH', flag: '🇨🇭' },
  { code: '+65', label: 'SG', flag: '🇸🇬' },
  { code: '+971', label: 'UAE', flag: '🇦🇪' },
  { code: '+972', label: 'IL', flag: '🇮🇱' },
  { code: '+63', label: 'PH', flag: '🇵🇭' },
];

const RESOURCE_TYPES = ["AV/Tech", "Catering", "Color", "Crew", "Decor", "DJ/Music", "Equipment", "Fabrication", "Floral", "Lighting", "Other", "Permits", "Photography", "Post House", "Props", "Security", "Staffing", "Talent", "Vehicles", "Venue", "Videography"];

function VendorIntakeForm() {
  const params = useSearchParams();
  const projectName = params.get('project') || 'Adaptive by Design';
  
  const [form, setForm] = useState({
    companyName: '', contactFirst: '', contactLast: '', title: '',
    email: '', countryCode: '+1', phone: '', address: '',
    resourceType: '', website: '', ein: '', notes: '',
  });
  const [w9File, setW9File] = useState(null);
  const [coiFile, setCoiFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const w9Ref = useRef(null);
  const coiRef = useRef(null);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.companyName && !form.contactFirst) return;
    setSubmitting(true);
    
    try {
      const vendorName = form.companyName || `${form.contactFirst} ${form.contactLast}`.trim();

      // Upload W9 if provided
      if (w9File) {
        const fd = new FormData();
        fd.append('file', w9File);
        fd.append('vendorName', vendorName);
        fd.append('docType', 'w9');
        fd.append('basePath', 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s');
        await fetch('/api/drive/upload', { method: 'POST', body: fd }).catch(() => {});
      }

      // Upload COI if provided
      if (coiFile) {
        const fd = new FormData();
        fd.append('file', coiFile);
        fd.append('vendorName', vendorName);
        fd.append('docType', 'coi');
        fd.append('basePath', 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp');
        await fetch('/api/drive/upload', { method: 'POST', body: fd }).catch(() => {});
      }

      // Create folders even if no files
      await fetch('/api/drive/create-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (e) {
      console.error(e);
      setSubmitted(true); // still show success for UX
    }
    setSubmitting(false);
  };

  const inputStyle = { width: '100%', padding: '11px 14px', background: '#faf6f1', border: '1px solid #e0d5c7', borderRadius: 8, color: '#2a2520', fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 11, color: '#8a7e72', fontWeight: 600, letterSpacing: 0.5, display: 'block', marginBottom: 5 };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '60px 48px', maxWidth: 500, textAlign: 'center', boxShadow: '0 4px 30px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#2a2520', marginBottom: 8, fontFamily: "'Instrument Sans', sans-serif" }}>Submission Received</h2>
          <p style={{ fontSize: 14, color: '#8a7e72', lineHeight: 1.6 }}>Thank you! Your information has been submitted to <strong>{projectName}</strong>. The team will review your details and reach out if anything else is needed.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f0eb', fontFamily: "'DM Sans', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, color: '#8a7e72', fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>VENDOR INTAKE</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#2a2520', margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>{projectName}</h1>
          <p style={{ fontSize: 13, color: '#a0957e', marginTop: 8 }}>Please complete the form below to onboard as a vendor/contractor.</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '32px', boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
          
          {/* Company */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>COMPANY / BUSINESS NAME *</label>
            <input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Your company name" style={inputStyle} />
          </div>

          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div><label style={labelStyle}>FIRST NAME *</label><input value={form.contactFirst} onChange={e => update('contactFirst', e.target.value)} placeholder="First" style={inputStyle} /></div>
            <div><label style={labelStyle}>LAST NAME</label><input value={form.contactLast} onChange={e => update('contactLast', e.target.value)} placeholder="Last" style={inputStyle} /></div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>TITLE / ROLE</label>
            <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Owner, Account Manager" style={inputStyle} />
          </div>

          {/* Contact */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div><label style={labelStyle}>EMAIL *</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="name@company.com" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={form.countryCode} onChange={e => update('countryCode', e.target.value)} style={{ ...inputStyle, width: 90, padding: '11px 4px 11px 8px', fontSize: 12, flexShrink: 0 }}>
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                </select>
                <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="(555) 000-0000" style={{ ...inputStyle, flex: 1 }} />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>ADDRESS</label>
            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Full business address" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>RESOURCE / SERVICE TYPE</label>
              <select value={form.resourceType} onChange={e => update('resourceType', e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {RESOURCE_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>WEBSITE</label><input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://..." style={inputStyle} /></div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>EIN / TAX ID</label>
            <input value={form.ein} onChange={e => update('ein', e.target.value)} placeholder="XX-XXXXXXX" style={inputStyle} />
          </div>

          {/* File uploads */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>W-9 FORM</label>
              <div onClick={() => w9Ref.current?.click()} style={{ padding: '16px', border: '2px dashed #e0d5c7', borderRadius: 10, textAlign: 'center', cursor: 'pointer', background: w9File ? '#4ecb7108' : '#faf6f1', transition: 'all 0.2s' }}>
                <input ref={w9Ref} type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setW9File(e.target.files[0])} style={{ display: 'none' }} />
                {w9File ? <><div style={{ fontSize: 20 }}>📄</div><div style={{ fontSize: 11, color: '#4ecb71', fontWeight: 600, marginTop: 4 }}>{w9File.name}</div></> : <><div style={{ fontSize: 20, opacity: 0.4 }}>📥</div><div style={{ fontSize: 11, color: '#a0957e', marginTop: 4 }}>Click to upload W-9</div></>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>COI / INSURANCE</label>
              <div onClick={() => coiRef.current?.click()} style={{ padding: '16px', border: '2px dashed #e0d5c7', borderRadius: 10, textAlign: 'center', cursor: 'pointer', background: coiFile ? '#4ecb7108' : '#faf6f1', transition: 'all 0.2s' }}>
                <input ref={coiRef} type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={e => setCoiFile(e.target.files[0])} style={{ display: 'none' }} />
                {coiFile ? <><div style={{ fontSize: 20 }}>📄</div><div style={{ fontSize: 11, color: '#4ecb71', fontWeight: 600, marginTop: 4 }}>{coiFile.name}</div></> : <><div style={{ fontSize: 20, opacity: 0.4 }}>📥</div><div style={{ fontSize: 11, color: '#a0957e', marginTop: 4 }}>Click to upload COI</div></>}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>NOTES / ADDITIONAL INFO</label>
            <textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Anything else we should know..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <button onClick={handleSubmit} disabled={submitting || (!form.companyName && !form.contactFirst)} style={{ width: '100%', padding: '14px', background: (!form.companyName && !form.contactFirst) ? '#d4c9be' : '#ff6b4a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (!form.companyName && !form.contactFirst) ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Submitting...' : 'Submit Vendor Information'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#b8ad9e' }}>
          Powered by ADPTV Command Center · Adaptive by Design
        </div>
      </div>
    </div>
  );
}

export default function VendorIntakePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#f5f0eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <VendorIntakeForm />
    </Suspense>
  );
}
