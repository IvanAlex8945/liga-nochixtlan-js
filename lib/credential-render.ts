import QRCode from 'qrcode';

import { formatPlayerNumber, type PlayerNumberValue } from '@/lib/player-number';

export interface CredentialRenderInput {
  category: string;
  credentialCode: string;
  curp?: string | null;
  issuedAt: string;
  number: PlayerNumberValue;
  photoUrl: string | null;
  playerName: string;
  seasonName: string;
  statusLabel: string;
  teamName: string;
  verifyUrl: string;
}

const CARD_WIDTH = 1586;
const CARD_HEIGHT = 992;
const TEMPLATE_BY_CATEGORY = {
  femenil: '/credentials/credencial_base_femenil.png',
  libre: '/credentials/base_credencial_bueno.png',
  master: '/credentials/credencial_base_master.png',
  tercera: '/credentials/credencial_base_tercera.png',
  veteranos: '/credentials/credencial_base_veteranos.png',
} as const;
const templateImagePromises = new Map<string, Promise<HTMLImageElement>>();

interface CredentialLayout {
  categoryCenterY: number;
  curpCenterX: number | null;
  curpY: number | null;
  fieldLeftX: number;
  fieldRightX: number;
  footerPeriodX: number;
  footerPeriodY: number;
  lowerFieldsY: number;
  nameBoxHeight: number;
  nameBoxY: number;
  photoX: number;
  photoY: number;
  qrBoxX: number;
  qrBoxY: number;
  seasonFieldsCentered: boolean;
  showFooterPeriod: boolean;
  statusValidColor: string;
  teamCenterY: number;
  upperFieldsY: number;
}

const COLORS = {
  accent: '#F5A623',
  accentLight: '#FFE08A',
  cyan: '#45F4D2',
  danger: '#FF5A5F',
  dark: '#020B12',
  white: '#FFFFFF',
};

export async function renderCredentialImage(input: CredentialRenderInput) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No se pudo preparar la credencial digital.');
  }

  const layout = getCredentialLayout(input.category);
  const template = await loadCredentialTemplate(input.category);
  context.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  await drawPlayerPhoto(context, input, layout);
  drawStatusBadge(context, input.statusLabel, layout);
  drawPlayerName(context, input.playerName, layout);
  drawCenteredGoldText(context, input.teamName, {
    centerX: 796,
    centerY: layout.teamCenterY,
    fontSize: 56,
    maxWidth: 650,
  });
  drawCenteredGoldText(context, input.category || 'Libre', {
    centerX: 798,
    centerY: layout.categoryCenterY,
    fontSize: 56,
    maxWidth: 520,
  });
  drawDorsal(context, input);
  drawSeasonFields(context, input, layout);
  drawVeteransCurp(context, input, layout);
  await drawQr(context, input.verifyUrl, layout);
  drawOfficialDocument(context, input.credentialCode);
  if (layout.showFooterPeriod) {
    drawFooterSeason(context, input.seasonName, layout);
  }

  return canvas.toDataURL('image/png');
}

async function drawPlayerPhoto(
  context: CanvasRenderingContext2D,
  input: CredentialRenderInput,
  layout: CredentialLayout
) {
  const photoBox = {
    x: layout.photoX,
    y: layout.photoY,
    width: 318,
    height: 363,
    radius: 8,
  };

  context.save();
  roundRect(context, photoBox.x, photoBox.y, photoBox.width, photoBox.height, photoBox.radius);
  context.clip();

  if (input.photoUrl) {
    try {
      const image = await loadImage(input.photoUrl);
      drawCoverImage(context, image, photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    } catch {
      drawFallbackPortrait(context, input.playerName, photoBox.x, photoBox.y, photoBox.width, photoBox.height);
    }
  } else {
    drawFallbackPortrait(context, input.playerName, photoBox.x, photoBox.y, photoBox.width, photoBox.height);
  }

  const overlay = context.createLinearGradient(0, photoBox.y + photoBox.height, 0, photoBox.y + photoBox.height * 0.55);
  overlay.addColorStop(0, 'rgba(0,0,0,0.18)');
  overlay.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = overlay;
  context.fillRect(photoBox.x, photoBox.y, photoBox.width, photoBox.height);
  context.restore();
}

function drawStatusBadge(
  context: CanvasRenderingContext2D,
  statusLabel: string,
  layout: CredentialLayout
) {
  const isValid = statusLabel.toLowerCase().includes('vigente');
  const color = isValid ? layout.statusValidColor : COLORS.danger;
  const label = statusLabel.toUpperCase();
  const shieldCenterX = 1305;
  const shieldCenterY = 72;
  const labelCenterY = 76;
  const shieldHalfWidth = 17;
  const shieldHalfHeight = 24;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.shadowColor = color;
  context.shadowBlur = 10;
  context.beginPath();
  context.moveTo(shieldCenterX, shieldCenterY - shieldHalfHeight);
  context.lineTo(shieldCenterX - shieldHalfWidth, shieldCenterY - shieldHalfHeight + 9);
  context.lineTo(shieldCenterX - shieldHalfWidth, shieldCenterY + 2);
  context.quadraticCurveTo(
    shieldCenterX - shieldHalfWidth,
    shieldCenterY + shieldHalfHeight - 6,
    shieldCenterX,
    shieldCenterY + shieldHalfHeight
  );
  context.quadraticCurveTo(
    shieldCenterX + shieldHalfWidth,
    shieldCenterY + shieldHalfHeight - 6,
    shieldCenterX + shieldHalfWidth,
    shieldCenterY + 2
  );
  context.lineTo(shieldCenterX + shieldHalfWidth, shieldCenterY - shieldHalfHeight + 9);
  context.closePath();
  context.stroke();

  context.beginPath();
  context.moveTo(shieldCenterX - 8, shieldCenterY + 1);
  context.lineTo(shieldCenterX - 2, shieldCenterY + 9);
  context.lineTo(shieldCenterX + 10, shieldCenterY - 8);
  context.stroke();

  context.fillStyle = color;
  context.font = '800 31px "Arial Narrow", Impact, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(truncateText(context, label, 170), 1422, labelCenterY);
  context.restore();
}

function drawPlayerName(
  context: CanvasRenderingContext2D,
  playerName: string,
  layout: CredentialLayout
) {
  const name = playerName.trim().toUpperCase();
  const box = {
    x: 456,
    y: layout.nameBoxY,
    width: 690,
    height: layout.nameBoxHeight,
  };
  const lines = fitPlayerName(context, name, box.width, box.height);
  const lineHeight = lines.fontSize * 1.02;
  const firstY = box.y + box.height / 2 - ((lines.text.length - 1) * lineHeight) / 2;

  context.save();
  context.fillStyle = COLORS.white;
  context.shadowColor = 'rgba(255,255,255,0.38)';
  context.shadowBlur = 4;
  context.font = `900 ${lines.fontSize}px "Arial Narrow", Impact, system-ui, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  lines.text.forEach((line, index) => {
    context.fillText(line, box.x, firstY + index * lineHeight);
  });
  context.restore();
}

function drawDorsal(context: CanvasRenderingContext2D, input: CredentialRenderInput) {
  const numberText = formatPlayerNumber(input.number, '--');

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawGoldText(context, numberText, {
    x: 220,
    y: 764,
    fontSize: numberText.length > 2 ? 128 : 188,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 270,
  });
  context.restore();
}

function drawSeasonFields(
  context: CanvasRenderingContext2D,
  input: CredentialRenderInput,
  layout: CredentialLayout
) {
  const period = extractSeasonPeriod(input.seasonName);
  const issued = formatIssuedAt(input.issuedAt).toUpperCase();

  context.save();
  if (layout.seasonFieldsCentered) {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
  }

  drawGoldText(context, period, {
    x: layout.fieldLeftX,
    y: layout.upperFieldsY,
    fontSize: 34,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 190,
  });

  drawGoldText(context, issued, {
    x: layout.fieldRightX,
    y: layout.upperFieldsY,
    fontSize: 38,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 250,
  });

  drawGoldText(context, period, {
    x: layout.fieldLeftX,
    y: layout.lowerFieldsY,
    fontSize: 34,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 190,
  });

  drawGoldText(context, input.credentialCode.toUpperCase(), {
    x: layout.fieldRightX,
    y: layout.lowerFieldsY,
    fontSize: 35,
    fontFamily: '"Arial Narrow", Impact, ui-monospace, monospace',
    maxWidth: 260,
  });
  context.restore();
}

function drawVeteransCurp(
  context: CanvasRenderingContext2D,
  input: CredentialRenderInput,
  layout: CredentialLayout
) {
  if (layout.curpCenterX === null || layout.curpY === null) {
    return;
  }

  const curp = input.curp?.trim().toUpperCase() || 'CURP PENDIENTE';
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawGoldText(context, curp, {
    x: layout.curpCenterX,
    y: layout.curpY,
    fontSize: 38,
    fontFamily: '"Arial Narrow", Impact, ui-monospace, monospace',
    maxWidth: 650,
  });
  context.restore();
}

async function drawQr(
  context: CanvasRenderingContext2D,
  verifyUrl: string,
  layout: CredentialLayout
) {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 286,
    color: {
      dark: '#020B12',
      light: '#FFFFFF',
    },
  });
  const qrImage = await loadImage(qrDataUrl);
  const qrImageX = layout.qrBoxX + 8;
  const qrImageY = layout.qrBoxY + 10;

  context.save();
  roundRect(context, layout.qrBoxX, layout.qrBoxY, 293, 322, 10);
  context.fillStyle = COLORS.white;
  context.fill();
  context.drawImage(qrImage, qrImageX, qrImageY, 276, 276);
  context.restore();
}

function drawOfficialDocument(context: CanvasRenderingContext2D, credentialCode: string) {
  const shortCode = credentialCode.replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase();

  context.save();
  drawBarcode(context, 1216, 700, 300, 68, credentialCode);

  context.font = '900 26px "Arial Narrow", Impact, ui-monospace, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = COLORS.accent;
  context.shadowColor = 'rgba(245,166,35,0.5)';
  context.shadowBlur = 8;
  drawTrackedText(context, shortCode, 1366 - measureTrackedText(context, shortCode, 6) / 2, 793, 6);
  context.restore();
}

function drawFooterSeason(
  context: CanvasRenderingContext2D,
  seasonName: string,
  layout: CredentialLayout
) {
  const period = extractSeasonPeriod(seasonName);

  context.save();
  context.font = '700 22px "Arial Narrow", Impact, system-ui, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = COLORS.cyan;
  context.shadowColor = 'rgba(69,244,210,0.55)';
  context.shadowBlur = 10;
  drawTrackedText(context, period, layout.footerPeriodX, layout.footerPeriodY, 2);
  context.restore();
}

function drawCenteredGoldText(
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    centerX: number;
    centerY: number;
    fontSize: number;
    maxWidth: number;
  }
) {
  const value = text.trim().toUpperCase();
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawGoldText(context, value, {
    x: options.centerX,
    y: options.centerY,
    fontSize: options.fontSize,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: options.maxWidth,
  });
  context.restore();
}

function drawGoldText(
  context: CanvasRenderingContext2D,
  text: string,
  options: {
    fontFamily: string;
    fontSize: number;
    maxWidth: number;
    x: number;
    y: number;
  }
) {
  let fontSize = options.fontSize;

  while (fontSize > 18) {
    context.font = `900 ${fontSize}px ${options.fontFamily}`;
    if (context.measureText(text).width <= options.maxWidth) {
      break;
    }
    fontSize -= 2;
  }

  const gradient = context.createLinearGradient(options.x, options.y - fontSize, options.x, options.y + fontSize);
  gradient.addColorStop(0, COLORS.accentLight);
  gradient.addColorStop(0.42, COLORS.accent);
  gradient.addColorStop(0.62, '#C78312');
  gradient.addColorStop(1, COLORS.accentLight);

  context.save();
  context.fillStyle = gradient;
  context.shadowColor = 'rgba(245,166,35,0.6)';
  context.shadowBlur = 10;
  context.fillText(text, options.x, options.y);
  context.restore();
}

function drawFallbackPortrait(
  context: CanvasRenderingContext2D,
  playerName: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#EDEDED');
  gradient.addColorStop(1, '#BFC4C8');
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);

  context.fillStyle = '#6B7280';
  context.font = '900 72px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(getInitials(playerName), x + width / 2, y + height / 2);
  context.textAlign = 'start';
  context.textBaseline = 'alphabetic';
}

function drawBarcode(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  seed: string
) {
  const chars = seed.replace(/[^A-Z0-9]/gi, '') || 'LNN2026';
  let cursor = x;
  context.fillStyle = COLORS.white;

  for (let index = 0; cursor < x + width && index < chars.length * 8; index += 1) {
    const code = chars.charCodeAt(index % chars.length);
    const barWidth = 1 + ((code + index) % 4);

    if ((code + index) % 3 !== 0) {
      context.fillRect(cursor, y, barWidth, height);
    }

    cursor += barWidth + 2;
  }
}

function fitPlayerName(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number
) {
  for (let fontSize = 74; fontSize >= 46; fontSize -= 2) {
    context.font = `900 ${fontSize}px "Arial Narrow", Impact, system-ui, sans-serif`;

    if (context.measureText(text).width <= maxWidth) {
      return { fontSize, text: [text] };
    }
  }

  for (let fontSize = 52; fontSize >= 34; fontSize -= 2) {
    context.font = `900 ${fontSize}px "Arial Narrow", Impact, system-ui, sans-serif`;
    const lines = wrapText(context, text, maxWidth);
    const requiredHeight = lines.length * fontSize * 1.02;

    if (lines.length <= 2 && requiredHeight <= maxHeight - 6) {
      return { fontSize, text: lines };
    }
  }

  context.font = '900 34px "Arial Narrow", Impact, system-ui, sans-serif';
  return { fontSize: 34, text: wrapText(context, text, maxWidth).slice(0, 2) };
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;

    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = x;
  let offsetY = y;

  if (imageRatio > targetRatio) {
    drawHeight = height;
    drawWidth = height * imageRatio;
    offsetX = x - (drawWidth - width) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / imageRatio;
    offsetY = y - (drawHeight - height) / 2;
  }

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tracking: number
) {
  let cursor = x;
  for (const char of text) {
    context.fillText(char, cursor, y);
    cursor += context.measureText(char).width + tracking;
  }
}

function measureTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  tracking: number
) {
  return text.split('').reduce((total, char, index) => {
    const next = total + context.measureText(char).width;
    return index === text.length - 1 ? next : next + tracking;
  }, 0);
}

function truncateText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 0 && context.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
    image.src = src;
  });
}

function loadCredentialTemplate(category: string) {
  const templateSrc = getCredentialTemplateSrc(category);
  const cachedTemplate = templateImagePromises.get(templateSrc);

  if (cachedTemplate) {
    return cachedTemplate;
  }

  const templatePromise = loadImage(templateSrc);
  templateImagePromises.set(templateSrc, templatePromise);
  return templatePromise;
}

function getCredentialTemplateSrc(category: string) {
  const normalizedCategory = normalizeCategory(category);

  if (isMasterCategory(normalizedCategory)) {
    return TEMPLATE_BY_CATEGORY.master;
  }

  if (
    normalizedCategory === '3ra' ||
    normalizedCategory.includes('tercera') ||
    normalizedCategory.includes('3a fuerza') ||
    normalizedCategory.includes('3ra fuerza')
  ) {
    return TEMPLATE_BY_CATEGORY.tercera;
  }

  if (
    normalizedCategory === 'femenil' ||
    normalizedCategory.includes('femenil') ||
    normalizedCategory.includes('femenina')
  ) {
    return TEMPLATE_BY_CATEGORY.femenil;
  }

  if (normalizedCategory.includes('veteran')) {
    return TEMPLATE_BY_CATEGORY.veteranos;
  }

  return TEMPLATE_BY_CATEGORY.libre;
}

function getCredentialLayout(category: string): CredentialLayout {
  const normalizedCategory = normalizeCategory(category);
  const isFemenil =
    normalizedCategory === 'femenil' ||
    normalizedCategory.includes('femenil') ||
    normalizedCategory.includes('femenina');
  const isMaster = isMasterCategory(normalizedCategory);
  const isVeteranos = normalizedCategory.includes('veteran');

  if (isFemenil) {
    return {
      categoryCenterY: 532,
      curpCenterX: null,
      curpY: null,
      fieldLeftX: 544,
      fieldRightX: 894,
      footerPeriodX: 1380,
      footerPeriodY: 919,
      lowerFieldsY: 793,
      nameBoxHeight: 92,
      nameBoxY: 214,
      photoX: 64,
      photoY: 183,
      qrBoxX: 1216,
      qrBoxY: 240,
      seasonFieldsCentered: false,
      showFooterPeriod: true,
      statusValidColor: COLORS.cyan,
      teamCenterY: 402,
      upperFieldsY: 671,
    };
  }

  if (isVeteranos) {
    return {
      categoryCenterY: 425,
      curpCenterX: 800,
      curpY: 770,
      fieldLeftX: 601,
      fieldRightX: 982,
      footerPeriodX: 0,
      footerPeriodY: 0,
      lowerFieldsY: 655,
      nameBoxHeight: 70,
      nameBoxY: 182,
      photoX: 67,
      photoY: 179,
      qrBoxX: 1218,
      qrBoxY: 228,
      seasonFieldsCentered: true,
      showFooterPeriod: false,
      statusValidColor: '#F6E71D',
      teamCenterY: 320,
      upperFieldsY: 540,
    };
  }

  if (isMaster) {
    return {
      categoryCenterY: 557,
      curpCenterX: null,
      curpY: null,
      fieldLeftX: 544,
      fieldRightX: 894,
      footerPeriodX: 1346,
      footerPeriodY: 935,
      lowerFieldsY: 813,
      nameBoxHeight: 102,
      nameBoxY: 222,
      photoX: 64,
      photoY: 173,
      qrBoxX: 1224,
      qrBoxY: 228,
      seasonFieldsCentered: false,
      showFooterPeriod: true,
      statusValidColor: COLORS.cyan,
      teamCenterY: 424,
      upperFieldsY: 691,
    };
  }

  return {
    categoryCenterY: 557,
    curpCenterX: null,
    curpY: null,
    fieldLeftX: 544,
    fieldRightX: 894,
    footerPeriodX: 1346,
    footerPeriodY: 935,
    lowerFieldsY: 813,
    nameBoxHeight: 102,
    nameBoxY: 222,
    photoX: 64,
    photoY: 173,
    qrBoxX: 1224,
    qrBoxY: 228,
    seasonFieldsCentered: false,
    showFooterPeriod: true,
    statusValidColor: COLORS.cyan,
    teamCenterY: 424,
    upperFieldsY: 691,
  };
}

function isMasterCategory(normalizedCategory: string) {
  return normalizedCategory === 'master' || normalizedCategory.includes('master');
}

function normalizeCategory(category: string) {
  return category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');
}

function formatIssuedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function extractSeasonYear(value: string) {
  const match = value.match(/\b(20\d{2})\b/);
  return match?.[1] ?? String(new Date().getFullYear());
}

function extractSeasonPeriod(value: string) {
  const range = value.match(/\b(20\d{2})\s*[-/]\s*(20\d{2})\b/);

  if (range) {
    return `${range[1]}-${range[2]}`;
  }

  const year = Number(extractSeasonYear(value));

  if (Number.isFinite(year)) {
    return `${year}-${year + 1}`;
  }

  return value;
}
