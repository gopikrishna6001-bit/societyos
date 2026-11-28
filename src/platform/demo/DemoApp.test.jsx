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
  expect(screen.getByRole("heading", { name: /88\.9% collected/ })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Finance" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Community" })).not.toBeInTheDocument();
  await user.click(screen.getAllByRole("link", { name: "Concerns" })[0]);
  expect(screen.getByRole("heading", { name: "Concerns" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /88\.9% collected/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Security gate access issue/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Disputed late fee/ })).not.toBeInTheDocument();
});

test("a direct finance route renders only finance, and approval stays local", async () => {
  const user = userEvent.setup();
  renderDemo("treasurer@demo.sabha.app", "/finance");
  expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /collected/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Transactions" }));
  await user.click(screen.getByRole("button", { name: /Lift door sensor/ }));
  await user.click(screen.getByRole("button", { name: "Approve in this demo" }));
  expect(screen.getByRole("status")).toHaveTextContent(/ledger was not changed/i);
});

test("home metrics open finance drill-downs", async () => {
  const user = userEvent.setup();
  renderDemo("resident@demo.sabha.app");
  await user.click(screen.getByRole("button", { name: /Outstanding/i }));
  expect(screen.getByRole("heading", { name: "Finance" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "November maintenance" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Maintenance" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByLabelText("Invoice status")).toHaveValue("Due");
});

test("resident can record a demo payment for A-402", async () => {
  const user = userEvent.setup();
  renderDemo("resident@demo.sabha.app", "/finance?tab=Maintenance&status=Due");
  await user.click(screen.getByRole("button", { name: /A-402/ }));
  await user.click(screen.getByRole("button", { name: /Record demo payment for A-402/ }));
  expect(screen.getByRole("status")).toHaveTextContent(/Payment recorded in this demo/i);
});

test("resident can raise a private concern that stays local", async () => {
  const user = userEvent.setup();
  renderDemo("resident@demo.sabha.app", "/concerns");
  await user.click(screen.getByRole("button", { name: "Raise a concern" }));
  await user.type(screen.getByLabelText("Title"), "Water pressure in A-402");
  await user.type(screen.getByLabelText("Description"), "Low pressure after 8pm");
  await user.selectOptions(screen.getByLabelText("Visibility"), "Private");
  await user.click(screen.getByRole("button", { name: "Save on this device" }));
  expect(screen.getByRole("status")).toHaveTextContent(/ticket register/i);
  expect(screen.getByRole("button", { name: /Water pressure in A-402/ })).toBeInTheDocument();
});
