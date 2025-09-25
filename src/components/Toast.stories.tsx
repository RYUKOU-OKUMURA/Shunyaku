import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Toast, { ToastContainer, ToastNotification } from './Toast';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['success', 'error', 'warning', 'info'],
    },
    duration: {
      control: { type: 'number', min: 0, max: 10000, step: 500 },
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

const ToastDemo = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: ToastNotification['type']) => {
    const toast: ToastNotification = {
      id: Date.now().toString(),
      type,
      title: getToastTitle(type),
      message: getToastMessage(type),
      duration: 5000,
    };
    setToasts((prev) => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getToastTitle = (type: string) => {
    switch (type) {
      case 'success':
        return 'Translation Complete!';
      case 'error':
        return 'Translation Failed';
      case 'warning':
        return 'API Rate Limit Warning';
      case 'info':
        return 'Processing Image';
      default:
        return 'Notification';
    }
  };

  const getToastMessage = (type: string) => {
    switch (type) {
      case 'success':
        return 'Your text has been successfully translated and saved.';
      case 'error':
        return 'Unable to process the image. Please check the file format and try again.';
      case 'warning':
        return 'You are approaching your DeepL API quota limit for this month.';
      case 'info':
        return 'OCR is currently processing your image. This may take a few seconds.';
      default:
        return 'This is a notification message.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Toast Notifications Demo</h2>
        <p className="text-gray-600 mb-6">
          Click the buttons below to trigger different types of toast notifications.
          Toasts will appear in the top-right corner and auto-dismiss after 5 seconds.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => addToast('success')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            Show Success Toast
          </button>
          <button
            onClick={() => addToast('error')}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Show Error Toast
          </button>
          <button
            onClick={() => addToast('warning')}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
          >
            Show Warning Toast
          </button>
          <button
            onClick={() => addToast('info')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Show Info Toast
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Active Toasts</h3>
          <p className="text-sm text-gray-600">
            Currently showing: {toasts.length} toast(s)
          </p>
          {toasts.length > 0 && (
            <button
              onClick={() => setToasts([])}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Clear All Toasts
            </button>
          )}
        </div>
      </div>

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />
    </div>
  );
};

export const InteractiveDemo: Story = {
  render: ToastDemo,
  args: {
    id: 'demo-toast',
    type: 'success',
    title: 'Demo Toast',
    message: 'This is a demo toast',
    onClose: (id) => console.log('Toast closed:', id),
  },
};

export const SingleToast: Story = {
  args: {
    id: 'demo-toast',
    type: 'success',
    title: 'Translation Complete!',
    message: 'Your text has been successfully translated and saved.',
    duration: 0, // Don't auto-dismiss for demo
    onClose: (id) => console.log('Toast closed:', id),
  },
};

export const ErrorToast: Story = {
  args: {
    id: 'error-toast',
    type: 'error',
    title: 'Translation Failed',
    message: 'Unable to process the image. Please check the file format and try again.',
    duration: 0,
    onClose: (id) => console.log('Toast closed:', id),
  },
};

export const WarningToast: Story = {
  args: {
    id: 'warning-toast',
    type: 'warning',
    title: 'API Rate Limit Warning',
    message: 'You are approaching your DeepL API quota limit for this month.',
    duration: 0,
    onClose: (id) => console.log('Toast closed:', id),
  },
};

export const InfoToast: Story = {
  args: {
    id: 'info-toast',
    type: 'info',
    title: 'Processing Image',
    message: 'OCR is currently processing your image. This may take a few seconds.',
    duration: 0,
    onClose: (id) => console.log('Toast closed:', id),
  },
};

// Toast Container Stories
const ToastContainerDemo = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Translation Complete!',
      message: 'Your text has been successfully translated.',
    },
    {
      id: '2',
      type: 'info',
      title: 'Processing',
      message: 'OCR is analyzing your image.',
    },
    {
      id: '3',
      type: 'warning',
      title: 'Quota Warning',
      message: 'API limit approaching.',
    },
  ]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white rounded-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Toast Container Demo</h2>
        <p className="text-gray-600">
          Multiple toasts stacked in the top-right corner. Each can be dismissed individually.
        </p>
      </div>

      <ToastContainer
        toasts={toasts}
        onRemove={removeToast}
        position="top-right"
      />
    </div>
  );
};

export const MultipleToasts: Story = {
  render: ToastContainerDemo,
  args: {
    id: 'multiple-toasts',
    type: 'info',
    title: 'Multiple Toasts',
    message: 'Demo of multiple toasts',
    onClose: (id) => console.log('Toast closed:', id),
  },
};