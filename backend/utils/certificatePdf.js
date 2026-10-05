import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// pdfkit is CommonJS; loaded via createRequire in this ESM codebase.
const PDFDocument = require('pdfkit');

/**
 * Generate an official halal certificate PDF from VERIFIED server-side
 * certification data. Never accepts client-supplied values: callers must
 * load the Certification + Merchant from the database first and check
 * eligibility (status 'approved', certificate number assigned).
 *
 * The document contains only public certificate facts (number, issuer,
 * type/scope, dates, validity, verification link). Identity documents and
 * internal reviewer notes are never embedded.
 *
 * @param {{ certificate: object, businessName: string, verificationUrl: string }} data
 * @returns {Promise<Buffer>}
 */
export const generateCertificatePdf = ({ certificate, businessName, verificationUrl }) =>
    new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 56, info: {
                Title: `Halal Certificate ${certificate.certificateNumber}`,
                Author: certificate.issuingAuthority,
            } });

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'long', year: 'numeric',
            }) : '—');
            const prettyType = String(certificate.certificateType || '').replace(/_/g, ' ');

            // ── Border + header ─────────────────────────────
            doc.rect(28, 28, doc.page.width - 56, doc.page.height - 56).stroke('#0D7C3D');
            doc.fillColor('#0D7C3D').fontSize(11).font('Helvetica-Bold')
                .text(certificate.issuingAuthority || 'Mejilis Council', { align: 'center' });
            doc.moveDown(0.4);
            doc.fillColor('#111111').fontSize(26).font('Helvetica-Bold')
                .text('HALAL CERTIFICATE', { align: 'center' });
            doc.moveDown(0.2);
            doc.fillColor('#555555').fontSize(10).font('Helvetica')
                .text('Official certification of halal compliance', { align: 'center' });
            doc.moveDown(1);

            // ── Core facts ──────────────────────────────────
            const row = (label, value, opts = {}) => {
                doc.fillColor('#555555').fontSize(10).font('Helvetica').text(label);
                doc.fillColor('#111111').fontSize(13).font('Helvetica-Bold')
                    .text(value, { ...opts });
                doc.moveDown(0.6);
            };

            row('Certified business', businessName || '—');
            row('Certificate number (verification ID)', certificate.certificateNumber || '—');
            row('Certificate type', prettyType || '—');
            if (certificate.scope) row('Scope', certificate.scope);
            if (certificate.coveredProducts?.length) {
                row('Covered products', certificate.coveredProducts.join(', '));
            }
            row('Issued on', fmtDate(certificate.issueDate));
            row('Valid until', fmtDate(certificate.expiryDate));
            row('Current validity', 'VALID — verified from official records');

            doc.moveDown(0.6);

            // ── Verification ────────────────────────────────
            doc.fillColor('#0D7C3D').fontSize(11).font('Helvetica-Bold')
                .text('Independent verification');
            doc.fillColor('#111111').fontSize(10).font('Helvetica')
                .text('Anyone can confirm this certificate is genuine at:');
            doc.fillColor('#0D7C3D').font('Helvetica-Bold').text(verificationUrl, {
                link: verificationUrl,
            });

            doc.moveDown(1.5);
            doc.fillColor('#777777').fontSize(9).font('Helvetica').text(
                'This certificate was issued automatically with the Majlis approval of this business registration. ' +
                'Generated from official Mejilis Council records.',
                { align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });

export default generateCertificatePdf;
