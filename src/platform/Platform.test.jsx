import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Platform from "./Platform.jsx";

vi.mock("../lib/supabase.js", () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

test("asks for configuration and does not show sample money", () => {
  render(<MemoryRouter><Platform /></MemoryRouter>);
  expect(screen.getByText("Every Rupee. Every Decision. Every Concern.")).toBeInTheDocument();
  expect(screen.getByText(/Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/)).toBeInTheDocument();
  expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
});
