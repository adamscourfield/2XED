/** @vitest-environment jsdom */

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, Badge, StatTile, Button } from '@/components/ui';

describe('UI primitives', () => {
  it('Card renders the card chrome and children', () => {
    const { container } = render(<Card className="extra">hello</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('anx-card');
    expect(el.className).toContain('extra');
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('Badge applies tone colours and explicit overrides', () => {
    const { rerender } = render(<Badge tone="success">ok</Badge>);
    const badge = screen.getByText('ok');
    expect(badge.style.color).toContain('--anx-success');

    rerender(<Badge color="rgb(1, 2, 3)" background="rgb(4, 5, 6)">x</Badge>);
    const overridden = screen.getByText('x');
    expect(overridden.style.color).toBe('rgb(1, 2, 3)');
    expect(overridden.style.background).toBe('rgb(4, 5, 6)');
  });

  it('StatTile shows value and label', () => {
    render(<StatTile value="83%" label="Accuracy" />);
    expect(screen.getByText('83%')).toBeTruthy();
    expect(screen.getByText('Accuracy')).toBeTruthy();
  });

  it('Button maps variant to the token class and forwards props', () => {
    render(<Button variant="secondary" disabled>go</Button>);
    const btn = screen.getByText('go') as HTMLButtonElement;
    expect(btn.className).toContain('anx-btn-secondary');
    expect(btn.disabled).toBe(true);
    expect(btn.type).toBe('button');
  });
});
