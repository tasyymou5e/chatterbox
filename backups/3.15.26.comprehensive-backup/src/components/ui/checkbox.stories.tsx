import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './checkbox';
import { Label } from './label';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {},
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div className="items-top flex space-x-2">
      <Checkbox id="terms1" />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor="terms1">Accept terms and conditions</Label>
        <p className="text-sm text-muted-foreground">
          You agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  ),
};

export const CheckboxList: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox id="email-notifications" defaultChecked />
        <Label htmlFor="email-notifications">Email notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="push-notifications" />
        <Label htmlFor="push-notifications">Push notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="sms-notifications" />
        <Label htmlFor="sms-notifications">SMS notifications</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="marketing" disabled />
        <Label htmlFor="marketing" className="opacity-50">
          Marketing emails (Coming soon)
        </Label>
      </div>
    </div>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Checkbox id="parent" checked="indeterminate" />
        <Label htmlFor="parent">Select all</Label>
      </div>
      <div className="ml-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox id="child1" defaultChecked />
          <Label htmlFor="child1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="child2" />
          <Label htmlFor="child2">Option 2</Label>
        </div>
      </div>
    </div>
  ),
};
