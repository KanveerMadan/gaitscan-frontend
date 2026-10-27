import { render, screen } from "@testing-library/react";
import { QualitySummary } from "./measurements";

const BASE = { steady_walking_s: 7.4, passes: 2, steps_detected: 9, strides: { left: 3, right: 2 }, fps: 30 };

test("parts of the video that couldn't be measured are listed with how long they lasted", () => {
  render(<QualitySummary quality={{ ...BASE, second_person_s: 4.2, heels_hidden_s: 2.0 }} />);
  const card = screen.getByRole("region", { name: /recording quality/i });
  expect(card.textContent).toMatch(/another person in view.*4\.2 s/i);
  expect(card.textContent).toMatch(/heels out of view.*2 s/i);
  expect(card.textContent).toMatch(/not measured/i);
});

test("nothing is listed when every part of the video could be used", () => {
  render(<QualitySummary quality={{ ...BASE, second_person_s: 0, heels_hidden_s: 0 }} />);
  expect(screen.getByRole("region", { name: /recording quality/i }).textContent).not.toMatch(/not measured/i);
});

test("results stored before these fields existed still show", () => {
  render(<QualitySummary quality={BASE} />);
  expect(screen.getByRole("region", { name: /recording quality/i }).textContent).toMatch(/7\.4 s/);
});
