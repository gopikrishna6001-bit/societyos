import { createContext, createElement, useContext } from "react";

const DemoContext = createContext(null);

export function DemoProvider({ value, children }) {
  return createElement(DemoContext.Provider, { value }, children);
}

export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Demo screens render inside the demo shell.");
  return value;
}
