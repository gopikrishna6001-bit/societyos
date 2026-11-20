import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Platform from "./Platform.jsx";
import { demoPassword } from "../demoAccounts.js";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn().mockResolvedValue({ error: null }) }));

vi.mock("../lib/supabase.js", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({
        data: { session: null },
        error: { message: "The user aborted a request." },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: (...args) => signOut(...args),
    },
  },
}));

test("a failed saved session opens the sign-in form", async () => {
  render(<MemoryRouter><Platform /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByText(/timed out/i)).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Demo logins" })).toBeInTheDocument();
  expect(screen.getByText(demoPassword)).toBeInTheDocument();
  expect(screen.getByText("resident@demo.sabha.app")).toBeInTheDocument();
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});
