import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });

  it('applies custom className to Card', () => {
    render(<Card className="custom-class">Content</Card>);
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
  });

  it('renders CardTitle with heading semantics', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Heading Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByRole('heading', { name: /heading title/i })).toBeInTheDocument();
  });
});
