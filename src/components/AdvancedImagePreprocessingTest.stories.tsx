import type { Meta, StoryObj } from '@storybook/react';
import AdvancedImagePreprocessingTest from './AdvancedImagePreprocessingTest';

const meta: Meta<typeof AdvancedImagePreprocessingTest> = {
  title: 'Phase5-1/AdvancedImagePreprocessingTest',
  component: AdvancedImagePreprocessingTest,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Advanced Image Preprocessing Test (Phase 5-1)

This component provides a comprehensive testing interface for the new advanced image preprocessing features implemented in Phase 5-1:

### Features Implemented:
1. **Contrast Enhancement** - Adjustable contrast factor (0.5x - 3.0x)
2. **Noise Reduction** - Light/Medium/Strong denoising with median filtering
3. **Sharpening** - Unsharp mask with adjustable strength (0.0 - 2.0)
4. **Gamma Correction** - Brightness adjustment (0.5 - 3.0)
5. **Adaptive Binarization** - Improved OCR text recognition

### Usage:
- Upload any image file (PNG, JPG, PDF supported)
- Adjust preprocessing parameters using the control panel
- View original vs processed image comparison
- Monitor processing time and applied settings

### Technical Implementation:
- Canvas API-based image processing
- Real-time parameter adjustment
- Memory-efficient processing pipeline
- Integrates with existing OCR service

This tool helps validate OCR improvements and allows fine-tuning of preprocessing parameters for different image types.
        `
      }
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default view with standard preprocessing settings. Upload an image to test the advanced preprocessing pipeline.'
      }
    }
  }
};

export const ContrastEnhancementDemo: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Demonstration focusing on contrast enhancement capabilities. Useful for low-contrast documents and scanned images.'
      }
    }
  }
};

export const NoiseReductionDemo: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Showcase of noise reduction features with different strength levels. Ideal for noisy scans and poor-quality images.'
      }
    }
  }
};

export const SharpeningDemo: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Sharpening feature demonstration for improving text clarity and edge definition.'
      }
    }
  }
};

export const GammaCorrectionDemo: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Gamma correction for brightness adjustment, particularly useful for over/under-exposed images.'
      }
    }
  }
};