# Kuhn – The first cognitive OS for agents

> “There are only two hard things in Computer Science: cache invalidation and naming things.”  
>
> Kuhn is what happens after you finally name the world you’ve been building.

Kuhn is a **cognitive operating system for agents**.

Instead of treating agents as “some prompts plus glue code around an LLM”, Kuhn gives them a **real environment to live in**:

- **History** to remember what happened  
- **WorkingMemory** to track what’s true *right now*  
- **Capabilities** to know what they can do  
- **Mind** to define who they are  
- **Agent** processes to pursue goals  
- **Cortex** and **Rules** to supervise and constrain them  

…and 5 more primitives that complete the world.

Kuhn is *not* “yet another agent framework”.  
It behaves like an **Operating System**:

- The **OS (Kuhn)** orchestrates, supervises, and persists.  
- Your **Agents, Minds, Skills, and Tools** run *inside* it.

---

## Table of Contents

1. [Why Kuhn?](#why-kuhn)  
2. [Kuhn in One Paragraph](#kuhn-in-one-paragraph)  
3. [The 12 Primitives](#the-12-primitives)  
4. [Framework vs OS: Inversion of Control](#framework-vs-os-inversion-of-control)  
5. [Kernel vs User Space](#kernel-vs-user-space)  
6. [Effect & TypeScript Reference Architecture](#effect--typescript-reference-architecture)  
7. [Next.js as Terminal, Kuhn as Server](#nextjs-as-terminal-kuhn-as-server)  
8. [How It All Fits Together](#how-it-all-fits-together)  
9. [A Senior Engineer’s Perspective](#a-senior-engineers-perspective)  
10. [Design Principles](#design-principles)  
11. [Getting Started (Conceptual)](#getting-started-conceptual)  
12. [Status](#status)  
13. [Influences](#influences)  
14. [Contributing](#contributing)  
15. [License](#license)

---

## Why Kuhn?

Most “agent frameworks” today look like this:

- A set of **helpers** around an LLM API.
- A bunch of **state** stuffed into arbitrary objects.
- A lot of **glue code** deciding:
  - where to log things,
  - how to pass context,
  - how to call tools,
  - how to stitch everything together.

You end up with:

- A giant “Agent” class that tries to be:
  - the persona,
  - the runtime process,
  - the state container,
  - and the orchestrator.

Kuhn’s premise:

> Serious agents need **architecture**, not just prompts and glue.

So Kuhn gives you:

- A **vocabulary** (12 primitives) for how agents *think, remember, act, and coordinate*.  
- An **OS-style runtime** that runs your agents as processes inside a cognitive environment.

---

## Kuhn in One Paragraph

**Kuhn** is a cognitive runtime built on **12 primitives**:

- **History** – immutable ledger of what happened  
- **WorkingMemory** – mutable, structured state of what’s true *now*  
- **Identity** – principal: who is acting  
- **Capabilities** – catalog of what can be done  
- **Cortex** – supervisor that schedules & manages agents  
- **Rules** – guardrails & constraints on behavior  
- **Model** – thinking engine (LLMs / ML models)  
- **Tool** – actions on the world (side effects, IO)  
- **Skill** – reusable knowledge and logic  
- **Episode** – bounded experience / run  
- **Mind** – self: persona + long-term memory  
- **Agent** – drive: goal-directed process

The LLM is not “the agent”. It’s one part of **Model**.  
The **Agent** is a process. The **Mind** is its self.  
**Kuhn is the OS** that runs them.

---

## The 12 Primitives

The world of Kuhn is made from 12 named pieces. Every design question becomes:

> “Which primitive does this belong to?”

### 1. History (Immutable Ledger)

> **What happened.**

- Append-only event log of everything worth remembering.
- Authoritative source for:
  - audit & compliance,
  - debugging,
  - replay & simulation,
  - analytics.
- Optimized for **writes** and **sequential reads**.
- State can be rebuilt from History; History is never rebuilt from state.

---

### 2. WorkingMemory (Mutable State)

> **What’s true *right now*.**

- Structured, queryable state derived from History.
- Optimized for:
  - “What’s the current situation?”
  - “What’s the status of this Episode/Agent?”
- Implemented as **projections / materialized views**.

Think: *world model / current context*, not full history.

---

### 3. Identity (Principal)

> **Who is acting (or being acted on).**

- Principals:
  - users,
  - organizations,
  - external services,
  - agents.
- Provides:
  - authentication,
  - attribution (“who did this?”),
  - input to authorization.

---

### 4. Capabilities (Catalog)

> **What can be done.**

- Catalog of the system’s:
  - Models,
  - Tools,
  - Skills,
  - Minds,
  - Agents.
- Holds metadata:
  - name, version,
  - owner,
  - interface,
  - associated Rules.

---

### 5. Cortex (Supervisor)

> **Who’s in charge.**

- System-level **supervisor / scheduler**.
- Responsibilities:
  - start / stop Agents,
  - supervise failures,
  - enforce time/budget limits,
  - apply scheduling policies.
- Think: **cognitive kernel** control plane.

---

### 6. Rules (Guardrails)

> **What’s allowed.**

- Constraints applied to:
  - actions,
  - resource usage,
  - Tool / Model access,
  - state mutations.
- Evaluated for every significant decision:
  - “Can I append this event?”
  - “Can I call this Tool?”
  - “Can I start this Agent?”

Think: *policy engine / firewall / safety harness*.

---

### 7. Model (Thinking)

> **How the system thinks.**

- Unified interface to one or more:
  - LLMs (GPT-x, Claude-x, Llama-x, etc.),
  - other ML models.
- Handles:
  - prompting conventions,
  - sampling params,
  - provider routing and fallbacks.

Think: **cognitive HAL** (hardware abstraction layer).

---

### 8. Tool (Action)

> **How the system acts on the world.**

- Side effects:
  - HTTP APIs,
  - databases & queues,
  - file systems,
  - internal services.
- Always observed via:
  - History (for audit),
  - Rules (for safety).

Think: **syscalls / IO / effectful operations**.

---

### 9. Skill (Knowledge)

> **Reusable know-how.**

- Compositions of:
  - Model calls,
  - Tool invocations,
  - domain logic.
- Encapsulated procedures like:
  - “Review a pull request.”
  - “Summarize a customer thread.”
  - “Draft a release note.”

Think: **library of SOPs (standard operating procedures)**.

---

### 10. Episode (Experience)

> **A bounded run.**

- A **sandboxed process container** with:
  - its own budget (tokens, money, time),
  - its own scope (what it can see and touch),
  - its own identity context.
- Ties together:
  - Identity,
  - Mind,
  - Agents,
  - History / WorkingMemory for that story.

Think: **job / container / structured session**.

---

### 11. Mind (Self)

> **Persona + long-term memory.**

- Encapsulates:
  - style & tone,
  - preferences,
  - long-lived memories.
- Many Agents can share one Mind:
  - e.g., a “Senior Engineer” Mind used across multiple episodes.

Think: **persistent self**.

---

### 12. Agent (Drive)

> **Goal-directed process.**

- A running process that:
  - has a goal,
  - is bound to a Mind,
  - has access to Capabilities,
  - operates within an Episode.
- Executes:
  - Skills,
  - Model thinking,
  - Tool calls,
  - all under Rules and Cortex.

Think: **orchestrated, long-running cognitive process**.

---

## Framework vs OS: Inversion of Control

Most agent “frameworks”:

- Are **libraries** your code calls.
- You orchestrate the loop:
  - call LLM,
  - update state,
  - call tools,
  - log stuff.

Kuhn flips that:

> **Kuhn is the runtime / OS. Your code runs *inside* it.**

- You define:
  - Minds,
  - Agents,
  - Skills,
  - Tools,
  - Rules.
- You register them with **Capabilities**.
- Kuhn:
  - boots Episodes,
  - schedules Agents via Cortex,
  - enforces Rules,
  - manages History and WorkingMemory.

**Framework** → “I call you.”  
**OS** → “You call me.”

Kuhn is deliberately on the **OS** side of that line.

---

## Kernel vs User Space

Think in OS terms:

- **Kernel space** → Kuhn’s core runtime.  
- **User space** → your Minds, Agents, Skills, Tools, and Rule sets.

### Kernel vs User Space Table

| Primitive        | Layer            | Owns Core Behavior        | How You Extend It                                      |
|------------------|------------------|---------------------------|--------------------------------------------------------|
| **History**      | Kernel           | Kuhn runtime              | Configure backend, retention; define event schemas     |
| **WorkingMemory**| Kernel           | Kuhn runtime              | Define projections & queries                           |
| **Identity**     | Kernel           | Kuhn runtime              | Plug auth providers; extend principal metadata         |
| **Capabilities** | Kernel + User    | Kernel owns registry infra| Register Models, Tools, Skills, Minds, Agents          |
| **Cortex**       | Kernel           | Kuhn runtime              | Configure scheduling & supervision policies            |
| **Rules**        | Kernel + User    | Kernel owns enforcement   | Define rule sets & policies                            |
| **Model**        | Kernel + User    | Kernel owns API           | Plug in concrete model drivers                         |
| **Tool**         | User on Kernel   | You                       | Implement side effects; kernel wraps with Rules+History|
| **Skill**        | User             | You                       | Compose Models + Tools into reusable logic             |
| **Episode**      | Kernel           | Kuhn runtime              | Define Episode types (scopes, budgets, entry points)   |
| **Mind**         | User (stored by kernel)| You                | Define personas & memory strategies                    |
| **Agent**        | User (scheduled by kernel)| You             | Implement workflows that depend on kernel services     |

**User-space code never mutates the kernel directly**.  
Agents make **syscalls** into Kuhn’s primitives.

---

## Effect & TypeScript Reference Architecture

Kuhn’s OS model maps *naturally* onto **Effect** (TypeScript effect system):

- **Kernel** → a composition of `Layer`s (services).  
- **User space** → Effect programs that consume those services via tags.

### 1. Kernel: service definitions & “syscall headers”

Kernel primitives become **services**. Syscalls are just “getting a service from context and calling it”.

```ts
import { Context, Effect, Layer } from "effect";

// --- KERNEL HEADERS (Interfaces) ---

// 1. History (The Ledger)
interface History {
  readonly append: (event: any) => Effect.Effect<void>;
}

export class HistoryService extends Context.Tag("Kuhn/History")<
  HistoryService,
  History
>() {}

// 2. Model (HAL - Hardware Abstraction Layer)
interface Model {
  readonly infer: (prompt: string) => Effect.Effect<string>;
}

export class ModelService extends Context.Tag("Kuhn/Model")<
  ModelService,
  Model
>() {}

// 3. Rules (Kernel Firewall)
interface RuleEngine {
  readonly authorize: (action: string, params: any) => Effect.Effect<void>;
}

export class RuleService extends Context.Tag("Kuhn/Rules")<
  RuleService,
  RuleEngine
>() {}
```

Here:

- The interfaces define the syscall API.
- `Context.Tag` defines the service identity.
- Concrete drivers (e.g., PostgresHistory, OpenAIModel) implement these services and are wired in via `Layer`.

### 2. User Space: an Agent as an Effect program

User-space code doesn’t know how history is stored or which model runs. It just asks for the services.

```ts
// --- USER SPACE (Agent Program) ---

// A Reviewer Agent as an Effect workflow that depends on Kernel services
const ReviewerAgent = (prId: string) =>
  Effect.gen(function* (_) {
    // Syscalls: request kernel services
    const model   = yield* _(ModelService);
    const history = yield* _(HistoryService);
    const rules   = yield* _(RuleService);

    // 1. Ask Rules if we’re allowed to start
    yield* rules.authorize("agent.start", { type: "reviewer", prId });

    // 2. Log intent
    yield* history.append({ type: "AGENT_START", prId });

    // 3. Think (Model.HAL decides which LLM to call, retries, etc.)
    const review = yield* model.infer(`Review PR ${prId} for quality, style, and safety.`);

    // 4. Log result
    yield* history.append({ type: "AGENT_COMPLETE", prId, review });

    return review;
  });
```

This is the ideal shape of user-space code:

- It’s purely about logic: “log start → think → log end”.
- It doesn’t know:
  - where **History** lives,
  - how **Models** are implemented,
  - what **Rules** are made of.
  - All of that lives in the kernel.

### 3. Cortex: supervisor & runtime

Cortex is the entry point that:

- Composes the kernel Layers.
- Runs user-space programs inside Episodes.
- Handles process isolation, timeouts, failures.

```ts
// --- KERNEL IMPLEMENTATION (Cortex) ---

// Example kernel composition (drivers are up to you)
const ProductionKernel = Layer.mergeAll(
  PostgresHistoryLayer, // implements HistoryService
  OpenAIModelLayer,     // implements ModelService
  StrictRuleLayer       // implements RuleService
);

// Cortex: “boot” an Agent inside an Episode
const runEpisode = <E, A>(
  agentProgram: Effect.Effect<
    A,
    E,
    HistoryService | ModelService | RuleService
  >
) => {
  // Wrap user space with the kernel
  const runnable = Effect.provide(agentProgram, ProductionKernel);

  // Run the “process”
  // This is where you handle:
  // - timeouts / budgets
  // - supervision / retries
  // - fiber interruption
  return Effect.runPromise(runnable);
};
```

You can then build richer Episode management on top of this (Episode IDs, WorkingMemory updates, etc.).

---

## Next.js as Terminal, Kuhn as Server

In this model:

- **Kuhn** is the long-lived runtime / server.
- **Next.js** (or any web UI) is just a terminal / monitor.

### How it looks in practice

- **Next.js API routes**:
  - do not run agent logic directly.
  - they call Cortex (e.g., `runEpisode(ReviewerAgent(prId))`).
- **Next.js pages**:
  - subscribe to Episode/Agent History & WorkingMemory,
  - render them as live dashboards or chats.

A rough directory structure might look like:

```
src/
  kuhn/                 # The OS
    kernel/             # Kernel services & drivers
      history/
      cortex/
      rules/
      model/
      workingMemory/
      capabilities/
    userland/           # Where the “intelligence” lives
      minds/
      skills/
      agents/
      tools/
      rulesets/
  app/                  # Next.js (the viewer)
    api/agents/         # Endpoints that call Cortex.runEpisode()
    dashboard/          # React components visualizing WorkingMemory & History
```

Kuhn doesn’t care that Next is the UI; you could swap in a CLI, Slack bot, or cron jobs.
The UI doesn’t orchestrate agents; it talks to Kuhn.

---

## How It All Fits Together

One more time, as a story:

1. A **Principal** (Identity) sends a request:
   > “Review PR #123.”
2. **Capabilities**:
   - knows there’s a `mind.senior-engineer`,
   - knows there’s an `agent.pr-reviewer` that uses it,
   - knows which Skills/Tools/Models are needed.
3. **Cortex**:
   - creates an **Episode** for this review,
   - starts the **Agent** with the chosen **Mind**,
   - supervises its runtime (fibers, retries, limits).
4. The **Agent**:
   - reads from **WorkingMemory**,
   - calls **Skills** (which call Model and Tools),
   - emits events to **History**,
   - updates **WorkingMemory** as it goes.
5. **Rules**:
   - intercept syscalls (History, Tool, Model),
   - enforce guardrails and budgets.
6. When done:
   - **History**: full trace of what happened.
   - **WorkingMemory**: up-to-date view (e.g., PR review result).
   - **Mind**: potentially updated with new long-term memory.

Your UI just listens and renders.

---

## A Senior Engineer’s Perspective

“Another agent framework” is usually a red flag. We’re already drowning in LangChain, AutoGen, CrewAI, etc.

Looking at Kuhn through the lens of someone who builds with Effect, LangGraph, and Next.js, it feels different. It feels less like a library and more like a platform architecture.

Key points:

- **It solves the Glue Code problem**
  - You stop inventing ad-hoc places to put state and logs.
  - You start asking “Is this History, WorkingMemory, Mind, or Agent?”
- **History vs WorkingMemory is huge**
  - It’s Event Sourcing / CQRS for agents.
  - You can compress / reshape History into WorkingMemory without losing the audit trail.
  - Essential for long-running agents where context windows explode.
- **Principal vs Mind vs Agent is a real win**
  - Principal = user/auth.
  - Mind = persona + memory.
  - Agent = running process.
  - You can reuse Minds across many Agents and Episodes.
- **Effect is a natural backend**
  - Kernel = Layer composition of services.
  - User space = Effect programs that depend on those tags.
  - Cortex = the supervisor that runs user programs with the kernel.
- **LangGraph & friends**
  - LangGraph can be the execution engine for graph-like workflows.
  - Kuhn gives you the ontology for what graph “state” and “nodes” *really* are.

**The risk is over-abstraction**
- 12 primitives is more than “system prompt + user prompt”.
- Simple chatbots don’t need all of this.
- Kuhn must remain compositional and opt-in, not a giant inheritance tree.

Treating Kuhn as an OS implies it is the **runtime**.
Your app is just a terminal, and your Agents are processes inside a synthetic cognitive environment.

---

## Design Principles

Kuhn is guided by a few core principles:

1. **Cognitive first, technical second**
   - Primitives are defined in terms of cognition (thinking, memory, identity, action).
   - Implementation tech (DBs, queues, providers) is secondary.
2. **Make implicit architecture explicit**
   - Every serious agent system already has some notion of:
     - history vs state,
     - tools vs logic,
     - personas vs processes.
   - Kuhn gives these clear names and boundaries.
3. **Event-first truth**
   - History is the source of truth for “what happened”.
   - WorkingMemory is derived and can be rebuilt.
4. **Separate “now” from “then”**
   - “Now” = WorkingMemory.
   - “Then” = History.
   - Don’t conflate them into one catch-all “context”.
5. **Agent ≠ Mind ≠ Principal**
   - Self/persona, process, and user/auth are distinct responsibilities.
6. **OS, not framework**
   - Kuhn orchestrates, supervises, and persists.
   - Your code runs *inside* Kuhn’s environment.
7. **Compositional, not inheritance-heavy**
   - You compose services and modules.
   - You don’t subclass 12 base classes.

---

## Getting Started (Conceptual)

Implementation details will depend on the language/runtime you choose (e.g., TypeScript + Effect). This section is about the mental workflow.

### 1. Define a Mind
Decide who the agent is:
- tone, style, preferences,
- long-lived knowledge and memory.

Example: `mind.senior-engineer` with code-style preferences and past PR history.

### 2. Define Skills & Tools
- **Skills**:
  - “review a diff”
  - “check test coverage”
  - “summarize changes”
- **Tools**:
  - GitHub API client,
  - CI status API,
  - repo explorer.

### 3. Define an Agent
Example: `agent.pr-reviewer`:
- **Mind**: `mind.senior-engineer`.
- **Skills**: `review-diff`, `check-tests`.
- **Tools**: `GitHub + CI`.

### 4. Register Capabilities
Add Minds, Agents, Skills, Tools, and Models to **Capabilities** with:
- IDs,
- versions,
- metadata,
- Rules.

### 5. Define Rules
- Tokens, cost, time, allowed Tools, allowed repos.
- Safety & compliance rules.

### 6. Start an Episode
From your UI (Next.js, CLI, Slack, etc.):

**Start an Episode**:
- principal: the user,
- mind: `mind.senior-engineer`,
- agent: `agent.pr-reviewer`,
- payload: PR ID.

**Kuhn**:
- Creates the Episode sandbox,
- Runs the Agent via Cortex,
- Enforces Rules,
- Streams History & WorkingMemory.

You render those streams however you like.

---

## Status

Kuhn is:

- **Conceptually stable** – the 12 primitives & OS framing are the foundation.
- **Implementation in-progress** – reference implementations (e.g., TypeScript + Effect, with optional LangGraph) are the next step.
- **Experimental** – expect rapid iteration and breaking changes early on.

If you need production stability *today*, treat Kuhn as an architectural guide.
If you want to help build the runtime for synthetic cognition, now is the time.

---

## Influences

Kuhn draws from:

- **Thomas S. Kuhn** – paradigms & paradigm shifts.
- **Operating Systems** – kernel/user space, processes, syscalls, scheduling.
- **Domain-Driven Design (DDD)** – subdomains, bounded contexts, ubiquitous language.
- **Event Sourcing & CQRS** – History vs projections.
- **Marshall McLuhan** – media as environments; the medium is the message.
- **Ludwig von Bertalanffy** – General Systems Theory, interdependent open systems.

The name **Kuhn** is a nod to the idea that this isn’t just a library, but a new **paradigm** for how we build agentic systems.

---

## Contributing

Right now, the most valuable contributions are:

- **Design feedback**
  - Does the 12-primitives model make sense?
  - Where does it feel too heavy, or too thin?
- **Use cases**
  - Concrete workflows you’d like to build with Kuhn:
    - code review,
    - incident analysis,
    - research + writing,
    - multi-agent planning.
- **Prototype code**
  - Kernel services: History, WorkingMemory, Capabilities, Rules, Cortex.
  - User space examples: Minds, Skills, Tools, Agents.

Please open an issue or discussion before large PRs so we can align on direction.

Formal contribution guidelines and code structure will land as the implementation solidifies.

---

## License

TODO: Choose and add a license (MIT / Apache-2.0 / etc.).

---

If you read this and thought:

> “Oh… this is how agents should have worked all along.”

then welcome.
You’re already thinking in **Kuhn**.
