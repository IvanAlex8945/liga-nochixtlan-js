import { describe, expect, it } from 'vitest';

import {
  fitAutoAdjustText,
  getCredentialLayout,
  splitClosestToMidpoint,
} from '../lib/credential-render';

describe('splitClosestToMidpoint', () => {
  it('returns single line for words without spaces', () => {
    expect(splitClosestToMidpoint('ALEXIS')).toEqual(['ALEXIS']);
    expect(splitClosestToMidpoint('')).toEqual(['']);
  });

  it('splits two words at their space', () => {
    expect(splitClosestToMidpoint('MARIO LOPEZ')).toEqual(['MARIO', 'LOPEZ']);
  });

  it('splits four words closest to midpoint', () => {
    expect(splitClosestToMidpoint('JOSE LUIS HERNANDEZ PEREZ')).toEqual([
      'JOSE LUIS',
      'HERNANDEZ PEREZ',
    ]);
  });

  it('splits long team name evenly', () => {
    expect(splitClosestToMidpoint('DEPORTIVO REAL NOCHIXTLAN')).toEqual([
      'DEPORTIVO REAL',
      'NOCHIXTLAN',
    ]);
  });
});

describe('fitAutoAdjustText', () => {
  function createMockContext() {
    let currentFontSize = 50;
    return {
      set font(value: string) {
        const match = value.match(/(\d+)px/);
        if (match) {
          currentFontSize = parseInt(match[1], 10);
        }
      },
      get font() {
        return '900 ' + currentFontSize + 'px sans-serif';
      },
      measureText(text: string) {
        return { width: text.length * currentFontSize * 0.6 };
      },
    } as unknown as CanvasRenderingContext2D;
  }

  it('keeps short text in 1 line with base font size', () => {
    const context = createMockContext();
    const result = fitAutoAdjustText(context, 'JUAN PEREZ', {
      baseFontSize: 50,
      maxWidth: 755,
      minSingleLineFontSize: 34,
      twoLineFontSize: 24,
    });
    expect(result.lines).toEqual(['JUAN PEREZ']);
    expect(result.fontSize).toBe(50);
  });

  it('reduces font size for moderately long single line text', () => {
    const context = createMockContext();
    const result = fitAutoAdjustText(context, 'ALEJANDRO IVAN HERNANDEZ', {
      baseFontSize: 50,
      maxWidth: 755,
      minSingleLineFontSize: 34,
      twoLineFontSize: 24,
    });
    expect(result.lines).toEqual(['ALEJANDRO IVAN HERNANDEZ']);
    expect(result.fontSize).toBeLessThanOrEqual(46);
    expect(result.fontSize).toBeGreaterThanOrEqual(34);
  });

  it('splits into 2 lines when text cannot fit at minSingleLineFontSize', () => {
    const context = createMockContext();
    const result = fitAutoAdjustText(
      context,
      'FRANCISCO JAVIER HERNANDEZ SANTIAGO DE LA CRUZ',
      {
        baseFontSize: 50,
        maxWidth: 755,
        minSingleLineFontSize: 34,
        twoLineFontSize: 24,
      }
    );
    expect(result.lines.length).toBe(2);
    expect(result.fontSize).toBe(24);
  });
});

describe('getCredentialLayout for MASTER', () => {
  it('returns exact coordinates for Master category', () => {
    const layout = getCredentialLayout('master');

    // Player photo
    expect(layout.photoX).toBe(102);
    expect(layout.photoY).toBe(271);
    expect(layout.photoWidth).toBe(285);
    expect(layout.photoHeight).toBe(328);

    // Dorsal
    expect(layout.dorsalCenterX).toBe(245);
    expect(layout.dorsalCenterY).toBe(786);

    // Player name
    expect(layout.nameBoxX).toBe(476);
    expect(layout.nameBoxY).toBe(342);
    expect(layout.nameBoxWidth).toBe(755);
    expect(layout.nameBoxHeight).toBe(74);
    expect(layout.nameCentered).toBe(true);
    expect(layout.nameMaxFontSize).toBe(50);
    expect(layout.nameSingleLineMinFontSize).toBe(34);
    expect(layout.nameWrapMinFontSize).toBe(24);

    // Team name
    expect(layout.teamCenterX).toBe(853);
    expect(layout.teamCenterY).toBe(534);
    expect(layout.teamMaxWidth).toBe(680);
    expect(layout.teamBoxWidth).toBe(755);
    expect(layout.teamBoxHeight).toBe(74);
    expect(layout.teamMaxFontSize).toBe(50);
    expect(layout.teamSingleLineMinFontSize).toBe(34);
    expect(layout.teamWrapMinFontSize).toBe(24);

    // Season fields
    expect(layout.upperFieldsY).toBe(680);
    expect(layout.fieldLeftX).toBe(905);
    expect(layout.fieldRightX).toBe(1129);
    expect(layout.lowerFieldsY).toBe(810);
    expect(layout.codeCenterX).toBe(1129);
    expect(layout.seasonFieldsCentered).toBe(true);

    // QR
    expect(layout.qrBoxX).toBe(1296);
    expect(layout.qrBoxY).toBe(333);
    expect(layout.qrBoxWidth).toBe(209);
    expect(layout.qrBoxHeight).toBe(225);
    expect(layout.qrImageSize).toBe(195);
    expect(layout.qrImageOffsetX).toBe(7);
    expect(layout.qrImageOffsetY).toBe(15);

    // Barcode & official document
    expect(layout.officialBarcodeX).toBe(1301);
    expect(layout.officialBarcodeY).toBe(700);
    expect(layout.officialBarcodeWidth).toBe(198);
    expect(layout.officialBarcodeHeight).toBe(52);
    expect(layout.officialCodeCenterX).toBe(1400);
    expect(layout.officialCodeY).toBe(790);
    expect(layout.officialCodeVisible).toBe(true);

    // Category and seals
    expect(layout.categoryTextVisible).toBe(false);
    expect(layout.statusBadgeVisible).toBe(false);
    expect(layout.showFooterPeriod).toBe(false);
    expect(layout.textColor).toBe('#2D0A14');
    expect(layout.textShadowColor).toBe('transparent');
  });

  it('keeps Libre layout intact without breaking', () => {
    const layout = getCredentialLayout('libre');
    expect(layout.categoryTextVisible).toBe(true);
    expect(layout.statusBadgeVisible).toBe(true);
    expect(layout.nameBoxX).toBe(456);
    expect(layout.teamCenterX).toBe(796);
  });
});
