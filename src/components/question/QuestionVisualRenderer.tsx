'use client';

import { NumberLineVisual } from './visuals/NumberLineVisual';
import { BarModelVisual } from './visuals/BarModelVisual';
import { GeometryVisual } from './visuals/GeometryVisual';

type VisualDescriptor = {
  type: 'number_line' | 'bar_model' | 'rectangle' | 'triangle' | 'composite';
  [key: string]: unknown;
};

interface Props {
  descriptor: VisualDescriptor | null;
  imageUrl?: string | null;
  placement: 'above' | 'below' | 'left' | 'inline';
  maxWidth?: number;
  className?: string;
}

const placementClasses: Record<string, string> = {
  above: 'mb-5',
  below: 'mt-5',
  left: 'float-left mr-6 mb-2',
  inline: 'inline-block align-middle',
};

export function QuestionVisualRenderer({
  descriptor,
  imageUrl,
  placement,
  maxWidth = 520,
  className,
}: Props) {
  if (!descriptor && !imageUrl) return null;

  if (!descriptor && imageUrl) {
    return (
      <div className={`${placementClasses[placement] ?? ''} ${className ?? ''}`}>
        <img src={imageUrl} alt="Question diagram" style={{ maxWidth }} />
      </div>
    );
  }

  const visual = (() => {
    switch (descriptor!.type) {
      case 'number_line':
        return <NumberLineVisual d={descriptor as any} maxWidth={maxWidth} />;
      case 'bar_model':
        return <BarModelVisual d={descriptor as any} maxWidth={maxWidth} />;
      case 'rectangle':
      case 'triangle':
      case 'composite':
        return <GeometryVisual d={descriptor as any} maxWidth={maxWidth} />;
      default:
        return null;
    }
  })();

  return (
    <div className={`${placementClasses[placement] ?? ''} ${className ?? ''}`}>
      {visual}
    </div>
  );
}
