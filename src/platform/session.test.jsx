import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Platform from "./Platform.jsx";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn().mockResolvedValue({ error: null }) }));

vi.mock("../lib/supabase.js", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: "user-1", email: "asha@example.com" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: (...args) => signOut(...args),
    },
    from() {
      const result = { data: [{ community_id: "community-1", role: "resident" }], error: null };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    },
    rpc: (name) => {
      if (name === "my_memberships") {
        return Promise.resolve({
          data: [{ community_id: "community-1", role: "resident", community_name: "Palm Court" }],
          error: null,
        });
      }
      return Promise.resolve({
        data: { funds: [], banks: [], open_public_concerns: 0, recently_resolved: [], upcoming_meetings: [], latest_statement: null, announcements: [], items: [] },
        error: null,
      });
    },
  },
}));

test("signs out from the profile and shows the adaptive home status", async () => {
  const user = userEvent.setup();
  render(<Platform />);
  expect((await screen.findAllByText("Palm Court")).length).toBeGreaterThan(0);
  expect(await screen.findByRole("heading", { name: "Home" })).toBeInTheDocument();
  expect(screen.getByText(/up to date on maintenance/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Payments" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "Help" }).length).toBeGreaterThan(0);
  expect(screen.getByText("More")).toBeInTheDocument();
  expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  expect(screen.queryByText(/ledger/i)).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Profile" })[0]);
  expect(screen.getByText("asha@example.com")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  expect(signOut).toHaveBeenCalledOnce();
});
