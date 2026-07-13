import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

const oldBrandPattern = /Denim-Cut|Tailor Store Manager|Tailor Store App|Smart Tailor Manager/;

describe('BrandMark', () => {
  it('uses Faabrico text as the logo fallback instead of initials from old shop names', () => {
    render(<BrandMark name="Denim-Cut" logoUrl={null} />);

    expect(screen.getByText('Faabrico')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
    expect(screen.queryByText(oldBrandPattern)).not.toBeInTheDocument();
  });

  it('falls back to Faabrico text when the logo image fails', () => {
    render(<BrandMark name="Faabrico" logoUrl="https://example.com/missing-logo.png" />);

    fireEvent.error(screen.getByAltText('Faabrico logo'));

    expect(screen.getByText('Faabrico')).toBeInTheDocument();
    expect(screen.queryByText('F')).not.toBeInTheDocument();
  });
});