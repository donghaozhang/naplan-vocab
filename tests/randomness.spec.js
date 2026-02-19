const { test, expect } = require('@playwright/test');

// Helper: get current spell word from the clue box
async function getSpellWord(page) {
  // The actual word is hidden — we read it from JS state
  return page.evaluate(() => currentWord?.w);
}

// Helper: click Next to advance to a new word
async function nextWord(page) {
  await page.click('button:has-text("Next")');
  await page.waitForTimeout(200);
}

// Helper: collect N words from spell mode
async function collectWords(page, n) {
  const words = [];
  for (let i = 0; i < n; i++) {
    const w = await getSpellWord(page);
    words.push(w);
    await nextWord(page);
  }
  return words;
}

test.describe('Word Randomness', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage and disable timer for stable tests
    await page.evaluate(() => {
      localStorage.clear();
      location.reload();
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => { stopTimer(); clearInterval(timerInterval); });
  });

  test('words are not in alphabetical order', async ({ page }) => {
    const words = await collectWords(page, 20);
    const sorted = [...words].sort();
    // It's astronomically unlikely 20 random words come out sorted
    expect(words).not.toEqual(sorted);
  });

  test('consecutive words are not the same', async ({ page }) => {
    const words = await collectWords(page, 30);
    let consecutiveDupes = 0;
    for (let i = 1; i < words.length; i++) {
      if (words[i] === words[i - 1]) consecutiveDupes++;
    }
    // Should have zero or near-zero consecutive duplicates
    expect(consecutiveDupes).toBeLessThanOrEqual(1);
  });

  test('20 words have sufficient variety (at least 15 unique)', async ({ page }) => {
    const words = await collectWords(page, 20);
    const unique = new Set(words).size;
    // With 1198 words pool, 20 picks should have high uniqueness
    expect(unique).toBeGreaterThanOrEqual(15);
  });

  test('two sessions produce different word orders', async ({ page, context }) => {
    const words1 = await collectWords(page, 10);

    // Open a second page (fresh session)
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.evaluate(() => { localStorage.clear(); location.reload(); });
    await page2.waitForTimeout(500);
    const words2 = await collectWords(page2, 10);

    // They should NOT be identical sequences
    const same = words1.every((w, i) => w === words2[i]);
    expect(same).toBe(false);
  });

  test('words are picked from across different letters (A-Z spread)', async ({ page }) => {
    const words = await collectWords(page, 40);
    const firstLetters = new Set(words.map(w => w[0].toLowerCase()));
    // 40 random words should span at least 8 different starting letters
    expect(firstLetters.size).toBeGreaterThanOrEqual(8);
  });

  test('words are picked from different difficulty levels', async ({ page }) => {
    const levels = new Set();
    for (let i = 0; i < 40; i++) {
      const level = await page.evaluate(() => currentWord?.l);
      levels.add(level);
      await nextWord(page);
    }
    // Should hit at least 3 of 4 levels (simple/common/difficult/challenging)
    expect(levels.size).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Wrong Word Repetition', () => {

  test('wrong words reappear but not excessively', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); location.reload(); });
    await page.waitForTimeout(500);

    // Get the first word and intentionally get it wrong
    const wrongWord = await getSpellWord(page);

    // Type wrong answer to trigger wrong book
    await page.fill('#spell-input', 'xyzxyz');
    await page.click('button:has-text("Check")');
    await page.waitForTimeout(300);

    // Now collect 30 more words and count how often wrongWord appears
    let appearances = 0;
    for (let i = 0; i < 30; i++) {
      await nextWord(page);
      const w = await getSpellWord(page);
      if (w === wrongWord) appearances++;
    }

    // Should appear 1-4 times (not 0, not 15+)
    expect(appearances).toBeGreaterThanOrEqual(1);
    expect(appearances).toBeLessThanOrEqual(5);
  });
});

test.describe('Mode Switching Randomness', () => {

  test('match mode words are random', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); location.reload(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { stopTimer(); });

    // Switch to match mode
    await page.click('button:has-text("Match")');
    await page.waitForTimeout(300);
    await page.evaluate(() => { stopTimer(); });

    const words = [];
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => { stopTimer(); });
      const w = await page.evaluate(() => currentWord?.w);
      words.push(w);
      // Click any option to advance, then next
      await page.click('#match-options .option >> nth=0');
      await page.waitForTimeout(200);
      const nextBtn = page.locator('#match-next');
      if (await nextBtn.isVisible()) await nextBtn.click();
      await page.waitForTimeout(200);
    }
    const unique = new Set(words).size;
    // Wrong answers cause repeats via wrongRepeat, so threshold is slightly lower
    expect(unique).toBeGreaterThanOrEqual(8);
  });

  test('quiz mode words are random', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); location.reload(); });
    await page.waitForTimeout(500);

    // Disable timer to avoid timeout interference
    await page.evaluate(() => { stopTimer(); });
    await page.click('button:has-text("Quiz")');
    await page.waitForTimeout(300);
    await page.evaluate(() => { stopTimer(); });

    const words = [];
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => { stopTimer(); });
      const w = await page.evaluate(() => currentWord?.w);
      words.push(w);
      await page.click('#quiz-options .option >> nth=0');
      await page.waitForTimeout(200);
      const nextBtn = page.locator('#quiz-next');
      if (await nextBtn.isVisible()) await nextBtn.click();
      await page.waitForTimeout(200);
    }
    const unique = new Set(words).size;
    expect(unique).toBeGreaterThanOrEqual(5);
  });
});
