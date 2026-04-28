'use client';

import { useState } from 'react';
import {
  ArrowLineIcon,
  EraserIcon,
  HighlighterIcon,
  ImageIcon,
  PenIcon,
  RedoIcon,
  SelectIcon,
  ShapeIcon,
  TextIcon,
  UndoIcon,
} from './icons';
import type { CanvasTool } from './AnnotationCanvas';

const PEN_COLORS = ['#1f1f23', '#4a40e0', '#0ea5e9', '#16a34a', '#f59e0b', '#dc2626'] as const;

interface Props {
  tool: CanvasTool;
  color: string;
  canUndo: boolean;
  canRedo: boolean;
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
  disabled,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`anx-tool-btn${active ? ' anx-tool-btn--active' : ''}`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="anx-tool-icon-slot">{children}</span>
    </button>
  );
}

export function AnnotationToolbar({
  tool,
  color,
  canUndo,
  canRedo,
  onToolChange,
  onColorChange,
  onUndo,
  onRedo,
  onInsertImage,
}: Props) {
  const [colorsOpen, setColorsOpen] = useState(false);

  return (
    <div className="anx-workspace-toolbar" role="toolbar" aria-label="Annotation tools">
      <ToolButton active={tool === 'pen'} label="Pen" onClick={() => onToolChange('pen')}>
        <PenIcon />
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
      <ToolButton
        active={tool === 'highlighter'}
        label="Highlighter"
        onClick={() => onToolChange('highlighter')}
      >
        <HighlighterIcon />
      </ToolButton>
      <ToolButton active={false} label="Insert image" onClick={onInsertImage}>
        <ImageIcon />
      </ToolButton>
      <ToolButton
        active={tool === 'pointer'}
        label="Arrow"
        onClick={() => onToolChange('pointer')}
      >
        <ArrowLineIcon />
      </ToolButton>
      <ToolButton
        active={tool === 'pointer'}
        label="Select"
        onClick={() => onToolChange('pointer')}
      >
        <SelectIcon />
      </ToolButton>

      <div className="anx-tool-divider" aria-hidden />

      <ToolButton active={false} label="Undo" onClick={onUndo} disabled={!canUndo}>
        <UndoIcon />
      </ToolButton>
      <ToolButton active={false} label="Redo" onClick={onRedo} disabled={!canRedo}>
        <RedoIcon />
      </ToolButton>

      <div className="anx-tool-divider" aria-hidden />

      <button
        type="button"
        className={`anx-tool-btn anx-tool-btn--chevron${colorsOpen ? ' anx-tool-btn--chevron-open' : ''}`}
        aria-expanded={colorsOpen}
        aria-label={colorsOpen ? 'Hide colours' : 'Show colours'}
        title={colorsOpen ? 'Hide colours' : 'Colours'}
        onClick={() => setColorsOpen((v) => !v)}
      >
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {colorsOpen && (
        <div className="anx-toolbar-colors" role="group" aria-label="Ink colours">
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
      )}
    </div>
  );
}
