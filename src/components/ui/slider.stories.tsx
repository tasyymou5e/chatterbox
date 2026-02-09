import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';
import { Label } from './label';
import { useState } from 'react';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: { control: 'object' },
    max: { control: 'number' },
    min: { control: 'number' },
    step: { control: 'number' },
    disabled: { control: 'boolean' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Slider>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    step: 1,
    className: 'w-[300px]',
  },
};

export const WithLabel: Story = {
  render: function SliderWithLabel() {
    const [value, setValue] = useState([50]);
    return (
      <div className="w-[300px] space-y-2">
        <div className="flex justify-between">
          <Label>Volume</Label>
          <span className="text-sm text-muted-foreground">{value}%</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
        />
      </div>
    );
  },
};

export const Range: Story = {
  render: function RangeSlider() {
    const [value, setValue] = useState([25, 75]);
    return (
      <div className="w-[300px] space-y-2">
        <div className="flex justify-between">
          <Label>Price Range</Label>
          <span className="text-sm text-muted-foreground">${value[0]} - ${value[1]}</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
        />
      </div>
    );
  },
};

export const Steps: Story = {
  render: function SteppedSlider() {
    const [value, setValue] = useState([50]);
    return (
      <div className="w-[300px] space-y-2">
        <div className="flex justify-between">
          <Label>Quality</Label>
          <span className="text-sm text-muted-foreground">{value}%</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          max={100}
          step={25}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [50],
    max: 100,
    disabled: true,
    className: 'w-[300px]',
  },
};

export const CustomRange: Story = {
  render: function CustomRangeSlider() {
    const [value, setValue] = useState([2020]);
    return (
      <div className="w-[300px] space-y-2">
        <div className="flex justify-between">
          <Label>Year</Label>
          <span className="text-sm text-muted-foreground">{value}</span>
        </div>
        <Slider
          value={value}
          onValueChange={setValue}
          min={2000}
          max={2024}
          step={1}
        />
      </div>
    );
  },
};
