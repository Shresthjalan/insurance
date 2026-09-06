import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import type { Quotation } from '../../types';
import { logger } from '../../utils/logger';

const OUTPUT_DIR = path.resolve(process.cwd(), 'uploads', 'pdfs');

// ── Colour palette ────────────────────────────────────────────────────────────
const PRIMARY     = '#0F2C59'; // Deep Navy
const ACCENT      = '#0066CC'; // Royal Blue
const SUCCESS     = '#059669'; // Emerald Green
const TEXT_DARK   = '#1F2937'; // Charcoal
const TEXT_MUTED  = '#6B7280'; // Slate Gray
const BORDER_COLOR= '#E5E7EB'; // Light Border
const BG_ALT      = '#F8FAFC'; // Soft Row Alt
const BG_HEADER   = '#0F2C59';
const WHITE       = '#FFFFFF';

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fmtCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function today() { return fmtDate(new Date()); }
function validThru() { return fmtDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); }

function writePdf(doc: PDFKit.PDFDocument, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ── Layout Components ─────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, companyName: string, tagline: string, regNumber: string, irdaiReg: string) {
  // Top Banner
  doc.rect(0, 0, doc.page.width, 70).fill(BG_HEADER);

  // Logo / Company Name
  doc.font('Helvetica-Bold').fontSize(18).fillColor(WHITE).text('FIRST ADVISOR', 36, 18);
  doc.font('Helvetica').fontSize(9).fillColor('#94A3B8').text(companyName, 36, 42);

  // Right-aligned IRDAI Details
  doc.font('Helvetica').fontSize(8).fillColor('#CBD5E1')
    .text(`CIN: ${regNumber}`, 0, 22, { align: 'right', width: doc.page.width - 36 })
    .text(`IRDAI Reg No.: ${irdaiReg}`, 0, 38, { align: 'right', width: doc.page.width - 36 });

  // Accent Line
  doc.rect(0, 70, doc.page.width, 3).fill(ACCENT);
  doc.y = 85;
}

function drawTitleBlock(doc: PDFKit.PDFDocument, title: string, quoteId: string) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(14).fillColor(PRIMARY).text(title, 36, y);
  doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_MUTED)
    .text(`Ref: ${quoteId}   |   Date: ${today()}   |   Valid Until: ${validThru()}`, 36, y + 20);

  doc.y = y + 38;
  doc.rect(36, doc.y, doc.page.width - 72, 1).fill(BORDER_COLOR);
  doc.y += 10;
}

function drawHighlightCard(doc: PDFKit.PDFDocument, label: string, value: string, subtext?: string) {
  const y = doc.y;
  const w = doc.page.width - 72;
  const h = 44;

  doc.roundedRect(36, y, w, h, 6).fill(BG_ALT);
  doc.roundedRect(36, y, w, h, 6).stroke(BORDER_COLOR);

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_MUTED).text(label.toUpperCase(), 48, y + 8);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(SUCCESS).text(value, 48, y + 22);

  if (subtext) {
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_MUTED).text(subtext, doc.page.width - 240, y + 16, { width: 200, align: 'right' });
  }

  doc.y = y + h + 12;
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY).text(title.toUpperCase(), 36, y);
  doc.rect(36, y + 14, doc.page.width - 72, 1).fill(PRIMARY);
  doc.y = y + 20;
}

function drawGridTable(doc: PDFKit.PDFDocument, rows: [string, string][]) {
  const startY = doc.y;
  const col1W = 200;
  const col2W = doc.page.width - 72 - col1W;
  const rowH = 18;

  rows.forEach(([label, val], idx) => {
    const y = doc.y;
    if (idx % 2 === 0) {
      doc.rect(36, y, doc.page.width - 72, rowH).fill(BG_ALT);
    }
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_MUTED).text(label, 44, y + 4, { width: col1W - 10 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(TEXT_DARK).text(val, 36 + col1W, y + 4, { width: col2W - 10 });
    doc.y = y + rowH;
  });

  doc.y = startY + (rows.length * rowH) + 10;
}

function drawBulletList(doc: PDFKit.PDFDocument, items: string[]) {
  const startY = doc.y;
  items.forEach((item) => {
    const y = doc.y;
    doc.circle(42, y + 5, 2).fill(ACCENT);
    doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_DARK).text(item, 50, y, { width: doc.page.width - 90 });
    doc.y = y + 14;
  });
  doc.y = startY + (items.length * 14) + 10;
}

function drawFooter(doc: PDFKit.PDFDocument, address: string, phone: string, email: string) {
  const pageH = doc.page.height;
  const footerY = pageH - 40;

  doc.rect(0, footerY, doc.page.width, 40).fill(BG_HEADER);
  doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
    .text(`${address}  •  Ph: ${phone}  •  Email: ${email}`, 36, footerY + 10, { align: 'center', width: doc.page.width - 72 })
    .text('This is an official computer-generated quotation issued by First Advisor. Subject to terms & underwriting.', 36, footerY + 24, { align: 'center', width: doc.page.width - 72 });
}

// ── Policy Types ──────────────────────────────────────────────────────────────

function buildCarPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  drawHeader(doc, 'Acme General Insurance Ltd.', 'Motor Insurance Quotation', 'U66010MH2000PLC123456', '134');
  drawTitleBlock(doc, `${q.insurerName} — Car Insurance Quote`, q.id);

  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  drawHighlightCard(doc, 'Total Annual Premium (incl. 18% GST)', fmtCurrency(premium + gst), `Base: ${fmtCurrency(premium)} + GST: ${fmtCurrency(gst)}`);

  drawSectionHeader(doc, 'Vehicle & Policy Details');
  drawGridTable(doc, [
    ['Insurer', q.insurerName],
    ['Plan Name', q.planName],
    ['Vehicle Make & Model', `${payload['vehicle_make'] ?? 'Car'} ${payload['vehicle_model'] ?? ''}`.trim()],
    ['Fuel Type / Reg Year', `${payload['fuel_type'] ?? 'Petrol'} / ${payload['registration_year'] ?? 'N/A'}`],
    ['RTO Location', String(payload['rto'] ?? 'N/A')],
    ['Policy Type', q.planName.includes('Comprehensive') ? 'Comprehensive Package' : 'Third-Party Liability'],
    ['No Claim Bonus (NCB)', payload['previous_claim'] === false ? `${payload['ncb_percentage'] ?? 0}%` : '0%'],
  ]);

  drawSectionHeader(doc, 'Coverage & Key Benefits');
  drawBulletList(doc, [
    'Loss or damage to vehicle due to accident, theft, fire, or natural calamity',
    'Third-party bodily injury & property damage cover as per Motor Vehicles Act',
    'Personal Accident cover of ₹15,00,000 for owner-driver',
    'Cashless repair network across 4,000+ authorized workshops',
    '24×7 Emergency Roadside Assistance & Towing Support',
  ]);
}

function buildHealthPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  drawHeader(doc, 'Acme Health Insurance Ltd.', 'Health Insurance Quotation', 'U66000MH2008PLC187342', '151');
  drawTitleBlock(doc, `${q.insurerName} — Health Insurance Quote`, q.id);

  const sumInsured = q.sumAssured ?? 500000;
  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  drawHighlightCard(doc, 'Total Annual Premium (incl. 18% GST)', fmtCurrency(premium + gst), `Sum Insured: ${fmtCurrency(sumInsured)}`);

  drawSectionHeader(doc, 'Plan Summary');
  drawGridTable(doc, [
    ['Insurer', q.insurerName],
    ['Plan Name', q.planName],
    ['Sum Insured', fmtCurrency(sumInsured)],
    ['Policy Tenure', '1 Year (Annual)'],
    ['Members Covered', String(payload['members_count'] ?? '1')],
    ['Pre-existing Disease Waiting', '24 Months'],
    ['Room Rent Limit', 'Single Private AC Room (No Capping)'],
  ]);

  drawSectionHeader(doc, 'Coverage Highlights');
  drawBulletList(doc, [
    'In-patient hospitalisation expenses covered up to Sum Insured',
    'All day-care procedures & modern treatments covered',
    'Pre-hospitalisation (60 days) & Post-hospitalisation (90 days) expenses',
    'Cashless treatment at 7,500+ empanelled network hospitals nationwide',
    'Annual health check-up for all insured members',
    '100% Reload / Restoration of Sum Insured upon exhaustion',
  ]);
}

function buildTermPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  drawHeader(doc, 'Acme Life Insurance Ltd.', 'Term Insurance Quotation', 'U66010MH1985PLC034512', '112');
  drawTitleBlock(doc, `${q.insurerName} — Term Life Quote`, q.id);

  const sumAssured = q.sumAssured ?? 10000000;
  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  const term = q.policyTerm ?? 30;
  drawHighlightCard(doc, 'Annual Premium (incl. 18% GST)', fmtCurrency(premium + gst), `Life Cover: ${fmtCurrency(sumAssured)}`);

  drawSectionHeader(doc, 'Policy Terms');
  drawGridTable(doc, [
    ['Insurer', q.insurerName],
    ['Plan Name', q.planName],
    ['Life Cover (Sum Assured)', fmtCurrency(sumAssured)],
    ['Policy Term', `${term} Years`],
    ['Premium Payment Term', `${term} Years (Regular Pay)`],
    ['Smoker / Tobacco Status', String(payload['smoking_tobacco_status'] ?? 'Non-Smoker')],
  ]);

  drawSectionHeader(doc, 'Key Features');
  drawBulletList(doc, [
    `Guaranteed death benefit of ${fmtCurrency(sumAssured)} paid to nominee`,
    'Tax deductions under Section 80C and tax-free payout under Section 10(10D)',
    'Terminal Illness benefit: Early payout on diagnosis of terminal conditions',
    'Optional Riders available: Accidental Death Benefit & Critical Illness Cover',
  ]);
}

function buildLifePdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  drawHeader(doc, 'Acme Life Insurance Ltd.', 'Savings & Life Protection Quote', 'U66010MH1985PLC034512', '112');
  drawTitleBlock(doc, `${q.insurerName} — Life Insurance Quote`, q.id);

  const sumAssured = q.sumAssured ?? 1000000;
  const premium = q.premium;
  const gst = Math.round(premium * 0.045);
  const term = q.policyTerm ?? 15;
  drawHighlightCard(doc, 'Annual Premium (incl. GST)', fmtCurrency(premium + gst), `Sum Assured: ${fmtCurrency(sumAssured)}`);

  drawSectionHeader(doc, 'Plan Structure');
  drawGridTable(doc, [
    ['Insurer', q.insurerName],
    ['Plan Name', q.planName],
    ['Sum Assured', fmtCurrency(sumAssured)],
    ['Policy Term', `${term} Years`],
    ['Premium Payment Mode', 'Annual'],
  ]);

  drawSectionHeader(doc, 'Benefits');
  drawBulletList(doc, [
    'Guaranteed Death Benefit: Higher of Sum Assured or 10× annual premium',
    'Maturity Benefit: Sum Assured + simple reversionary bonuses on survival',
    'Tax-free proceeds under Section 10(10D) & Section 80C tax savings',
    'Loan facility available against policy after 3 years',
  ]);
}

// ── Public Export ─────────────────────────────────────────────────────────────

export interface GeneratedPdf {
  quotationId: string;
  fileName: string;
  filePath: string;
  insurerName: string;
}

export async function generateQuotationPdf(
  quotation: Quotation,
  normalizedPayload: Record<string, unknown>,
): Promise<GeneratedPdf> {
  ensureDir();

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: `Quotation — ${quotation.planName}`,
      Author: quotation.insurerName,
      Subject: `${quotation.insuranceType.toUpperCase()} Insurance Quote`,
      Creator: 'First Advisor Platform',
    },
  });

  switch (quotation.insuranceType) {
    case 'car':    buildCarPdf(doc, quotation, normalizedPayload); break;
    case 'health': buildHealthPdf(doc, quotation, normalizedPayload); break;
    case 'term':   buildTermPdf(doc, quotation, normalizedPayload); break;
    case 'life':   buildLifePdf(doc, quotation, normalizedPayload); break;
    default:       buildHealthPdf(doc, quotation, normalizedPayload);
  }

  drawFooter(doc, 'First Advisor Towers, BKC, Mumbai 400 051', '+91 22 6655 4400', 'support@firstadvisor.in');

  const fileName = `quote_${quotation.id}_${quotation.insuranceType}.pdf`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await writePdf(doc, filePath);
  logger.info('Clean PDF generated', { quotationId: quotation.id, file: fileName });

  return { quotationId: quotation.id, fileName, filePath, insurerName: quotation.insurerName };
}

export async function generateAllQuotationPdfs(
  quotations: Quotation[],
  normalizedPayload: Record<string, unknown>,
): Promise<GeneratedPdf[]> {
  const results: GeneratedPdf[] = [];
  for (const q of quotations) {
    try {
      const pdf = await generateQuotationPdf(q, normalizedPayload);
      results.push(pdf);
    } catch (err) {
      logger.error('PDF generation failed for quotation', { quotationId: q.id, error: String(err) });
    }
  }
  return results;
}
