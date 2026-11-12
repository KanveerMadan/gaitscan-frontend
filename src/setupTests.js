import "@testing-library/jest-dom/vitest";

// jsdom has no canvas: the walking figure (src/landing/walker-canvas.jsx) draws nothing in tests
// instead of logging "not implemented" for every frame.
HTMLCanvasElement.prototype.getContext = () => null;

// An analysis in progress keeps its job id in sessionStorage (src/analysis-job.jsx); a test that ends
// mid-analysis mustn't hand it to the next test.
afterEach(() => sessionStorage.clear());
