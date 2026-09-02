import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import type { Quotation } from '../../types';
import { logger } from '../../utils/logger';

const OUTPUT_DIR = path.resolve(process.cwd(), 'uploads', 'pdfs');

// ── Colour palette ────────────────────────────────────────────────────────────
const NAVY   = '#1A2E5A';
const TEAL   = '#0D7377';
const GOLD   = '#C8972B';
const DARK   = '#1C1C1C';
const MID    = '#444444';
const LIGHT  = '#777777';
const BORDER = '#D0D6E0';
const BG     = '#F5F7FA';
const WHITE  = '#FFFFFF';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Shared layout helpers ─────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, companyName: string, tagline: string, regNumber: string, irdaiReg: string) {
  // Navy banner
  doc.rect(0, 0, doc.page.width, 90).fill(NAVY);

  // Company name
  doc.font('Helvetica-Bold').fontSize(22).fillColor(WHITE).text(companyName, 40, 20);

  // Tagline
  doc.font('Helvetica').fontSize(9).fillColor('#A8C4E0').text(tagline, 40, 48);

  // Right side — reg info
  doc.font('Helvetica').fontSize(8).fillColor('#A8C4E0')
    .text(`CIN: ${regNumber}`, 0, 28, { align: 'right', width: doc.page.width - 40 })
    .text(`IRDAI Reg No.: ${irdaiReg}`, 0, 42, { align: 'right', width: doc.page.width - 40 });

  // Gold accent line
  doc.rect(0, 90, doc.page.width, 4).fill(GOLD);

  doc.y = 110;
}

function drawDocumentTitle(doc: PDFKit.PDFDocument, title: string, quoteRef: string) {
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(NAVY).text(title, 40);
  doc.font('Helvetica').fontSize(9).fillColor(LIGHT)
    .text(`Quote Reference: ${quoteRef}   |   Date: ${today()}   |   Valid Until: ${validThru()}`, 40);
  doc.moveDown(0.5);
  doc.rect(40, doc.y, doc.page.width - 80, 1).fill(BORDER);
  doc.moveDown(0.6);
}

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.rect(40, doc.y, doc.page.width - 80, 22).fill(NAVY);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(WHITE)
    .text(title, 48, doc.y - 16);
  doc.moveDown(0.5);
}

function drawRow(doc: PDFKit.PDFDocument, label: string, value: string, shade: boolean) {
  const rowH = 20;
  const y = doc.y;
  if (shade) doc.rect(40, y, doc.page.width - 80, rowH).fill(BG);
  doc.font('Helvetica').fontSize(9.5).fillColor(MID).text(label, 50, y + 5, { width: 220 });
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(DARK).text(value, 270, y + 5, { width: 260 });
  doc.y = y + rowH;
}

function drawHighlightBox(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.moveDown(0.4);
  doc.rect(40, doc.y, doc.page.width - 80, 40).fill(TEAL);
  doc.font('Helvetica').fontSize(9).fillColor(WHITE).text(label, 50, doc.y - 32);
  doc.font('Helvetica-Bold').fontSize(16).fillColor(WHITE).text(value, 50, doc.y - 20);
  doc.moveDown(0.4);
}

function drawBullets(doc: PDFKit.PDFDocument, items: string[]) {
  doc.moveDown(0.3);
  for (const item of items) {
    const y = doc.y;
    doc.rect(50, y + 5, 5, 5).fill(GOLD);
    doc.font('Helvetica').fontSize(9.5).fillColor(MID).text(item, 62, y, { width: doc.page.width - 110 });
    doc.moveDown(0.2);
  }
}

function drawFooter(doc: PDFKit.PDFDocument, address: string, phone: string, email: string, website: string) {
  const pageH = doc.page.height;
  doc.rect(0, pageH - 55, doc.page.width, 55).fill(NAVY);
  doc.font('Helvetica').fontSize(8).fillColor('#A8C4E0')
    .text(address, 40, pageH - 46, { width: doc.page.width - 80, align: 'center' })
    .text(`${phone}  |  ${email}  |  ${website}`, 40, pageH - 30, { width: doc.page.width - 80, align: 'center' });
  doc.font('Helvetica').fontSize(7).fillColor('#6A88AA')
    .text('This is a computer-generated quotation. Subject to underwriting approval. Terms & conditions apply.', 40, pageH - 16, { width: doc.page.width - 80, align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// CAR INSURANCE PDF
// ─────────────────────────────────────────────────────────────────────────────

function buildCarPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  const isPAA = q.provider === 'provider_a';
  const company = isPAA ? 'Acme General Insurance Co. Ltd.' : 'Beta General Assurance Ltd.';
  const tagline = isPAA ? 'Trusted Protection for Every Journey' : 'Drive with Confidence, Insure with Assurance';
  const cin = isPAA ? 'U66010MH2000PLC123456' : 'U66010DL2005PLC654321';
  const irdai = isPAA ? '134' : '152';

  drawHeader(doc, company, tagline, cin, irdai);
  drawDocumentTitle(doc, 'Motor Insurance — Quotation', q.id);

  // Policy snapshot
  drawSectionHeading(doc, '  POLICY SNAPSHOT');
  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  drawHighlightBox(doc, 'Total Premium Payable (incl. 18% GST)', fmtCurrency(premium + gst) + ' per year');

  // Vehicle details
  doc.moveDown(0.6);
  drawSectionHeading(doc, '  VEHICLE DETAILS');
  const rows: [string, string][] = [
    ['Make & Model', `${payload['vehicle_make'] ?? 'N/A'} ${payload['vehicle_model'] ?? ''}`],
    ['Variant / Fuel Type', `${payload['vehicle_variant'] ?? '—'} / ${payload['fuel_type'] ?? 'Petrol'}`],
    ['Year of Manufacture', String(payload['registration_year'] ?? 'N/A')],
    ['RTO', String(payload['rto'] ?? 'N/A')],
    ['Policy Type', q.planName.includes('Comprehensive') ? 'Comprehensive (Package)' : 'Third-Party Only'],
    ['NCB Applicable', payload['previous_claim'] === false ? `${payload['ncb_percentage'] ?? 0}%` : 'Not eligible'],
  ];
  rows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  // Premium breakdown
  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PREMIUM BREAKDOWN');
  const odPremium   = Math.round(premium * 0.60);
  const tpPremium   = Math.round(premium * 0.28);
  const paCover     = Math.round(premium * 0.06);
  const addons      = Math.round(premium * 0.06);
  const breakdown: [string, string][] = [
    ['Own Damage (OD) Premium', fmtCurrency(odPremium)],
    ['Third-Party Liability (TP)', fmtCurrency(tpPremium)],
    ['Personal Accident Cover (PA)', fmtCurrency(paCover)],
    ['Add-ons & Riders', fmtCurrency(addons)],
    ['Basic Premium Total', fmtCurrency(premium)],
    ['GST @ 18%', fmtCurrency(gst)],
    ['TOTAL PREMIUM', fmtCurrency(premium + gst)],
  ];
  breakdown.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  // Coverage
  doc.moveDown(0.6);
  drawSectionHeading(doc, '  KEY COVERAGE FEATURES');
  drawBullets(doc, [
    'Loss or damage to the insured vehicle due to accident, fire, theft, or natural calamities',
    'Third-party bodily injury and property damage liability (mandatory)',
    'Compulsory Personal Accident cover of ₹15,00,000 for owner-driver',
    '24×7 roadside assistance across 500+ cities',
    'Cashless claim settlement at 4,000+ network garages',
    'Zero depreciation add-on available (on request)',
    'Engine protect & consumables cover available as riders',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH INSURANCE PDF
// ─────────────────────────────────────────────────────────────────────────────

function buildHealthPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  const isPAA = q.provider === 'provider_a';
  const company = isPAA ? 'Acme Health Insurance Ltd.' : 'Beta Health Assurance Co. Ltd.';
  const tagline = isPAA ? 'Comprehensive Health Protection for Your Family' : 'Your Health is Our Priority';
  const cin = isPAA ? 'U66000MH2008PLC187342' : 'U66000KA2010PLC234567';
  const irdai = isPAA ? '151' : '162';

  drawHeader(doc, company, tagline, cin, irdai);
  drawDocumentTitle(doc, 'Health Insurance — Quotation', q.id);

  const sumInsured = q.sumAssured ?? 300000;
  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  drawHighlightBox(doc, `Sum Insured: ${fmtCurrency(sumInsured)}  |  Total Premium (incl. GST)`, fmtCurrency(premium + gst) + ' / year');

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PLAN DETAILS');
  const rows: [string, string][] = [
    ['Plan Name', q.planName],
    ['Plan Type', String(payload['plan_type'] ?? 'Individual')],
    ['Members Covered', String(payload['members_count'] ?? '1')],
    ['Policy Term', '1 Year'],
    ['Premium Payment Mode', 'Annual'],
    ['Sum Insured', fmtCurrency(sumInsured)],
    ['Pre-existing Disease Waiting', '2 Years'],
    ['Initial Waiting Period', '30 Days (accidents excluded)'],
  ];
  rows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PREMIUM BREAKDOWN');
  const base = Math.round(premium * 0.85);
  const loading = premium - base;
  const premRows: [string, string][] = [
    ['Base Premium', fmtCurrency(base)],
    ['Medical Loading', fmtCurrency(loading)],
    ['Net Premium', fmtCurrency(premium)],
    ['GST @ 18%', fmtCurrency(gst)],
    ['TOTAL PREMIUM PAYABLE', fmtCurrency(premium + gst)],
  ];
  premRows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  COVERAGE HIGHLIGHTS');
  drawBullets(doc, [
    'In-patient hospitalisation: Room rent up to ₹5,000/day (single AC room)',
    'Day-care procedures: All 540+ listed procedures covered',
    'Pre-hospitalisation expenses: 60 days',
    'Post-hospitalisation expenses: 90 days',
    'Ambulance charges: Up to ₹2,000 per hospitalisation',
    'Annual health check-up for all insured members',
    'Cashless at 7,500+ empanelled network hospitals pan-India',
    'No-Claim Bonus: 10% increase in SI for every claim-free year (max 50%)',
    'Restoration benefit: SI restored once per policy year after exhaustion',
    'AYUSH treatment (Ayurveda, Yoga, Unani, Siddha, Homeopathy) covered',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TERM INSURANCE PDF
// ─────────────────────────────────────────────────────────────────────────────

function buildTermPdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  const isPAA = q.provider === 'provider_a';
  const company = isPAA ? 'Acme Life Insurance Co. Ltd.' : 'Beta Life Insurance Ltd.';
  const tagline = isPAA ? 'Securing Your Family\'s Future Today' : 'Life Insurance Simplified';
  const cin = isPAA ? 'U66010MH1985PLC034512' : 'U66010GJ1990PLC045678';
  const irdai = isPAA ? '112' : '128';

  drawHeader(doc, company, tagline, cin, irdai);
  drawDocumentTitle(doc, 'Term Life Insurance — Quotation', q.id);

  const sumAssured = q.sumAssured ?? 5000000;
  const premium = q.premium;
  const gst = Math.round(premium * 0.18);
  const policyTerm = q.policyTerm ?? 20;
  drawHighlightBox(doc, `Life Cover: ${fmtCurrency(sumAssured)}  |  Annual Premium (incl. GST)`, fmtCurrency(premium + gst));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PLAN DETAILS');
  const rows: [string, string][] = [
    ['Plan Name', q.planName],
    ['Policy Type', 'Pure Term — Level Cover'],
    ['Life Assured Age', String(payload['age'] ?? '35') + ' years'],
    ['Gender', String(payload['gender'] ?? 'Male')],
    ['Sum Assured', fmtCurrency(sumAssured)],
    ['Policy Term', `${policyTerm} Years`],
    ['Premium Payment Term', `${policyTerm} Years (Regular Pay)`],
    ['Premium Frequency', 'Annual'],
    ['Death Benefit Payout', 'Lump-sum to nominee'],
    ['Smoker Status', String(payload['smoker'] ?? 'Non-Smoker')],
  ];
  rows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PREMIUM SCHEDULE');
  const premRows: [string, string][] = [
    ['Annual Premium (excl. GST)', fmtCurrency(premium)],
    ['GST @ 18%', fmtCurrency(gst)],
    ['Annual Premium (incl. GST)', fmtCurrency(premium + gst)],
    ['Monthly Equiv. (for reference)', fmtCurrency(Math.round((premium + gst) / 12))],
    ['Total Premiums over Policy Term', fmtCurrency((premium + gst) * policyTerm)],
  ];
  premRows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PLAN FEATURES & RIDERS AVAILABLE');
  drawBullets(doc, [
    `Death Benefit: ${fmtCurrency(sumAssured)} paid to nominee upon life assured\'s death`,
    'Tax benefits under Section 80C (premium) and Section 10(10D) (death benefit)',
    'Accidental Death Benefit Rider: Additional SA payable on accidental death (optional)',
    'Critical Illness Rider: Lump-sum on diagnosis of 34 critical illnesses (optional)',
    'Waiver of Premium Rider: Future premiums waived on disability (optional)',
    'Terminal Illness Benefit: 25% of SA advanced on terminal diagnosis (inbuilt)',
    'Free look period: 30 days from policy receipt',
    'Grace period: 30 days for annual mode premium payment',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFE INSURANCE PDF (Endowment / Whole Life)
// ─────────────────────────────────────────────────────────────────────────────

function buildLifePdf(doc: PDFKit.PDFDocument, q: Quotation, payload: Record<string, unknown>) {
  const company = 'Beta Life Insurance Ltd.';
  const tagline = 'Grow Your Wealth. Protect Your Family.';
  const cin = 'U66010GJ1990PLC045678';
  const irdai = '128';

  drawHeader(doc, company, tagline, cin, irdai);
  drawDocumentTitle(doc, 'Life Insurance — Savings & Protection Quotation', q.id);

  const sumAssured  = q.sumAssured ?? 1000000;
  const premium     = q.premium;
  const gst         = Math.round(premium * 0.04625); // life insurance GST is 4.625% first year, 2.25% thereafter — simplified here
  const policyTerm  = q.policyTerm ?? 15;
  const maturity    = Math.round(sumAssured * (q.planName.includes('Whole') ? 2.8 : 1.65));

  drawHighlightBox(doc, `Guaranteed Maturity Benefit: ${fmtCurrency(maturity)}  |  Annual Premium (incl. GST)`, fmtCurrency(premium + gst));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PLAN DETAILS');
  const rows: [string, string][] = [
    ['Plan Name', q.planName],
    ['Plan Category', q.planName.includes('Whole') ? 'Whole Life Endowment' : 'Traditional Endowment'],
    ['Life Assured Age', String(payload['age'] ?? '32') + ' years'],
    ['Sum Assured', fmtCurrency(sumAssured)],
    ['Policy Term', `${policyTerm} Years`],
    ['Premium Paying Term', `${policyTerm} Years`],
    ['Maturity Age', String((payload['age'] as number ?? 32) + policyTerm) + ' years'],
    ['Premium Mode', 'Annual'],
    ['Bonus Type', 'Simple Reversionary Bonus + Terminal Bonus'],
  ];
  rows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  BENEFIT ILLUSTRATION (GUARANTEED VALUES)');
  const benefitRows: [string, string][] = [
    ['Sum Assured (Death Benefit)', fmtCurrency(sumAssured)],
    ['Accrued Bonus (Projected @ 4%)', fmtCurrency(Math.round(sumAssured * 0.40))],
    ['Accrued Bonus (Projected @ 8%)', fmtCurrency(Math.round(sumAssured * 0.85))],
    ['Guaranteed Maturity Benefit', fmtCurrency(maturity)],
    ['Surrender Value (after 3 yrs)', 'Available — refer policy schedule'],
    ['Loan against Policy', 'Up to 90% of Surrender Value after 3 years'],
  ];
  benefitRows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  PREMIUM SCHEDULE');
  const premRows: [string, string][] = [
    ['Annual Premium (excl. GST)', fmtCurrency(premium)],
    ['GST (4.625% Yr 1 / 2.25% thereafter)', fmtCurrency(gst)],
    ['Annual Premium (incl. GST)', fmtCurrency(premium + gst)],
    ['Total Premium paid over term', fmtCurrency((premium + gst) * policyTerm)],
    ['Return on Investment (indicative)', `${Math.round(((maturity / ((premium + gst) * policyTerm)) - 1) * 100)}% absolute`],
  ];
  premRows.forEach(([l, v], i) => drawRow(doc, l, v, i % 2 === 0));

  doc.moveDown(0.6);
  drawSectionHeading(doc, '  KEY FEATURES');
  drawBullets(doc, [
    'Guaranteed death benefit: Higher of Sum Assured or 10× annualised premium',
    'Maturity benefit: Sum Assured + accrued bonuses payable on survival',
    'Section 80C tax deduction on premiums paid (up to ₹1,50,000)',
    'Section 10(10D) tax-free maturity and death proceeds',
    'Automatic premium loan facility to prevent policy lapse',
    'Paid-up value available if premiums discontinued after 3 full years',
    'Surrender value after 3 years from policy commencement',
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

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

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: {
    Title:   `Insurance Quotation — ${quotation.planName}`,
    Author:  quotation.insurerName,
    Subject: `${quotation.insuranceType.toUpperCase()} Insurance Quote`,
    Creator: 'InsurancePlatform v1.0',
  }});

  switch (quotation.insuranceType) {
    case 'car':    buildCarPdf(doc, quotation, normalizedPayload); break;
    case 'health': buildHealthPdf(doc, quotation, normalizedPayload); break;
    case 'term':   buildTermPdf(doc, quotation, normalizedPayload); break;
    case 'life':   buildLifePdf(doc, quotation, normalizedPayload); break;
    default:       buildHealthPdf(doc, quotation, normalizedPayload);
  }

  // Footer
  const footerMap: Record<string, [string, string, string, string]> = {
    'provider_a': [
      'Acme Tower, BKC, Mumbai 400 051',
      '+91 22 6655 4400',
      'support@acmeinsurance.in',
      'www.acmeinsurance.in',
    ],
    'provider_b': [
      'Beta House, Nariman Point, Mumbai 400 021',
      '+91 22 4321 9000',
      'care@betainsurance.in',
      'www.betainsurance.in',
    ],
  };
  const [addr, ph, em, web] = footerMap[quotation.provider] ?? footerMap['provider_a'];
  drawFooter(doc, addr, ph, em, web);

  const fileName = `quote_${quotation.id}_${quotation.insuranceType}.pdf`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  await writePdf(doc, filePath);
  logger.info('PDF generated', { quotationId: quotation.id, file: fileName });

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
