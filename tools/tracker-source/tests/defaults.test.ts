import { describe, expect, it } from 'vitest';
import { freshPlan } from '../src/domain/defaults';

describe('default expense categories', () => {
  it('keeps Tea and Snacks separate from Travel', () => {
    const categories = freshPlan().categories;
    const tea = categories.find((category) => category.id === 'tea-snacks');
    const travel = categories.find((category) => category.id === 'travel');

    expect(tea).toMatchObject({ name: 'Tea and Snacks', group: 'Living', role: 'regular', active: true });
    expect(travel).toMatchObject({ name: 'Travel', group: 'Living', role: 'regular', active: true });
    expect(tea?.id).not.toBe(travel?.id);
    expect(categories.some((category) => /tea.*travel|travel.*tea/i.test(category.name))).toBe(false);
  });
});
