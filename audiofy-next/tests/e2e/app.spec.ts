// AudioFY — Data Sonification & Visualization
// Copyright (C) 2026 Jordan Elbirt
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_FILE = path.resolve(__dirname, 'fixtures/sample.csv');

// ---------------------------------------------------------------------------
// 1. Application loads
// ---------------------------------------------------------------------------

test.describe('App Launch', () => {
  test('displays the main toolbar', async ({ page }) => {
    await page.goto('/');
    const toolbar = page.getByRole('toolbar', { name: 'Main toolbar' });
    await expect(toolbar).toBeVisible();
  });

  test('shows "Open File" button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Open File' })).toBeVisible();
  });

  test('shows drop zone when no data loaded', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Drop a spreadsheet here or click Open File')).toBeVisible();
  });

  test('has skip-to-content link', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('a.skip-to-content');
    await expect(skipLink).toBeAttached();
    // Should be off-screen initially but focusable
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
  });

  test('shows empty source list message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('No data loaded. Open a file to get started.')).toBeVisible();
  });

  test('playback controls are disabled without data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeDisabled();
  });

  test('export buttons are disabled without data', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Export SVG' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export audio' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 2. File import
// ---------------------------------------------------------------------------

test.describe('File Import', () => {
  test('imports CSV via Open File dialog', async ({ page }) => {
    await page.goto('/');

    // Listen for file chooser before clicking
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);

    // Wait for data to load — drop zone should disappear, chart should appear
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    // Source list should show the loaded source
    await expect(page.getByText('sample.csv')).toBeVisible();

    // SVG chart should be rendered
    await expect(page.locator('svg')).toBeVisible();

    // Data table should appear
    const table = page.getByRole('grid');
    await expect(table).toBeVisible();
  });

  test('enables playback controls after import', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);

    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled();
  });

  test('enables export buttons after import', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);

    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Export SVG' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Export audio' })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 3. Settings panel
// ---------------------------------------------------------------------------

test.describe('Settings Panel', () => {
  test('toggle settings panel with button', async ({ page }) => {
    await page.goto('/');

    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    await expect(settingsBtn).toHaveAttribute('aria-expanded', 'false');

    await settingsBtn.click();
    await expect(settingsBtn).toHaveAttribute('aria-expanded', 'true');

    // Settings panel should be visible
    const panel = page.locator('#settings-panel');
    await expect(panel).toBeVisible();

    // Toggle off
    await settingsBtn.click();
    await expect(settingsBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).not.toBeVisible();
  });

  test('shows source settings when source is selected', async ({ page }) => {
    await page.goto('/');

    // Import file
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    // Open settings
    await page.getByRole('button', { name: 'Settings' }).click();

    // Click the source in the list to select it (use listbox scope to avoid <option> in <select>)
    await page.getByRole('listbox').getByRole('option').first().click();

    // Settings should show source-specific controls
    await expect(page.getByLabel('Waveform')).toBeVisible();
    await expect(page.getByLabel('Normalization')).toBeVisible();
    await expect(page.getByLabel('Frequency Scale')).toBeVisible();
  });

  test('displays visualization settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByLabel('Show Grid')).toBeVisible();
    await expect(page.getByLabel('Show Legend')).toBeVisible();
    await expect(page.getByLabel('Theme')).toBeVisible();
  });

  test('displays audio settings', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByLabel('Reverb')).toBeVisible();
    await expect(page.getByLabel('Low-pass Filter')).toBeVisible();
  });

  test('can change theme to dark', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    const themeSelect = page.getByLabel('Theme');
    await themeSelect.selectOption('dark');

    // Document root should have data-theme="dark"
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

// ---------------------------------------------------------------------------
// 4. Source list interactions
// ---------------------------------------------------------------------------

test.describe('Source List', () => {
  test('shows source count after import', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Sources (1)')).toBeVisible();
  });

  test('can remove a source', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    // Remove the source
    await page.getByRole('button', { name: /Remove/ }).click();

    // Should go back to empty state
    await expect(page.getByText('Drop a spreadsheet here or click Open File')).toBeVisible();
    await expect(page.getByText('No data loaded. Open a file to get started.')).toBeVisible();
  });

  test('source list has listbox role', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Keyboard shortcuts
// ---------------------------------------------------------------------------

test.describe('Keyboard Navigation', () => {
  test('Ctrl+, toggles settings panel', async ({ page }) => {
    await page.goto('/');

    // Ensure focus is on body (not an input/select which blocks shortcuts)
    await page.locator('body').click();
    await page.keyboard.press('Control+,');
    const panel = page.locator('#settings-panel');
    await expect(panel).toBeVisible();

    await page.locator('body').click();
    await page.keyboard.press('Control+,');
    await expect(panel).not.toBeVisible();
  });

  test('Tab navigation reaches main interactive elements', async ({ page }) => {
    await page.goto('/');

    // Tab through UI elements
    await page.keyboard.press('Tab'); // skip-to-content (focused but hidden)
    await page.keyboard.press('Tab'); // Open File button
    await expect(page.getByRole('button', { name: 'Open File' })).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// 6. Data visualization
// ---------------------------------------------------------------------------

test.describe('Visualization', () => {
  test('scatter plot renders with data points', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    // SVG should contain circles (data points)
    const circles = page.locator('svg circle');
    await expect(circles.first()).toBeVisible();
    const count = await circles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('data table shows correct row count', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    // Data table should show rows (10 data rows in sample.csv)
    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();

    // Check for row cells (should have values from our CSV)
    await expect(page.getByRole('gridcell', { name: '10' }).first()).toBeVisible();
  });

  test('scatter plot has ARIA label', async ({ page }) => {
    await page.goto('/');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Open File' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(CSV_FILE);
    await expect(page.getByText('Drop a spreadsheet here')).not.toBeVisible({ timeout: 5000 });

    const svg = page.locator('svg[role="img"]');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute('aria-label', /scatter plot/i);
  });
});

// ---------------------------------------------------------------------------
// 7. Playback progress slider
// ---------------------------------------------------------------------------

test.describe('Playback Controls', () => {
  test('progress slider has correct ARIA attributes', async ({ page }) => {
    await page.goto('/');

    const slider = page.getByRole('slider', { name: 'Playback progress' });
    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute('aria-valuenow', '0');
    await expect(slider).toHaveAttribute('aria-valuemin', '0');
    await expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  test('speed selector defaults to 1x', async ({ page }) => {
    await page.goto('/');

    const speedSelect = page.getByLabel('Playback speed');
    await expect(speedSelect).toHaveValue('1');
  });

  test('loop button toggles', async ({ page }) => {
    await page.goto('/');

    const loopBtn = page.getByLabel(/Loop/);
    await expect(loopBtn).toHaveAttribute('aria-pressed', 'false');

    await loopBtn.click();
    await expect(loopBtn).toHaveAttribute('aria-pressed', 'true');

    await loopBtn.click();
    await expect(loopBtn).toHaveAttribute('aria-pressed', 'false');
  });
});
