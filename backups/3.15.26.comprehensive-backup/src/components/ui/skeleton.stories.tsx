import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './skeleton';


const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    className: 'w-[200px] h-[20px]',
  },
};

export const Circle: Story = {
  args: {
    className: 'w-12 h-12 rounded-full',
  },
};

export const Card: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};

export const Article: Story = {
  render: () => (
    <div className="space-y-3 w-[300px]">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[180px]" />
      </div>
    </div>
  ),
};

export const Table: Story = {
  render: () => (
    <div className="w-[400px] space-y-2">
      <div className="flex items-center space-x-4 p-2">
        <Skeleton className="h-4 w-[40px]" />
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-4 w-[80px]" />
        <Skeleton className="h-4 w-[60px]" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center space-x-4 p-2">
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-4 w-[60px]" />
        </div>
      ))}
    </div>
  ),
};

export const Profile: Story = {
  render: () => (
    <div className="flex flex-col items-center space-y-4 w-[200px]">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-6 w-[150px]" />
      <Skeleton className="h-4 w-[100px]" />
      <div className="flex space-x-4">
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto" />
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto" />
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
        <div className="text-center">
          <Skeleton className="h-4 w-8 mx-auto" />
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
      </div>
    </div>
  ),
};

export const Comment: Story = {
  render: () => (
    <div className="space-y-4 w-[350px]">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex space-x-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-3 w-[60px]" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  ),
};
