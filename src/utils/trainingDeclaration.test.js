import { describe, expect, test } from 'bun:test';
import { canSubmitDeclaration, declarationFileType, fitScale, readerScale, summarizeSignatures, validateDeclarationFile } from './trainingDeclaration';

const png = 'data:image/png;base64,iVBORw0KGgo=';

describe('Training Acknowledgment and Declaration', () => {
  test('accepts PDF and Word .docx templates', () => {
    expect(declarationFileType('Declaration.PDF')).toBe('pdf');
    expect(declarationFileType('declaration.docx')).toBe('docx');
    expect(validateDeclarationFile({ name: 'a.pdf', size: 1000 })).toBeNull();
  });
  test('rejects other file types and old .doc files', () => {
    expect(validateDeclarationFile({ name: 'a.doc', size: 1000 })).toContain('.docx');
    expect(validateDeclarationFile({ name: 'a.xlsx', size: 1000 })).toContain('Only PDF or Word');
  });
  test('rejects files over 20 MB', () => {
    expect(validateDeclarationFile({ name: 'a.pdf', size: 20 * 1024 * 1024 + 1 })).toContain('20 MB');
  });
  test('driver must tick Yes and sign before submitting', () => {
    expect(canSubmitDeclaration({ agreed: true, signature: png })).toBe(true);
    expect(canSubmitDeclaration({ agreed: false, signature: png })).toBe(false);
    expect(canSubmitDeclaration({ agreed: true, signature: null })).toBe(false);
  });
  test('counts signed and not signed drivers from the training register', () => {
    const s = summarizeSignatures([{ driver_id: '100' }, { driver_id: '999' }], ['100', '200', '200', '300']);
    expect(s).toEqual({ total: 3, signed: 1, notSigned: ['200', '300'] });
  });
  test('A4 page shrinks to fit phone width but never enlarges', () => {
    expect(fitScale(397)).toBe(0.5);
    expect(fitScale(2000)).toBe(1);
  });
  test('phone reader starts fitted to the screen and zooms up to 2x A4 size', () => {
    expect(readerScale(397, 0)).toBe(0.5);
    expect(readerScale(397, 1)).toBe(0.75);
    expect(readerScale(397, 4)).toBe(1.5);
    expect(readerScale(1200, 4)).toBe(2);
    expect(readerScale(397, -3)).toBe(0.5);
  });
});
