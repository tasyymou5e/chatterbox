import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './switch';
import { Label } from './label';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
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
type Story = StoryObj<typeof Switch>;

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
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const LabelLeft: Story = {
  render: () => (
    <div className="flex items-center justify-between w-[200px]">
      <Label htmlFor="dark-mode">Dark Mode</Label>
      <Switch id="dark-mode" />
    </div>
  ),
};

export const SettingsForm: Story = {
  render: () => (
    <div className="space-y-4 w-[300px]">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="notifications">Notifications</Label>
          <p className="text-xs text-muted-foreground">
            Receive notifications about activity
          </p>
        </div>
        <Switch id="notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="marketing">Marketing emails</Label>
          <p className="text-xs text-muted-foreground">
            Receive emails about new products
          </p>
        </div>
        <Switch id="marketing" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="security">Security alerts</Label>
          <p className="text-xs text-muted-foreground">
            Get notified about security updates
          </p>
        </div>
        <Switch id="security" defaultChecked />
      </div>
    </div>
  ),
};
