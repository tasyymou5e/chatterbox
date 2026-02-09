import type { Meta, StoryObj } from '@storybook/react';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta: Meta<typeof RadioGroup> = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable" className="space-y-3">
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="default" id="r1" className="mt-1" />
        <div>
          <Label htmlFor="r1" className="font-medium">Default</Label>
          <p className="text-sm text-muted-foreground">
            The default system theme settings.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="comfortable" id="r2" className="mt-1" />
        <div>
          <Label htmlFor="r2" className="font-medium">Comfortable</Label>
          <p className="text-sm text-muted-foreground">
            More padding and larger elements.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-3">
        <RadioGroupItem value="compact" id="r3" className="mt-1" />
        <div>
          <Label htmlFor="r3" className="font-medium">Compact</Label>
          <p className="text-sm text-muted-foreground">
            Smaller elements with less padding.
          </p>
        </div>
      </div>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="medium" className="flex space-x-4">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="small" id="small" />
        <Label htmlFor="small">Small</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="medium" id="medium" />
        <Label htmlFor="medium">Medium</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="large" id="large" />
        <Label htmlFor="large">Large</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one" disabled>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="d1" />
        <Label htmlFor="d1" className="opacity-50">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="d2" />
        <Label htmlFor="d2" className="opacity-50">Option Two</Label>
      </div>
    </RadioGroup>
  ),
};

export const PaymentMethods: Story = {
  render: () => (
    <RadioGroup defaultValue="card" className="space-y-3">
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <RadioGroupItem value="card" id="card" />
        <Label htmlFor="card" className="flex-1 cursor-pointer">
          <div className="font-medium">Credit Card</div>
          <div className="text-sm text-muted-foreground">Pay with Visa, Mastercard, or Amex</div>
        </Label>
      </div>
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <RadioGroupItem value="paypal" id="paypal" />
        <Label htmlFor="paypal" className="flex-1 cursor-pointer">
          <div className="font-medium">PayPal</div>
          <div className="text-sm text-muted-foreground">Pay with your PayPal account</div>
        </Label>
      </div>
      <div className="flex items-center space-x-3 rounded-lg border p-4">
        <RadioGroupItem value="apple" id="apple" />
        <Label htmlFor="apple" className="flex-1 cursor-pointer">
          <div className="font-medium">Apple Pay</div>
          <div className="text-sm text-muted-foreground">Pay with Apple Pay</div>
        </Label>
      </div>
    </RadioGroup>
  ),
};
