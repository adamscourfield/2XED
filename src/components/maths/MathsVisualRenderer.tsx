import { ChartRenderer } from '@/components/maths/charts/ChartRenderer';
import { ArithmeticLayoutRenderer } from '@/components/maths/arithmetic/ArithmeticLayoutRenderer';
import { DataTableRenderer } from '@/components/maths/data/DataTableRenderer';
import { FrequencyTreeRenderer } from '@/components/maths/data/FrequencyTreeRenderer';
import { PartWholeBarModelRenderer } from '@/components/maths/data/PartWholeBarModelRenderer';
import { TimetableRenderer } from '@/components/maths/data/TimetableRenderer';
import { AngleRenderer } from '@/components/maths/geometry/AngleRenderer';
import { CoordinateGridRenderer } from '@/components/maths/geometry/CoordinateGridRenderer';
import { ShapeRenderer } from '@/components/maths/geometry/ShapeRenderer';
import { SampleSpaceGridRenderer } from '@/components/maths/probability/SampleSpaceGridRenderer';
import { VennTwoSetRenderer } from '@/components/maths/probability/VennTwoSetRenderer';
import { BarModelRenderer } from '@/components/maths/number/BarModelRenderer';
import { FractionBarRenderer } from '@/components/maths/number/FractionBarRenderer';
import { NumberLineRenderer } from '@/components/maths/number/NumberLineRenderer';
import { validateMathsVisual } from '@/lib/maths/visuals/guards';
import type { MathsVisual } from '@/lib/maths/visuals/types';

export function MathsVisualRenderer({ visual }: { visual: MathsVisual }) {
  const issues = validateMathsVisual(visual);
  if (issues.length > 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Visual unavailable: {issues.join(', ')}.
      </div>
    );
  }

  switch (visual.type) {
    case 'arithmetic-layout':
      return <ArithmeticLayoutRenderer visual={visual} />;
    case 'shape':
      return <ShapeRenderer visual={visual} />;
    case 'number-line':
      return <NumberLineRenderer visual={visual} />;
    case 'fraction-bar':
      return <FractionBarRenderer visual={visual} />;
    case 'angle-diagram':
      return <AngleRenderer visual={visual} />;
    case 'coordinate-grid':
      return <CoordinateGridRenderer visual={visual} />;
    case 'chart':
      return <ChartRenderer visual={visual} />;
    case 'part-whole-bar-model':
      return <PartWholeBarModelRenderer visual={visual} />;
    case 'data-table':
      return <DataTableRenderer visual={visual} />;
    case 'timetable':
      return <TimetableRenderer visual={visual} />;
    case 'frequency-tree':
      return <FrequencyTreeRenderer visual={visual} />;
    default:
      return null;
  }
}
