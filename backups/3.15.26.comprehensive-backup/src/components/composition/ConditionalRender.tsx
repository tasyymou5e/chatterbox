import React, { ReactNode } from 'react';

export interface ConditionalRenderProps {
  condition: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on a boolean condition
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  condition,
  fallback = null,
  children,
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};

export interface ShowProps {
  when: boolean;
  children: ReactNode;
}

/**
 * Simple show/hide component
 */
export const Show: React.FC<ShowProps> = ({ when, children }) => {
  return when ? <>{children}</> : null;
};

export interface HideProps {
  when: boolean;
  children: ReactNode;
}

/**
 * Inverse of Show - hides when condition is true
 */
export const Hide: React.FC<HideProps> = ({ when, children }) => {
  return when ? null : <>{children}</>;
};

export interface SwitchProps {
  value: string | number;
  children: ReactNode;
}

export interface CaseProps {
  value: string | number;
  children: ReactNode;
}

export interface DefaultProps {
  children: ReactNode;
}

/**
 * Switch/Case pattern for multiple conditions
 * Usage:
 * <Switch value={status}>
 *   <Case value="loading">Loading...</Case>
 *   <Case value="error">Error!</Case>
 *   <Default>Content</Default>
 * </Switch>
 */
export const Switch: React.FC<SwitchProps> = ({ value, children }) => {
  let matched: ReactNode = null;
  let defaultCase: ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === Default) {
      defaultCase = child;
    } else if (child.type === Case && child.props.value === value) {
      matched = child;
    }
  });

  return <>{matched || defaultCase}</>;
};

export const Case: React.FC<CaseProps> = ({ children }) => {
  return <>{children}</>;
};

export const Default: React.FC<DefaultProps> = ({ children }) => {
  return <>{children}</>;
};

export default ConditionalRender;
