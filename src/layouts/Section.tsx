import React from "react";

export type SectionProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * A React component that renders a section element.
 */
export default function Section({ className, children }: SectionProps): JSX.Element {
  return <section className={className}>{children}</section>;
}
