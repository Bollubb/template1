import React from "react";

type Props = { size?: number };

export function IconHome({ size = 22 }: Props) {
  return <span style={{ fontSize: size }}>🏠</span>;
}
export function IconBook({ size = 22 }: Props) {
  return <span style={{ fontSize: size }}>📚</span>;
}
export function IconCards({ size = 22 }: Props) {
  return <span style={{ fontSize: size }}>🃏</span>;
}
export function IconUser({ size = 22 }: Props) {
  return <span style={{ fontSize: size }}>👤</span>;
}
export function IconSearch({ size = 18 }: Props) {
  return <span style={{ fontSize: size }}>🔎</span>;
}
