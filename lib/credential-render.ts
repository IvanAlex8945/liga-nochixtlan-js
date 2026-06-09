import QRCode from 'qrcode';

export interface CredentialRenderInput {
  category: string;
  credentialCode: string;
  issuedAt: string;
  number: number | null;
  photoUrl: string | null;
  playerName: string;
  seasonName: string;
  statusLabel: string;
  teamName: string;
  verifyUrl: string;
}

const CARD_WIDTH = 1586;
const CARD_HEIGHT = 992;
const TEMPLATE_SRC = '/credentials/base_credencial_bueno.png';
let templateImagePromise: Promise<HTMLImageElement> | null = null;

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

  const template = await loadCredentialTemplate();
  context.drawImage(template, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  await drawPlayerPhoto(context, input);
  drawStatusBadge(context, input.statusLabel);
  drawPlayerName(context, input.playerName);
  drawCenteredGoldText(context, input.teamName, {
    centerX: 796,
    centerY: 424,
    fontSize: 56,
    maxWidth: 650,
  });
  drawCenteredGoldText(context, input.category || 'Libre', {
    centerX: 798,
    centerY: 557,
    fontSize: 56,
    maxWidth: 520,
  });
  drawDorsal(context, input);
  drawSeasonFields(context, input);
  await drawQr(context, input.verifyUrl);
  drawOfficialDocument(context, input.credentialCode);
  drawFooterSeason(context, input.seasonName);

  return canvas.toDataURL('image/png');
}

async function drawPlayerPhoto(context: CanvasRenderingContext2D, input: CredentialRenderInput) {
  const photoBox = { x: 64, y: 173, width: 318, height: 363, radius: 8 };

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

function drawStatusBadge(context: CanvasRenderingContext2D, statusLabel: string) {
  const isValid = statusLabel.toLowerCase().includes('vigente');
  const color = isValid ? COLORS.cyan : COLORS.danger;
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

function drawPlayerName(context: CanvasRenderingContext2D, playerName: string) {
  const name = playerName.trim().toUpperCase();
  const box = { x: 456, y: 222, width: 690, height: 102 };
  const lines = fitTextLines(context, name, box.width, 74, 42, 2);
  const lineHeight = lines.fontSize * 1.06;
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
  const numberText = input.number !== null ? String(input.number) : '--';
  const team = input.teamName.toUpperCase();

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  drawGoldText(context, numberText, {
    x: 220,
    y: 746,
    fontSize: numberText.length > 2 ? 120 : 176,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 270,
  });

  context.font = '900 36px "Arial Narrow", Impact, system-ui, sans-serif';
  context.fillStyle = COLORS.accent;
  context.shadowColor = 'rgba(245,166,35,0.55)';
  context.shadowBlur = 8;
  context.fillText(truncateText(context, team, 300), 220, 834);
  context.restore();
}

function drawSeasonFields(context: CanvasRenderingContext2D, input: CredentialRenderInput) {
  const year = extractSeasonYear(input.seasonName);
  const issued = formatIssuedAt(input.issuedAt).toUpperCase();

  drawGoldText(context, year, {
    x: 544,
    y: 691,
    fontSize: 38,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 190,
  });

  drawGoldText(context, issued, {
    x: 894,
    y: 691,
    fontSize: 38,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 250,
  });

  drawGoldText(context, year, {
    x: 544,
    y: 813,
    fontSize: 38,
    fontFamily: '"Arial Narrow", Impact, system-ui, sans-serif',
    maxWidth: 190,
  });

  drawGoldText(context, input.credentialCode.toUpperCase(), {
    x: 894,
    y: 813,
    fontSize: 35,
    fontFamily: '"Arial Narrow", Impact, ui-monospace, monospace',
    maxWidth: 260,
  });
}

async function drawQr(context: CanvasRenderingContext2D, verifyUrl: string) {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 1,
    width: 286,
    color: {
      dark: '#020B12',
      light: '#FFFFFF',
    },
  });
  const qrImage = await loadImage(qrDataUrl);

  context.save();
  roundRect(context, 1224, 228, 293, 322, 10);
  context.fillStyle = COLORS.white;
  context.fill();
  context.drawImage(qrImage, 1232, 238, 276, 276);
  context.restore();
}

function drawOfficialDocument(context: CanvasRenderingContext2D, credentialCode: string) {
  const shortCode = credentialCode.replace(/[^A-Z0-9]/gi, '').slice(-10).toUpperCase();

  context.save();
  drawBarcode(context, 1216, 713, 300, 68, credentialCode);

  context.font = '900 26px "Arial Narrow", Impact, ui-monospace, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = COLORS.accent;
  context.shadowColor = 'rgba(245,166,35,0.5)';
  context.shadowBlur = 8;
  drawTrackedText(context, shortCode, 1366 - measureTrackedText(context, shortCode, 6) / 2, 816, 6);
  context.restore();
}

function drawFooterSeason(context: CanvasRenderingContext2D, seasonName: string) {
  const year = extractSeasonYear(seasonName);

  context.save();
  context.font = '700 26px "Arial Narrow", Impact, system-ui, sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = COLORS.cyan;
  context.shadowColor = 'rgba(69,244,210,0.55)';
  context.shadowBlur = 10;
  drawTrackedText(context, year, 1352, 940, 4);
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

function fitTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
  maxLines: number
) {
  let fontSize = startSize;

  while (fontSize >= minSize) {
    context.font = `900 ${fontSize}px "Arial Narrow", Impact, system-ui, sans-serif`;
    const lines = wrapText(context, text, maxWidth);

    if (lines.length <= maxLines) {
      return { fontSize, text: lines };
    }

    fontSize -= 2;
  }

  context.font = `900 ${minSize}px "Arial Narrow", Impact, system-ui, sans-serif`;
  return { fontSize: minSize, text: wrapText(context, text, maxWidth).slice(0, maxLines) };
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

function loadCredentialTemplate() {
  templateImagePromise ??= loadImage(TEMPLATE_SRC);
  return templateImagePromise;
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
