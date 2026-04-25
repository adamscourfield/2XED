'use client';

import {
  EraserIcon,
  HighlighterIcon,
  ImageIcon,
  PenIcon,
  PointerIcon,
  RedoIcon,
  ShapeIcon,
  TextIcon,
  UndoIcon,
} from './icons';
import type { CanvasTool } from './AnnotationCanvas';

const PEN_COLORS = ['#1f1f23', '#4a40e0', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626'] as const;

interface Props {
  tool: CanvasTool;
  color: string;
  onToolChange: (tool: CanvasTool) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onInsertImage: () => void;
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="anx-tool-btn"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AnnotationToolbar({
  tool,
  color,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onInsertImage,
}: Props) {
  return (
    <div className="anx-workspace-toolbar" role="toolbar" aria-label="Annotation tools">
      <ToolButton active={tool === 'pen'} label="Pen" onClick={() => onToolChange('pen')}>
        <PenIcon />
      </ToolButton>
      <ToolButton
        active={tool === 'highlighter'}
        label="Highlighter"
        onClick={() => onToolChange('highlighter')}
      >
        <HighlighterIcon />
      </ToolButton>
      <ToolButton active={tool === 'eraser'} label="Eraser" onClick={() => onToolChange('eraser')}>
        <EraserIcon />
      </ToolButton>
      <ToolButton active={tool === 'shape'} label="Shape" onClick={() => onToolChange('shape')}>
        <ShapeIcon />
      </ToolButton>
      <ToolButton active={tool === 'text'} label="Text" onClick={() => onToolChange('text')}>
        <TextIcon />
      </ToolButton>
      <ToolButton active={false} label="Insert image" onClick={onInsertImage}>
        <ImageIcon />
      </ToolButton>
      <ToolButton active={tool === 'pointer'} label="Pointer / select" onClick={() => onToolChange('pointer')}>
        <PointerIcon />
      </ToolButton>

      <div className="anx-tool-divider" aria-hidden />

      <ToolButton active={false} label="Undo" onClick={onUndo}>
        <UndoIcon />
      </ToolButton>
      <ToolButton active={false} label="Redo" onClick={onRedo}>
        <RedoIcon />
      </ToolButton>

      <div className="anx-tool-divider" aria-hidden />

      <div className="flex flex-col items-center gap-1.5">
        {PEN_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="anx-tool-swatch"
            aria-pressed={color === c}
            aria-label={`Ink colour ${c}`}
            title={c}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
          />
        ))}
      </div>
    </div>
  );
}
