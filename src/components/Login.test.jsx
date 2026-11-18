import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login.jsx";
import { callAuth } from "../lib/authApi.js";

vi.mock("../lib/authApi.js", () => ({ callAuth: vi.fn() }));
vi.mock("../lib/supabase.js", () => ({
  SOCIETY_ID: "society",
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: "missing" } }) }) }) }),
    auth: { setSession: vi.fn() },
  },
}));

async function enterPhone(user, phone) {
  render(<Login onLogin={() => {}} />);
  await user.type(screen.getByPlaceholderText("9XXXXXXXXX"), phone);
  await user.click(screen.getByRole("button", { name: "Continue →" }));
}

test("rejects a short phone number and does not call the server", async () => {
  const user = userEvent.setup();
  await enterPhone(user, "123");
  expect(screen.getByText("Enter a valid 10-digit phone number")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue →" })).toBeEnabled();
  expect(callAuth).not.toHaveBeenCalled();
});

test("shows a network failure and releases the button", async () => {
  callAuth.mockResolvedValueOnce({ error: "Could not reach the server. Check your connection and try again." });
  const user = userEvent.setup();
  await enterPhone(user, "9876543210");
  expect(screen.getByText("Could not reach the server. Check your connection and try again.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue →" })).toBeEnabled();
});

test("shows a timeout and releases the button", async () => {
  callAuth.mockResolvedValueOnce({ error: "The server took too long to respond. Try again." });
  const user = userEvent.setup();
  await enterPhone(user, "9876543210");
  expect(screen.getByText("The server took too long to respond. Try again.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Checking…" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Continue →" })).toBeEnabled();
});

test("moves to the PIN step after a resident is found", async () => {
  callAuth.mockResolvedValueOnce({ resident: { id: "1", name: "Asha Rao", flat_number: "101" } });
  const user = userEvent.setup();
  await enterPhone(user, "9876543210");
  expect(screen.getByText("Asha Rao")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Login →" })).toBeDisabled();
});

test("shows an invalid PIN and releases the button", async () => {
  callAuth.mockImplementation(async (body) => {
    if (body.action === "lookup") return { resident: { id: "1", name: "Asha Rao", flat_number: "101" } };
    return { error: "Invalid PIN" };
  });
  const user = userEvent.setup();
  await enterPhone(user, "9876543210");
  await user.type(screen.getByPlaceholderText("••••"), "0000");
  await user.click(screen.getByRole("button", { name: "Login →" }));
  expect(await screen.findByText("Invalid PIN")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Verifying…" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Login →" })).toBeDisabled();
});
