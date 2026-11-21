import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SaveForm, Field, control } from "./ui.jsx";

function Harness() {
  const [items, setItems] = useState(["seed"]);
  return (
    <div>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      <SaveForm
        submitLabel="Save item"
        onSubmit={async (data) => {
          await Promise.resolve();
          // Re-render while SaveForm is still finishing — previously nullled event.currentTarget.
          setItems((current) => [...current, data.name]);
        }}
      >
        <Field label="Name"><input className={control} name="name" defaultValue="meeting" required /></Field>
      </SaveForm>
    </div>
  );
}

test("SaveForm survives a parent reload after a successful save", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole("button", { name: "Save item" }));
  expect(await screen.findByText("Saved.")).toBeInTheDocument();
  expect(screen.getByText("meeting")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
