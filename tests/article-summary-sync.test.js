import test from 'node:test';
import assert from 'node:assert/strict';
import { syncLeadParagraphWithSummary } from '../utils/articleLead.ts';

test('correcting a duplicated summary also corrects the full article lead', () => {
  const previousSummary = 'NHTSA-ს ფიციალური განცხადებით, ინფორმაცია გამოქვეყნდა.';
  const nextSummary = 'NHTSA-ს ოფიციალური განცხადებით, ინფორმაცია გამოქვეყნდა.';
  const content = `<p><strong>${previousSummary}</strong></p><h3>შემდეგი სათაური</h3><p>დანარჩენი ტექსტი.</p>`;

  const synchronized = syncLeadParagraphWithSummary(content, previousSummary, nextSummary);

  assert.equal(
    synchronized,
    `<p><strong>${nextSummary}</strong></p><h3>შემდეგი სათაური</h3><p>დანარჩენი ტექსტი.</p>`,
  );
  assert.doesNotMatch(synchronized, /NHTSA-ს ფიციალური განცხადებით/);
});

test('an unrelated article lead is not overwritten by a summary edit', () => {
  const content = '<p><strong>სტატიის დამოუკიდებელი შესავალი.</strong></p><p>დანარჩენი ტექსტი.</p>';

  assert.equal(
    syncLeadParagraphWithSummary(content, 'ძველი მოკლე აღწერა.', 'ახალი მოკლე აღწერა.'),
    content,
  );
});
