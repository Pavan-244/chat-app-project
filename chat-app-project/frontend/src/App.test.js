import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders app header", () => {
  render(<App />);
  // our app shows a prompt header on the main view
  const headers = screen.getAllByText(/What are you working on\?/i);
  expect(headers.length).toBeGreaterThan(0);
});
