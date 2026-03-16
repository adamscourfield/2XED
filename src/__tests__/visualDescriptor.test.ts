import { describe, it, expect } from 'vitest';
import { VisualDescriptorSchema } from '@/lib/validators/visual-descriptor';

describe('VisualDescriptorSchema', () => {
  it('validates a number line descriptor', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'number_line',
      min: -5,
      max: 5,
      showQuestion: { position: -3, label: '?' },
    });
    expect(result.success).toBe(true);
  });

  it('validates a number line with arrow', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'number_line',
      min: -2,
      max: 13,
      marked: [7],
      arrow: { from: 7, to: 11, label: '+4' },
    });
    expect(result.success).toBe(true);
  });

  it('validates a bar model descriptor', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'bar_model',
      total: 5,
      segments: [
        { value: 3, label: 'shaded', highlight: true },
        { value: 2, label: 'unshaded' },
      ],
      question: 'What fraction is shaded?',
    });
    expect(result.success).toBe(true);
  });

  it('validates a bar model with question segment', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'bar_model',
      total: 80,
      segments: [
        { value: 32, label: '40%', highlight: true },
        { value: 48, label: '?', isQuestion: true },
      ],
      showTotal: true,
    });
    expect(result.success).toBe(true);
  });

  it('validates a rectangle descriptor', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'rectangle',
      width: 7,
      height: 4,
      showDimensions: true,
      question: 'area',
    });
    expect(result.success).toBe(true);
  });

  it('validates a rectangle with missing dimension', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'rectangle',
      width: 6,
      height: 4,
      showDimensions: true,
      showArea: true,
      question: 'missing_dimension',
      missingDimension: 'height',
      labelHeight: '?',
    });
    expect(result.success).toBe(true);
  });

  it('validates a triangle descriptor', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'triangle',
      variant: 'right',
      sideA: 3,
      sideB: 4,
      sideC: '?',
      showRightAngle: true,
      question: 'missing_side',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'invalid',
      min: 0,
      max: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects number line missing required fields', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'number_line',
      min: -5,
      // max is missing
    });
    expect(result.success).toBe(false);
  });

  it('rejects bar model with no segments', () => {
    const result = VisualDescriptorSchema.safeParse({
      type: 'bar_model',
      total: 10,
      // segments is missing
    });
    expect(result.success).toBe(false);
  });
});
