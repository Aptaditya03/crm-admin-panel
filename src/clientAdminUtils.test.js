import { matchesEmailFilter, buildSelectedClientDeletes } from './clientAdminUtils';

const client = emailId => ({ ContactPersonDetails: { comment: { note: {} }, contact: { emailId } } });

test.each([undefined, null, '', '  ', 'N/A', ' n/a '])('treats %p as N/A', email => {
  expect(matchesEmailFilter(client(email), 'na')).toBe(true);
  expect(matchesEmailFilter(client(email), 'actual')).toBe(false);
});

test('filters actual emails and handles missing contact details', () => {
  expect(matchesEmailFilter(client('admin@example.com'), 'actual')).toBe(true);
  expect(matchesEmailFilter(client('admin@example.com'), 'na')).toBe(false);
  expect(matchesEmailFilter({}, 'na')).toBe(true);
  expect(matchesEmailFilter({}, '')).toBe(true);
});

test('deletion only targets the selected child records', () => {
  expect(buildSelectedClientDeletes(['client-a', 'client-c'])).toEqual({ 'client-a': null, 'client-c': null });
});

test.each([[], [''], ['/'], ['a/b'], ['..'], ['a.b'], ['a#b'], ['a$b'], ['a[b]']].map(ids => [ids]))('rejects unsafe deletion keys %p', ids => {
  expect(() => buildSelectedClientDeletes(ids)).toThrow();
});
