import { render, screen } from "@testing-library/react";
import Platform from "./Platform.jsx";

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
  render(<Platform />);
  expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByText(/timed out/i)).not.toBeInTheDocument();
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
});
