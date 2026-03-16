import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './textarea';
import { Label } from './label';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {
    placeholder: 'Type your message here...',
    className: 'w-[300px]',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'This is disabled',
    disabled: true,
    className: 'w-[300px]',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="message">Your message</Label>
      <Textarea placeholder="Type your message here." id="message" />
    </div>
  ),
};

export const WithText: Story = {
  render: () => (
    <div className="grid w-[300px] gap-1.5">
      <Label htmlFor="bio">Bio</Label>
      <Textarea placeholder="Tell us about yourself" id="bio" />
      <p className="text-sm text-muted-foreground">
        Your bio will be displayed publicly.
      </p>
    </div>
  ),
};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: 'This is some default text that has been pre-filled in the textarea.',
    className: 'w-[300px]',
  },
};

export const CustomRows: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div>
        <Label>2 rows</Label>
        <Textarea rows={2} placeholder="2 rows" className="mt-1" />
      </div>
      <div>
        <Label>6 rows</Label>
        <Textarea rows={6} placeholder="6 rows" className="mt-1" />
      </div>
      <div>
        <Label>10 rows</Label>
        <Textarea rows={10} placeholder="10 rows" className="mt-1" />
      </div>
    </div>
  ),
};
