import jsPDF from 'jspdf';

import { renderCredentialImage, type CredentialRenderInput } from '@/lib/credential-render';

export interface PrintableCredential extends CredentialRenderInput {
  fileSafeName: string;
}

interface GenerateTeamCredentialPdfOptions {
  credentials: PrintableCredential[];
  teamName: string;
}

const CARD_WIDTH_MM = 90;
const CARD_HEIGHT_MM = 56.29;
const MARGIN_X_MM = 12;
const MARGIN_Y_MM = 12;
const GAP_X_MM = 11.9;
const GAP_Y_MM = 9;
const CARDS_PER_PAGE = 8;

export async function generateTeamCredentialPdf({
  credentials,
  teamName,
}: GenerateTeamCredentialPdfOptions) {
  if (credentials.length === 0) {
    throw new Error('No hay credenciales vigentes para generar el PDF.');
  }

  const doc = new jsPDF({
    format: 'letter',
    orientation: 'portrait',
    unit: 'mm',
  });

  for (let index = 0; index < credentials.length; index += 1) {
    if (index > 0 && index % CARDS_PER_PAGE === 0) {
      doc.addPage('letter', 'portrait');
    }

    const pageIndex = index % CARDS_PER_PAGE;
    const col = pageIndex % 2;
    const row = Math.floor(pageIndex / 2);
    const x = MARGIN_X_MM + col * (CARD_WIDTH_MM + GAP_X_MM);
    const y = MARGIN_Y_MM + row * (CARD_HEIGHT_MM + GAP_Y_MM);
    const imageUrl = await renderCredentialImage(credentials[index]);

    doc.addImage(imageUrl, 'PNG', x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM, undefined, 'FAST');
    drawCutGuides(doc, x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
  }

  doc.save(`credenciales_${slugify(teamName)}.pdf`);
}

function drawCutGuides(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const guide = 3;
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.1);

  doc.line(x, y - guide, x, y);
  doc.line(x - guide, y, x, y);
  doc.line(x + width, y - guide, x + width, y);
  doc.line(x + width, y, x + width + guide, y);
  doc.line(x, y + height, x - guide, y + height);
  doc.line(x, y + height, x, y + height + guide);
  doc.line(x + width, y + height, x + width + guide, y + height);
  doc.line(x + width, y + height, x + width, y + height + guide);
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
