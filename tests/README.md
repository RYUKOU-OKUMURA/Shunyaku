# Testing Guide for Shunyaku

This directory contains all automated tests for the Shunyaku application.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests (Playwright)
│   ├── translation-flow.spec.ts    # Main OCR → Translation flow tests
│   ├── performance.spec.ts         # Performance requirement tests
│   └── ui-functionality.spec.ts    # UI interaction and accessibility tests
└── README.md              # This file
```

## Running Tests

### Unit Tests (Vitest)
```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:ui       # UI interface
```

### End-to-End Tests (Playwright)
```bash
npm run test:e2e      # Run all E2E tests
npm run test:e2e:ui   # Run with interactive UI
npm run test:e2e:report  # View test report
```

### All Tests
```bash
npm run test:all      # Run unit tests + E2E tests
```

## Test Categories

### 1. Translation Flow Tests (`translation-flow.spec.ts`)
Tests the complete OCR → Translation pipeline:
- Drag & drop functionality
- Full translation workflow
- Keyboard shortcuts
- History saving
- Settings persistence
- Error handling

### 2. Performance Tests (`performance.spec.ts`)
Validates Phase 3 performance requirements:
- **5-second translation requirement**: Complete OCR → Translation within 5 seconds
- **<5% failure rate**: Success rate measurement across multiple runs
- Large image handling
- Performance consistency across multiple operations
- UI load times

### 3. UI Functionality Tests (`ui-functionality.spec.ts`)
Tests Phase 4 UI features:
- Floating panel interactions (drag, resize, copy, close)
- Settings modal functionality
- Progress indicators
- Toast notifications
- Keyboard navigation
- Responsive design
- Accessibility compliance

## Test Data IDs

The tests rely on `data-testid` attributes in components. Key test IDs:

### Core Application
- `main-app`: Main application container
- `drop-zone`: File drop area
- `floating-panel`: Translation results panel
- `floating-panel-header`: Draggable panel header
- `close-floating-panel`: Panel close button

### Progress & Feedback
- `progress-indicator`: Loading/progress display
- `progress-step`: Individual progress steps
- `toast-container`: Notification container
- `toast-success`, `toast-error`, `toast-warning`, `toast-info`: Toast types

### Settings
- `settings-button`: Settings trigger button
- `settings-modal`: Settings modal
- `settings-tab-general`, `settings-tab-ocr`, `settings-tab-translation`: Setting tabs
- `target-language-select`: Language selection
- `clipboard-monitoring-toggle`: Clipboard monitoring option
- `save-settings`: Save settings button
- `close-settings`: Close settings button

### Results
- `ocr-result`: OCR text output
- `translation-result`: Translation text output
- `copy-translation`: Copy translation button

### History
- `history-button`: History access button
- `history-item`: Individual history entries

### Demo/Development
- `ui-demo-button`: UI components demo trigger
- `demo-container`: Demo components container

## CI/CD Integration

Tests are configured for CI environments:
- Automatic retry on failure (2 retries on CI)
- Single worker on CI to avoid resource conflicts
- HTML reports generated for debugging
- Screenshots on failure
- Trace collection on retry

## Performance Benchmarks

The performance tests validate these specific requirements:
- **Translation speed**: Max 5 seconds for standard images
- **Large image handling**: Max 10 seconds for 2000×1200px images
- **Failure rate**: Less than 5% across 10 consecutive runs
- **UI responsiveness**: Main UI loads within 2 seconds
- **Performance consistency**: Max 2-second deviation between runs

## Debugging Tests

1. **View test results**: `npm run test:e2e:report`
2. **Run with UI**: `npm run test:e2e:ui`
3. **Screenshots**: Automatically captured on failure
4. **Traces**: Available for failed tests with retries
5. **Logs**: Console output captured in test results

## Test Maintenance

When updating UI components:
1. Ensure `data-testid` attributes are preserved
2. Update test expectations for new functionality
3. Run full test suite: `npm run test:all`
4. Update this README if new test categories are added

## Known Limitations

1. **Clipboard testing**: Limited by Playwright's clipboard access
2. **File system**: Tests use temporary files for drag & drop simulation
3. **OCR accuracy**: Tests use minimal test images - may not represent real-world accuracy
4. **Translation API**: Tests may need mock implementations for API rate limiting

## Future Enhancements

- Visual regression testing
- Cross-platform test execution (Windows, Linux)
- Performance regression tracking
- API integration testing with mocks
- Automated accessibility scoring