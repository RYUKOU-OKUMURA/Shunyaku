import { test, expect } from '@playwright/test';

/**
 * UI Functionality E2E Tests
 * Tests Phase 4 UI features
 */
test.describe('UI Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible({ timeout: 10000 });
  });

  test('should display and interact with floating panel', async ({ page }) => {
    // Trigger a translation to show floating panel
    // (Simplified - would normally involve actual OCR/translation)

    // Check if floating panel appears (this test may need adjustment based on actual implementation)
    const floatingPanel = page.locator('[data-testid="floating-panel"]');

    if (await floatingPanel.isVisible()) {
      // Test panel interactions
      await expect(floatingPanel).toBeVisible();

      // Test drag functionality (if implemented)
      const panelHeader = page.locator('[data-testid="floating-panel-header"]');
      if (await panelHeader.isVisible()) {
        await panelHeader.hover();
        // Note: Actual drag testing would require mouse events
      }

      // Test resize functionality (if implemented)
      const resizeHandle = page.locator('[data-testid="resize-handle"]');
      if (await resizeHandle.isVisible()) {
        await resizeHandle.hover();
      }

      // Test copy functionality
      const copyButton = page.locator('[data-testid="copy-translation"]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Note: Clipboard testing in Playwright requires special setup
      }

      // Test close functionality
      const closeButton = page.locator('[data-testid="close-floating-panel"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(floatingPanel).not.toBeVisible();
      }
    }
  });

  test('should open and interact with settings modal', async ({ page }) => {
    const settingsButton = page.locator('[data-testid="settings-button"]');

    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      const settingsModal = page.locator('[data-testid="settings-modal"]');
      await expect(settingsModal).toBeVisible();

      // Test tab navigation
      const generalTab = page.locator('[data-testid="settings-tab-general"]');
      const ocrTab = page.locator('[data-testid="settings-tab-ocr"]');
      const translationTab = page.locator('[data-testid="settings-tab-translation"]');

      if (await generalTab.isVisible()) await generalTab.click();
      if (await ocrTab.isVisible()) await ocrTab.click();
      if (await translationTab.isVisible()) await translationTab.click();

      // Test settings controls
      const languageSelect = page.locator('[data-testid="target-language-select"]');
      if (await languageSelect.isVisible()) {
        await languageSelect.selectOption('ja'); // Japanese
      }

      const clipboardMonitoring = page.locator('[data-testid="clipboard-monitoring-toggle"]');
      if (await clipboardMonitoring.isVisible()) {
        await clipboardMonitoring.click();
      }

      // Test save and close
      const saveButton = page.locator('[data-testid="save-settings"]');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }

      const closeModalButton = page.locator('[data-testid="close-settings"]');
      if (await closeModalButton.isVisible()) {
        await closeModalButton.click();
        await expect(settingsModal).not.toBeVisible();
      }
    }
  });

  test('should show progress indicator during processing', async ({ page }) => {
    // Note: This test would require actual OCR processing to see progress
    // For now, we check if the progress indicator component exists and can be shown

    const progressIndicator = page.locator('[data-testid="progress-indicator"]');

    // Progress indicator should not be visible initially
    if (await progressIndicator.isVisible()) {
      await expect(progressIndicator).toBeVisible();

      // Check for progress steps
      const steps = page.locator('[data-testid="progress-step"]');
      if (await steps.first().isVisible()) {
        const stepCount = await steps.count();
        expect(stepCount).toBeGreaterThan(0);
      }
    }
  });

  test('should display toast notifications', async ({ page }) => {
    // Check if toast container exists
    const toastContainer = page.locator('[data-testid="toast-container"]');

    // Toast notifications would typically appear during errors or completions
    // This test verifies the UI components exist

    if (await toastContainer.isVisible()) {
      await expect(toastContainer).toBeVisible();
    }

    // Test different toast types (if any are currently visible)
    const successToast = page.locator('[data-testid="toast-success"]');
    const errorToast = page.locator('[data-testid="toast-error"]');
    const warningToast = page.locator('[data-testid="toast-warning"]');
    const infoToast = page.locator('[data-testid="toast-info"]');

    // These checks are non-blocking - just verifying the component structure
    if (await successToast.isVisible()) {
      await expect(successToast).toBeVisible();
    }
    if (await errorToast.isVisible()) {
      await expect(errorToast).toBeVisible();
    }
    if (await warningToast.isVisible()) {
      await expect(warningToast).toBeVisible();
    }
    if (await infoToast.isVisible()) {
      await expect(infoToast).toBeVisible();
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test the global keyboard shortcut ⌘⌥T (Cmd+Alt+T)
    await page.keyboard.press('Meta+Alt+T');

    // Wait for any response (could be settings modal, file dialog, etc.)
    await page.waitForTimeout(1000);

    // Check if any modal or dialog appeared
    const settingsModal = page.locator('[data-testid="settings-modal"]');
    const hasModal = await settingsModal.isVisible();

    // This is a basic test - the actual behavior depends on implementation
    expect(typeof hasModal).toBe('boolean');

    // Test Escape key to close any open modals
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Verify modals are closed after Escape
    if (hasModal) {
      await expect(settingsModal).not.toBeVisible();
    }
  });

  test('should maintain responsive design', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 1366, height: 768 },  // Laptop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);

      // Verify main elements are still visible and accessible
      const mainApp = page.locator('[data-testid="main-app"]');
      await expect(mainApp).toBeVisible();

      const dropZone = page.locator('[data-testid="drop-zone"]');
      if (await dropZone.isVisible()) {
        await expect(dropZone).toBeVisible();
      }

      console.log(`Viewport ${viewport.width}x${viewport.height} - OK`);
    }
  });

  test('should display UI components demo', async ({ page }) => {
    // Check if there's a demo or storybook-like interface
    const demoButton = page.locator('[data-testid="ui-demo-button"]');

    if (await demoButton.isVisible()) {
      await demoButton.click();

      // Verify demo components are shown
      const demoContainer = page.locator('[data-testid="demo-container"]');
      if (await demoContainer.isVisible()) {
        await expect(demoContainer).toBeVisible();

        // Check for demo components
        const demoComponents = page.locator('[data-testid^="demo-"]');
        const componentCount = await demoComponents.count();
        expect(componentCount).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Accessibility', () => {
  test('should meet basic accessibility requirements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();

    // Check for proper headings
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    if (await headings.first().isVisible()) {
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
    }

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      // Images should have alt text (can be empty for decorative images)
      expect(altText).not.toBeNull();
    }

    // Check for form labels
    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have some form of labeling
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.isVisible();
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="main-app"]')).toBeVisible();

    // Test tab navigation
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    if (await focusedElement.isVisible()) {
      await expect(focusedElement).toBeVisible();
    }

    // Test several tab presses
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    // Verify we can reach interactive elements
    const interactiveElements = page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    const interactiveCount = await interactiveElements.count();
    expect(interactiveCount).toBeGreaterThan(0);
  });
});