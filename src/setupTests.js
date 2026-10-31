import "@testing-library/jest-dom/vitest";

// jsdom has no canvas: the walking figure (src/landing/walker-canvas.jsx) draws nothing in tests
// instead of logging "not implemented" for every frame.
HTMLCanvasElement.prototype.getContext = () => null;
