import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { X, Check, Star, Bell } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Destructive',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Badge>
        <Check className="mr-1 h-3 w-3" />
        Verified
      </Badge>
      <Badge variant="destructive">
        <X className="mr-1 h-3 w-3" />
        Failed
      </Badge>
      <Badge variant="secondary">
        <Star className="mr-1 h-3 w-3" />
        Featured
      </Badge>
    </div>
  ),
};

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
      <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
      <Badge className="bg-red-500 hover:bg-red-600">Inactive</Badge>
      <Badge className="bg-blue-500 hover:bg-blue-600">Processing</Badge>
      <Badge className="bg-purple-500 hover:bg-purple-600">Beta</Badge>
    </div>
  ),
};

export const Notification: Story = {
  render: () => (
    <div className="relative inline-flex">
      <Bell className="h-6 w-6" />
      <Badge className="absolute -right-2 -top-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
        3
      </Badge>
    </div>
  ),
};

export const Large: Story = {
  render: () => (
    <Badge className="px-4 py-2 text-sm">Large Badge</Badge>
  ),
};
