import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DemoApp } from "./DemoApp.jsx";

function renderDemo(email, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DemoApp email={email} onSignOut={() => {}} />
    </MemoryRouter>,
  );
}

test("home is the only screen rendered, and navigation replaces it", async () => {
  const user = userEvent.setup();
  renderDemo("resident@demo.sabha.app");
  expect(screen.getByRole("heading", { name: /Hi / })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Pay maintenance" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Bills & accounts" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Community" })).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("link", { name: "Complaints" })[0]);
  expect(screen.getByRole("heading", { name: "Complaints" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Hi / })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Security gate access issue/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Disputed late fee/ })).not.toBeInTheDocument();
});

test("a direct finance route renders only finance, and approval stays local", async () => {
  const user = userEvent.setup();
  renderDemo("treasurer@demo.sabha.app", "/finance");
  expect(screen.getByRole("heading", { name: "Bills & accounts" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Hi / })).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Transactions" }));
  await user.click(screen.getByRole("button", { name: /Lift door sensor/ }));
  await user.click(screen.getByRole("button", { name: "Approve in this demo" }));
  expect(screen.getByRole("status")).toHaveTextContent(/ledger was not changed/i);
});
