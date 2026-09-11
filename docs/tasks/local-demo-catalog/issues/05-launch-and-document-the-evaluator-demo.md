# 05: Launch and document the evaluator demo

**What to build:** Make the prepared demo straightforward to launch and explain for an evaluator: one development command starts both application surfaces, and repository documentation describes the complete clone-to-demo workflow and its deliberate boundaries.

**Blocked by:** 04: Provision and reset the Docker Demo catalog.

**Status:** claimed

**Status for Matt Pocock skills:** ready-for-agent

- [x] `demo-dev` starts the frontend and backend together using the generated demo configuration after setup has completed.
- [x] The development command gives an evaluator a clear local URL and fails with an actionable message when setup prerequisites are absent.
- [x] The README has a concise `Run local demo` guide covering Node and Docker Desktop prerequisites, dependency installation, setup, launch, and explicit reset. The existing setup instructions are clearly labelled as `Developing locally`.
- [x] Documentation identifies the pinned Foundation Foods scope and explains that Demo catalog misses are expected outside that scope.
- [x] Documentation explicitly states that demo mode does not call FoodData Central or send real email, and that no private keys are required.
- [x] Command-level checks cover the supported launch configuration without relying on a developer’s persistent local database.
