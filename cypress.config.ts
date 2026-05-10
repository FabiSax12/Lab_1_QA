import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    defaultCommandTimeout: 8000,
    baseUrl: "http://localhost:4200",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
