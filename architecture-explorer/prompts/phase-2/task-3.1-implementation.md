# Task 3.1: Basic React App Setup (Implementation)

**Goal:**

Set up the initial file structure and configuration for the React-based frontend application using Vite.

**Instructions:**

1.  **Create `index.html`:** In the `apps/architecture-explorer` directory, create a standard `index.html` file to serve as the entry point for the application. It should include a `<div id="root"></div>` element.
2.  **Create `src` Directory:** Inside `apps/architecture-explorer`, create a `src` directory.
3.  **Create Main Entry Point:** Create `src/main.tsx`. This file should use `ReactDOM.createRoot` to render the main `App` component into the `root` div.
4.  **Create App Component:** Create `src/App.tsx`. For now, this component should just render a simple heading, like `<h1>Architecture Explorer</h1>`.
5.  **Add Vite Configuration:** Create a `vite.config.ts` file in the `apps/architecture-explorer` directory. Configure it with the `@vitejs/plugin-react` plugin.
6.  **Add `tsconfig.json`:** Create a `tsconfig.json` file in the `apps/architecture-explorer` directory with standard settings for a React and Vite project.
