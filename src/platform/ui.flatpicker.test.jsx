import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlatPicker } from "./ui.jsx";

const { from } = vi.hoisted(() => {
  const units = [
    { id: "u1", number: "101", block: "A" },
    { id: "u2", number: "102", block: "A" },
    { id: "u3", number: "201", block: "B" },
  ];
  return {
    from: vi.fn((table) => {
      const result = table === "units"
        ? { data: units, error: null }
        : {
          data: [{ unit_id: "u1", relationship: "owner", units: units[0] }],
          error: null,
        };
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        order: () => query,
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      };
      return query;
    }),
  };
});

vi.mock("./api.js", async () => {
  const actual = await vi.importActual("./api.js");
  return {
    ...actual,
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }),
      },
      from: (...args) => from(...args),
    },
    rows: async (query) => {
      const result = await query;
      return result?.data || [];
    },
  };
});

test("resident sees only linked flats as a dropdown", async () => {
  render(<FlatPicker communityId="c1" roles={["resident"]} name="unit" required />);
  const select = await screen.findByRole("combobox");
  expect(select).toHaveDisplayValue("A-101");
  expect(screen.queryByPlaceholderText(/search flat/i)).not.toBeInTheDocument();
});

test("admin can search society flats instead of typing freely", async () => {
  const user = userEvent.setup();
  render(<FlatPicker communityId="c1" roles={["committee_admin"]} name="unit" required />);
  const search = await screen.findByPlaceholderText(/search flat/i);
  await user.type(search, "B-201");
  await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent(/B-201/));
  expect(screen.queryByRole("textbox", { name: /flat number/i })).not.toBeInTheDocument();
});
