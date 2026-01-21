# Storybook Guide

> **Last Updated:** 2026-01-21  
> **Storybook Version:** 8.x  
> **Location:** `.storybook/`, `src/components/ui/*.stories.tsx`

## Overview

This guide documents the Storybook setup for the Chatterbox platform, including configuration, component stories, and best practices for visual component documentation.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Available Stories](#available-stories)
4. [Writing Stories](#writing-stories)
5. [Best Practices](#best-practices)
6. [Integration with Design System](#integration-with-design-system)

---

## Getting Started

### Running Storybook

```bash
# Start Storybook development server
npm run storybook

# Build static Storybook
npm run build-storybook
```

### Default URL

Storybook runs at: `http://localhost:6006`

---

## Configuration

### Main Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-onboarding',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

export default config;
```

### Preview Configuration

```typescript
// .storybook/preview.tsx
import type { Preview } from '@storybook/react';
import '../src/index.css'; // Import global styles

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(var(--background))' },
        { name: 'dark', value: 'hsl(222.2 84% 4.9%)' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

---

## Available Stories

### UI Components

#### Button Stories

**File:** `src/components/ui/button.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <PlusIcon className="mr-2 h-4 w-4" />
        Add Item
      </>
    ),
  },
};

export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </>
    ),
  },
};
```

**Available Variants:**
- `default` - Primary button style
- `destructive` - Red/danger style
- `outline` - Border only
- `secondary` - Muted style
- `ghost` - Transparent background
- `link` - Link-like appearance

**Available Sizes:**
- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon-only square button

---

#### Card Stories

**File:** `src/components/ui/card.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with some sample text.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <p>Simple card with just content.</p>
    </Card>
  ),
};

export const WithForm: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Submit</Button>
      </CardFooter>
    </Card>
  ),
};
```

---

## Writing Stories

### Story Structure (CSF3)

```typescript
// ComponentName.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

// Meta configuration
const meta: Meta<typeof ComponentName> = {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered', // 'centered' | 'fullscreen' | 'padded'
  },
  tags: ['autodocs'], // Enable auto-generated docs
  argTypes: {
    // Control configuration
    propName: {
      control: 'text', // 'text' | 'number' | 'boolean' | 'select' | 'radio'
      description: 'Description of prop',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Individual stories
export const Default: Story = {
  args: {
    // Default prop values
  },
};

export const Variant: Story = {
  args: {
    variant: 'secondary',
  },
};

// Complex stories with render function
export const Complex: Story = {
  render: (args) => (
    <div className="space-y-4">
      <ComponentName {...args} />
      <ComponentName {...args} variant="secondary" />
    </div>
  ),
  args: {
    // Base args
  },
};

// Stories with actions
export const WithActions: Story = {
  args: {
    onClick: fn(), // from @storybook/test
  },
};
```

### Story Categories

Organize stories by category:

```
UI/           - Base UI components (Button, Card, Input)
Forms/        - Form components (Form, Select, Checkbox)
Layout/       - Layout components (Sidebar, Header)
Data/         - Data display (Table, Charts)
Feedback/     - Feedback (Toast, Alert, Dialog)
Navigation/   - Navigation (Menu, Tabs, Breadcrumb)
```

---

## Best Practices

### 1. Document All Variants

```typescript
// Show all button variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
```

### 2. Show Interactive States

```typescript
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button className="hover:bg-primary/90">Hover (demo)</Button>
    </div>
  ),
};
```

### 3. Test Accessibility

```typescript
export const AccessibilityTest: Story = {
  args: {
    'aria-label': 'Submit form',
    children: <CheckIcon className="h-4 w-4" />,
    size: 'icon',
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
};
```

### 4. Use Decorators for Context

```typescript
// For components requiring providers
export const WithProvider: Story = {
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};
```

### 5. Document Props with ArgTypes

```typescript
const meta: Meta<typeof Button> = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Visual style variant',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable interaction',
    },
    asChild: {
      control: 'boolean',
      description: 'Render as child element (Slot)',
    },
  },
};
```

---

## Integration with Design System

### Using Design Tokens

Stories should use design tokens from the design system:

```typescript
// ✅ Good: Use semantic tokens
<Card className="bg-card text-card-foreground border-border">

// ❌ Bad: Use hardcoded colors
<Card className="bg-white text-black border-gray-200">
```

### Theming Support

Preview configuration supports theme switching:

```typescript
// .storybook/preview.tsx
import { ThemeProvider } from 'next-themes';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system">
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'hsl(var(--background))' },
        { name: 'dark', value: 'hsl(222.2 84% 4.9%)' },
      ],
    },
  },
};
```

### Component Documentation

Each story should include:
1. **Title** - Clear component name
2. **Description** - What the component does
3. **Props** - All available props documented
4. **Variants** - All visual variants shown
5. **States** - Interactive states (hover, focus, disabled)
6. **Examples** - Real-world usage examples

---

## Future Stories to Add

### Priority Components

| Component | Category | Status |
|-----------|----------|--------|
| Input | UI/Forms | TODO |
| Select | UI/Forms | TODO |
| Dialog | UI/Feedback | TODO |
| Alert | UI/Feedback | TODO |
| Toast | UI/Feedback | TODO |
| Table | UI/Data | TODO |
| Tabs | UI/Navigation | TODO |
| Sidebar | UI/Layout | TODO |

### Feature Components

| Component | Category | Status |
|-----------|----------|--------|
| ChoreCard | Features/Chores | TODO |
| GameCard | Features/Games | TODO |
| ProgressBar | Features/Progress | TODO |
| AchievementBadge | Features/Gamification | TODO |

---

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Component Story Format (CSF)](https://storybook.js.org/docs/api/csf)
- [Storybook for React](https://storybook.js.org/docs/react)
- [Chromatic Visual Testing](https://www.chromatic.com/)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
