import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function Section({ children, className, style }: Props): JSX.Element {
  return (
    <section
      className={className}
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        padding: "12px 14px",
        ...style,
      }}
    >
      {children}
    </section>
  );
}
