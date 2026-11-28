import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login.jsx";
import { GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR } from "../lib/authPolicy.js";

const { signInWithPassword } = vi.hoisted(() => ({ signInWithPassword: vi.fn() }));

vi.mock("../lib/supabase.js", () => ({
  supabase: { auth: { signInWithPassword: (...args) => signInWithPassword(...args) } },
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

beforeEach(() => {
  signInWithPassword.mockReset();
});

test("a failed sign-in uses one message for a wrong password and a missing account", async () => {
  signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { message: "Invalid login credentials" } });
  const user = userEvent.setup();
  render(<Login onLogin={() => {}} />);
  await user.type(screen.getByLabelText("Email"), "asha@example.com");
  await user.type(screen.getByLabelText("Password"), "long-enough");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(GENERIC_AUTH_ERROR);
  expect(screen.queryByText(/invalid login credentials/i)).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("••••")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
});

test("a network failure stays specific and releases the button", async () => {
  signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { message: "Failed to fetch" } });
  const user = userEvent.setup();
  render(<Login onLogin={() => {}} />);
  await user.type(screen.getByLabelText("Email"), "asha@example.com");
  await user.type(screen.getByLabelText("Password"), "long-enough");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(NETWORK_AUTH_ERROR);
  expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("a short password is rejected before the server is called", async () => {
  const user = userEvent.setup();
  render(<Login onLogin={() => {}} />);
  await user.type(screen.getByLabelText("Email"), "asha@example.com");
  await user.type(screen.getByLabelText("Password"), "short");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Use at least 8 characters.");
  expect(signInWithPassword).not.toHaveBeenCalled();
});
