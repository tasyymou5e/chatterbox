import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from './progress';
import { useState, useEffect } from 'react';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: {
    value: 60,
    className: 'w-[300px]',
  },
};

export const Empty: Story = {
  args: {
    value: 0,
    className: 'w-[300px]',
  },
};

export const Complete: Story = {
  args: {
    value: 100,
    className: 'w-[300px]',
  },
};

export const Small: Story = {
  args: {
    value: 45,
    className: 'w-[300px] h-2',
  },
};

export const Large: Story = {
  args: {
    value: 75,
    className: 'w-[300px] h-6',
  },
};

export const Animated: Story = {
  render: function AnimatedProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) return 0;
          return prev + 5;
        });
      }, 200);
      return () => clearInterval(interval);
    }, []);

    return <Progress value={progress} className="w-[300px]" />;
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-[300px] space-y-2">
      <div className="flex justify-between text-sm">
        <span>Uploading...</span>
        <span>66%</span>
      </div>
      <Progress value={66} />
    </div>
  ),
};

export const Steps: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step 1: Account</span>
          <span className="text-green-500">Complete</span>
        </div>
        <Progress value={100} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step 2: Profile</span>
          <span>In Progress</span>
        </div>
        <Progress value={50} />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Step 3: Confirm</span>
          <span className="text-muted-foreground">Pending</span>
        </div>
        <Progress value={0} />
      </div>
    </div>
  ),
};

export const CustomColors: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <Progress value={25} className="[&>div]:bg-red-500" />
      <Progress value={50} className="[&>div]:bg-yellow-500" />
      <Progress value={75} className="[&>div]:bg-blue-500" />
      <Progress value={100} className="[&>div]:bg-green-500" />
    </div>
  ),
};
