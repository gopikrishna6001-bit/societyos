import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoApp } from "./DemoApp.jsx";

test("a resident sees Palm Court's figures and not another flat's private concern", async () => {
  const user = userEvent.setup();
  render(<DemoApp email="resident@demo.sabha.app" onSignOut={() => {}} />);
  expect(screen.getByRole("heading", { name: /88\.9% collected/ })).toBeInTheDocument();
  expect(screen.getAllByText(/Palm Court Residences/).length).toBeGreaterThan(0);
  expect(screen.getByText(/₹4,32,000/)).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Concerns" })[0]);
  expect(screen.getByRole("button", { name: /Security gate access issue/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Disputed late fee/ })).not.toBeInTheDocument();
});

test("a treasurer can open an expense and approve it without a ledger write", async () => {
  const user = userEvent.setup();
  render(<DemoApp email="treasurer@demo.sabha.app" onSignOut={() => {}} />);
  await user.click(screen.getAllByRole("button", { name: "Finance" })[0]);
  await user.click(screen.getByRole("tab", { name: "Transactions" }));
  await user.click(screen.getByRole("button", { name: /Lift door sensor/ }));
  await user.click(screen.getByRole("button", { name: "Approve in this demo" }));
  expect(screen.getByRole("status")).toHaveTextContent(/ledger was not changed/i);
});
