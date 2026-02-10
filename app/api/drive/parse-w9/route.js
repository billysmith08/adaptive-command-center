import { NextResponse } from 'next/server';
import { ensureVendorFolder, uploadFile } from '@/lib/google-drive';

// Extract text from PDF buffer using pdf-parse
async function extractPdfText(buffer) {
  try {
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    console.error('PDF parse error:', e);
    return '';
  }
}

// Parse W9 fields from extracted text
function parseW9(text) {
  const result = {
    name: '',
    company: '',
    taxClass: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    ein: '',
    ssn: false, // true if SSN detected (we won't store it)
  };

  // Normalize text
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Strategy: Find field labels and grab the content that follows
  // W9 text typically flows: label line, then content line(s)
  
  // --- NAME (Line 1) ---
  // Look for the line after "1 Name" or "Name (as shown on"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^1\s+Name\s*\(|Name.*income\s*tax\s*return/i)) {
      // The name is usually on the next non-label line
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim();
        if (candidate && 
            !candidate.match(/^[0-9]\s|^Name\s|required|do not leave|Print or type|See Specific/i) &&
            candidate.length > 1 && candidate.length < 80) {
          result.name = candidate;
          break;
        }
      }
      break;
    }
  }
  
  // --- BUSINESS NAME (Line 2) ---
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^2\s+Business\s*name|Business.*disregarded\s*entity/i)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim();
        if (candidate && 
            !candidate.match(/^[0-9]\s|^Check\s|^Business|if different|appropriate box/i) &&
            candidate.length > 1 && candidate.length < 100) {
          result.company = candidate;
          break;
        }
      }
      break;
    }
  }
  
  // --- TAX CLASSIFICATION (Line 3) ---
  // Look for checked boxes: ☑ or ✓ or [X] near classification terms
  const taxText = text.toLowerCase();
  if (taxText.includes('☑') || taxText.includes('✓') || taxText.includes('✔')) {
    // Try to find what's checked
    const checkPattern = /[☑✓✔]\s*(individual|sole proprietor|c\s*corporation|s\s*corporation|partnership|trust|estate|llc|limited liability)/i;
    const match = text.match(checkPattern);
    if (match) result.taxClass = match[1].trim();
  }
  // Fallback: look for common patterns in the text ordering
  if (!result.taxClass) {
    // If "Individual/sole proprietor" appears before other options and near a check indicator
    if (taxText.match(/individual.*sole.*proprietor/)) result.taxClass = 'Individual/Sole Proprietor';
  }
  
  // --- ADDRESS (Line 5) ---
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^5\s+Address|Address.*number.*street/i)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim();
        if (candidate && 
            !candidate.match(/^[0-9]\s+[A-Z]|^See\s|^Requester|^Address/i) &&
            candidate.match(/\d/) && // addresses have numbers
            candidate.length > 3 && candidate.length < 100) {
          result.address = candidate;
          break;
        }
      }
      break;
    }
  }
  
  // --- CITY, STATE, ZIP (Line 6) ---
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^6\s+City|City.*state.*ZIP/i)) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim();
        if (candidate && 
            !candidate.match(/^[0-9]\s+[A-Z]|^Requester|^City|^List account/i) &&
            candidate.length > 3 && candidate.length < 100) {
          // Parse city, state, zip
          const cszMatch = candidate.match(/^(.+?)\s*,?\s+([A-Z]{2})\s+(\d{5}(-\d{4})?)\s*$/i) ||
                           candidate.match(/^(.+?)\s+([A-Za-z]+)\s+(\d{5}(-\d{4})?)\s*$/);
          if (cszMatch) {
            result.city = cszMatch[1].replace(/,\s*$/, '').trim();
            result.state = cszMatch[2].trim();
            result.zip = cszMatch[3].trim();
          } else {
            // Just store the whole line
            result.city = candidate;
          }
          break;
        }
      }
      break;
    }
  }
  
  // --- EIN ---
  // Look for pattern XX-XXXXXXX (2 digits, dash, 7 digits) near "Employer identification"
  const einMatch = text.match(/(\d{2})\s*[-–]\s*(\d{7})/);
  if (einMatch) {
    result.ein = `${einMatch[1]}-${einMatch[2]}`;
  } else {
    // Sometimes digits are space-separated in PDF: "8 3 - 3 5 0 5 0 2 3" or "8 3 3 5 0 5 0 2 3"
    const einSection = text.match(/Employer\s*identification\s*number[\s\S]{0,200}/i);
    if (einSection) {
      // Look for 9 digits possibly separated by spaces
      const digitMatch = einSection[0].match(/(\d)\s*(\d)\s*[-–]?\s*(\d)\s*(\d)\s*(\d)\s*(\d)\s*(\d)\s*(\d)\s*(\d)/);
      if (digitMatch) {
        result.ein = `${digitMatch[1]}${digitMatch[2]}-${digitMatch[3]}${digitMatch[4]}${digitMatch[5]}${digitMatch[6]}${digitMatch[7]}${digitMatch[8]}${digitMatch[9]}`;
      }
    }
  }
  
  // --- SSN detection (just flag it, never store) ---
  const ssnSection = text.match(/Social\s*security\s*number[\s\S]{0,200}/i);
  if (ssnSection) {
    const ssnDigits = ssnSection[0].match(/(\d)\s*(\d)\s*(\d)\s*[-–]\s*(\d)\s*(\d)\s*[-–]\s*(\d)\s*(\d)\s*(\d)\s*(\d)/);
    if (ssnDigits) result.ssn = true;
  }
  
  // If we didn't get a company name, use the personal name
  if (!result.company && result.name) {
    result.company = result.name;
  }
  
  // If we didn't get a name, try to extract from filename pattern
  if (!result.name && !result.company) {
    // Last resort: look for any capitalized multi-word line that looks like a name
    for (const line of lines.slice(0, 30)) {
      if (line.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+/) && 
          !line.match(/Form|Request|Department|Internal|Treasury|Revenue|Certification|General|Instructions/)) {
        result.name = line;
        if (!result.company) result.company = line;
        break;
      }
    }
  }
  
  return result;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const w9BasePath = formData.get('basePath') || 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    
    // Step 1: Extract text from PDF
    let parsed = {};
    let rawText = '';
    
    if (file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      rawText = await extractPdfText(buffer);
      parsed = parseW9(rawText);
    } else {
      // For images, we can't parse — just use filename
      const cleanName = fileName.replace(/[._-]/g, ' ').replace(/w9|pdf|W9|PDF|jpg|png|jpeg/gi, '').trim();
      parsed = { name: cleanName, company: cleanName };
    }
    
    // Step 2: Upload to Google Drive if we have a company name
    let uploadResult = null;
    const vendorName = parsed.company || parsed.name || fileName.replace(/[._-]/g, ' ').replace(/w9|pdf/gi, '').trim();
    
    if (vendorName) {
      try {
        const { folderId, created } = await ensureVendorFolder(w9BasePath, vendorName);
        const uploaded = await uploadFile(folderId, fileName, buffer, file.type || 'application/pdf');
        uploadResult = {
          success: true,
          file: { name: uploaded.name, id: uploaded.id, link: uploaded.webViewLink },
          folder: { id: folderId, created, path: `${w9BasePath}/${vendorName}` },
        };
      } catch (uploadErr) {
        console.error('Drive upload error:', uploadErr);
        uploadResult = { success: false, error: uploadErr.message };
      }
    }
    
    return NextResponse.json({
      success: true,
      parsed,
      upload: uploadResult,
      rawTextPreview: rawText.substring(0, 500),
    });
  } catch (error) {
    console.error('W9 parse error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
