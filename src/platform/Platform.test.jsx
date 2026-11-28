import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Platform from "./Platform.jsx";

vi.mock("../lib/supabase.js", () => ({
  isSupabaseConfigured: false,
  supabase: {},
}));

test("asks for configuration and does not show sample money", () => {
  render(<MemoryRouter><Platform /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "SABHA" })).toBeInTheDocument();
  expect(screen.getByText("Clarity in Community.")).toBeInTheDocument();
  expect(screen.queryByText("SocietyOS")).not.toBeInTheDocument();
  expect(screen.getByText(/Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY/)).toBeInTheDocument();
  expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
});
