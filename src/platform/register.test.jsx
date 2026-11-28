import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Platform from "./Platform.jsx";

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) }));

vi.mock("../lib/supabase.js", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signUp: (...args) => signUp(...args),
    },
  },
}));

test("registers a real account and refuses a demo address", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><Platform /></MemoryRouter>);
  await user.click(await screen.findByRole("button", { name: "Register your society" }));

  await user.type(screen.getByLabelText("Email"), "admin@demo.sabha.app");
  await user.type(screen.getByLabelText("Password"), "a-long-password");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(await screen.findByText("Use your own email address.")).toBeInTheDocument();
  expect(signUp).not.toHaveBeenCalled();

  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), "owner@example.com");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
    email: "owner@example.com",
    options: { emailRedirectTo: window.location.origin },
  }));
  expect(await screen.findByText(/Check your email/)).toBeInTheDocument();
});
