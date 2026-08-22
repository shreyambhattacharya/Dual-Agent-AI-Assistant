# Project: Voice-Driven Dual-Agent AI Assistant

Build a polished, production-quality personal AI assistant inspired by the functionality and visual feel of JARVIS from Iron Man. This should not be a simple ChatGPT voice wrapper. It should be a complete desktop AI system built around two specialized agents, ChatGPT and Codex, with intelligent routing, persistent context, real-time voice interaction, project awareness, computer/tool access, and a high-quality futuristic UI.

The final application should be something I can genuinely use every day as both:

1. A general-purpose personal ChatGPT assistant.
2. A voice-controlled software-development interface that can delegate programming work directly to Codex.

The system should feel like one cohesive assistant even though ChatGPT and Codex operate as separate agents internally.

---

# 1. Core Concept

The assistant should expose one unified interface:

```text
                         USER
                          │
                 Voice / Text Input
                          │
                          ▼
              ┌─────────────────────┐
              │  JARVIS Controller  │
              │    / Orchestrator   │
              └──────────┬──────────┘
                         │
                 Intent + Agent Router
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       ┌─────────────┐       ┌─────────────┐
       │   ChatGPT   │       │    Codex    │
       │    Agent    │       │    Agent    │
       └──────┬──────┘       └──────┬──────┘
              │                     │
              ▼                     ▼
       General assistant       Software projects
       Research/explanation    Repository inspection
       Planning                Coding
       Personal assistance     Testing
       General reasoning       Debugging
       Tool usage              Git operations
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                 Unified Response
                         │
                  Speech + UI

```

The user should never have to manually switch applications.

ChatGPT and Codex are both part of the same application.

---

# 2. Explicit Agent Selection

Explicit user commands must always override automatic routing.

If the user begins a request by explicitly addressing ChatGPT, route the request to the ChatGPT agent.

Examples:

```text
"ChatGPT, explain how virtual memory works."

"GPT, research the difference between Webots and Gazebo."

"Chat, help me plan what I should work on today."

"Hey ChatGPT, summarize what we accomplished yesterday."

```

Recognize reasonable variants such as:

```text
Chat
GPT
ChatGPT
Chat GPT
Hey GPT
Hey ChatGPT

```

These should explicitly select:

```text
agent = CHATGPT

```

Likewise, explicit Codex addressing must route to Codex.

Examples:

```text
"Codex, inspect my FPGA computer project."

"Codex, implement the cache controller."

"Codex, run the tests."

"Codex, fix the failing UART test."

"Codex, commit these changes."

```

These should explicitly select:

```text
agent = CODEX

```

Explicit selection always takes priority over automatic intent classification.

---

# 3. Automatic Agent Routing

Most conversations should not require the user to specify an agent.

When the user does not explicitly say ChatGPT or Codex, intelligently determine which agent is most appropriate.

Use ChatGPT for things such as:

- General conversation
- Explanations
- Learning
- Interview preparation
- Planning
- Brainstorming
- Research
- Scheduling
- Summarization
- Personal assistance
- General reasoning
- High-level project architecture discussions
- Questions that do not require manipulating a repository
- Explaining code conceptually
- Discussing design choices

Use Codex when the request requires direct software-engineering actions, including:

- Inspecting an existing repository
- Reading project source files
- Modifying source code
- Creating source files
- Debugging
- Running tests
- Compiling
- Running simulations
- Refactoring
- Searching a codebase
- Running shell commands for development
- Analyzing Git diffs
- Creating commits
- Resolving build errors
- Implementing a requested feature

Example:

```text
USER:
"How does a cache replacement policy work?"

→ ChatGPT

```

```text
USER:
"How does the cache replacement policy in my CPU work?"

→ Depending on context:
   ChatGPT if conceptual discussion is sufficient
   Codex if repository inspection is required

```

```text
USER:
"Change my CPU cache replacement policy to pseudo-LRU."

→ Codex

```

The routing system should use conversation context, not just keywords.

---

# 4. Model Selection

Do not hard-code one model for every task.

Create a model-selection layer that chooses the best currently available OpenAI model appropriate for each operation.

Optimize based on:

- reasoning complexity
- coding ability
- latency
- voice requirements
- multimodal requirements
- tool support
- context size
- cost when reasonable
- reliability

Examples:

```text
Simple conversational question
→ fast high-quality conversational model

Complex technical reasoning
→ strongest appropriate reasoning model

Live voice interaction
→ best supported realtime speech model

Complex repository modification
→ strongest appropriate Codex coding model

Quick code search
→ lower-latency Codex configuration if appropriate

```

The architecture should allow model mappings to be changed through configuration without rewriting the application.

Example:

```yaml
models:
  conversation_fast: AUTO
  reasoning: AUTO
  realtime_voice: AUTO
  coding: AUTO
  coding_deep: AUTO

```

`AUTO` means the system resolves the best supported model based on current capabilities and the requested task.

---

# 5. Voice-First Interaction

Voice interaction is a core feature, not an optional addition.

The assistant should support natural conversations similar to talking to a person.

Desired pipeline:

```text
Microphone
   ↓
Wake-word detection
   ↓
Voice activity detection
   ↓
Realtime speech processing
   ↓
Intent recognition
   ↓
Agent selection
   ↓
Tool/agent execution
   ↓
Natural-language response
   ↓
Realtime text-to-speech

```

The system should support:

- microphone input
- speech detection
- interruption
- natural pauses
- low-latency responses
- streaming speech output
- text input as an alternative
- visible transcription
- microphone mute/unmute
- manual push-to-talk mode

---

# 6. Wake Word

Eventually support a local wake word.

Default wake word:

```text
Jarvis

```

Example:

```text
"Jarvis, explain what we accomplished on the CPU yesterday."

```

The wake-word detector should preferably execute locally.

The application should support configurable modes:

```text
Always-listening wake word
Push-to-talk
Manual microphone activation
Text-only

```

Privacy should be considered so that audio does not need to continuously leave the computer before the wake word is detected.

---

# 7. Interruptions

The user must be able to interrupt the assistant naturally.

If the assistant is speaking and the user begins speaking, speech output should stop or lower appropriately.

Examples:

```text
Assistant:
"The three main reasons are..."

User:
"Wait, explain the second one."

Assistant immediately stops and handles the new request.

```

If Codex is executing something:

```text
"Jarvis, stop."

```

should cancel or pause the active Codex task when safely possible.

Other examples:

```text
"Don't change that file."

"Actually use the other implementation."

"Stop the tests."

"Don't commit anything."

"Only modify the simulator."

```

The active agent should receive these updated constraints.

---

# 8. JARVIS-Style User Interface

The application should have a polished futuristic desktop UI inspired by the visual language of JARVIS, but use original graphics rather than directly copying copyrighted interface assets.

The centerpiece of the UI should be a glowing blue holographic visualization.

The hologram should behave dynamically.

## Idle

While waiting:

- slowly rotate
- gently pulse
- subtle particles
- low-intensity blue glow
- minimal movement

## Listening

When listening:

- expand slightly
- react to microphone amplitude
- display ripples/waves
- become brighter

## Thinking

While the model is reasoning:

- change geometry
- rotate layered rings
- animate internal nodes
- display flowing particle connections
- become more computational-looking

## Speaking

The hologram should visibly react to the assistant's speech in real time.

Speech amplitude and/or frequency information should drive its animation.

For example:

```text
Quiet speech
→ small movement

Louder speech
→ greater expansion

Different frequencies
→ different rings / vertices / waveform deformation

```

The effect should resemble an animated futuristic AI core rather than a conventional audio waveform.

Possible visual elements:

- concentric rings
- wireframe sphere
- particle clouds
- rotating arcs
- radial waveform
- glowing nodes
- orbital paths
- mesh deformation
- volumetric-looking blue light
- central energy core

Potential rendering technologies:

- Three.js
- WebGL
- React Three Fiber
- custom GLSL shaders

Avoid building the core visualization as a static video or GIF.

It should be procedurally animated.

---

# 9. UI Layout

The desktop interface could roughly resemble:

```text
┌──────────────────────────────────────────────────────────────┐
│ JARVIS                                      ● ONLINE        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                                                              │
│                         ╭────────╮                           │
│                    ╭────┤        ├────╮                      │
│                 ╭──╯    │  HOLO  │    ╰──╮                   │
│                 │       │  CORE  │       │                   │
│                 ╰──╮    │        │    ╭──╯                   │
│                    ╰────┤        ├────╯                      │
│                         ╰────────╯                           │
│                                                              │
│                        Listening...                          │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ USER                                                         │
│ > Codex, run the CPU simulation.                             │
│                                                              │
│ JARVIS                                                       │
│ > Running the simulation now.                               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ CODEX │ CPU_SYSTEM │ RUNNING │ tests: 37/42                 │
├──────────────────────────────────────────────────────────────┤
│ 🎙  [Type a message...]                              SEND    │
└──────────────────────────────────────────────────────────────┘

```

The actual design should be substantially more polished.

---

# 10. Agent Indicator

The interface should make it obvious which agent is currently responsible for the task.

For example:

```text
AGENT: CHATGPT

```

or:

```text
AGENT: CODEX

```

During automatic routing:

```text
ROUTING → CODEX

```

could briefly appear.

However, avoid excessive visual clutter.

---

# 11. Coding Activity Visualization

When Codex is working, show useful live status.

Examples:

```text
CODEX ACTIVE

Project: 32_Bit_Computer_System

● Reading repository
● Inspecting cache_controller.sv
● Running Verilator
● Executing testbench
○ Reviewing results
○ Preparing summary

```

Potential additional panels:

```text
Files changed: 3

Tests:
37 passed
0 failed

Git:
+142
-37

```

Do not expose raw chain-of-thought reasoning.

Show concise action/status descriptions instead.

---

# 12. Project Registry

Create persistent knowledge of my software and hardware projects.

Example:

```yaml
projects:

  cpu_system:
    name: 32-Bit Computer System

    aliases:
      - computer
      - mini computer
      - cpu
      - fpga computer
      - 32-bit computer

    repository:
      path: "..."

    agent:
      preferred: codex

  hil_autonomy:
    name: HIL Embedded Autonomy Platform

    aliases:
      - HIL project
      - autonomy system
      - rover
      - embedded autonomy

    repository:
      path: "..."

  garbage_sorter:
    name: AI Garbage Sorter

    aliases:
      - garbage sorter
      - trash sorter

    repository:
      path: "..."

```

Then the following should work:

```text
"Jarvis, work on the computer."

```

The system should resolve:

```text
computer
→ 32-Bit Computer System

```

and know which repository is associated with it.

---

# 13. Codex Integration

Codex should operate as a proper coding agent rather than simply generating code snippets.

It should be capable of:

- reading repository files
- understanding repository structure
- modifying files
- creating files
- deleting files when appropriate and approved
- running build commands
- running unit tests
- running integration tests
- running simulations
- examining compiler errors
- iterating on failures
- viewing diffs
- working with Git
- following repository-specific instructions
- maintaining project context
- resuming previous development sessions

Typical flow:

```text
USER:
"Codex, implement the UART packet parser in my HIL project."

JARVIS:
resolve project

CODEX:
inspect repository
↓
read AGENTS.md
↓
locate UART implementation
↓
inspect existing protocol
↓
implement parser
↓
compile
↓
run tests
↓
fix errors
↓
rerun tests
↓
produce diff
↓
report completion

JARVIS:
"Implemented the UART parser. I modified three files and all protocol tests pass."

```

---

# 14. AGENTS.md Support

Each development repository should support an `AGENTS.md` file containing project-specific instructions for Codex.

Potential information:

```text
Architecture

Directory structure

Build process

Test commands

Coding conventions

Simulation instructions

Hardware dependencies

Allowed dependencies

Known issues

Safety constraints

Files that should not be modified

Definition of done

```

The system should automatically detect and respect these files.

---

# 15. Persistent Memory

The assistant should remember useful long-term context.

Examples:

- project names
- repository locations
- preferred tools
- coding preferences
- current project state
- previous tasks
- decisions made
- unfinished work
- personal preferences
- common commands
- recurring workflows

Do not simply dump all conversation history into every prompt.

Implement structured memory.

Possible categories:

```text
USER_MEMORY

PROJECT_MEMORY

SESSION_MEMORY

TASK_MEMORY

AGENT_MEMORY

```

---

# 16. Conversation Memory

The assistant should understand references like:

```text
"What were we doing yesterday?"

"Continue where we left off."

"Do the thing we discussed earlier."

"What did Codex change?"

"Go back to the previous implementation."

"Why did we decide to use UART?"

```

Conversation history and project history should make these understandable.

---

# 17. Development Session Persistence

Codex work should be resumable.

Example:

Day 1:

```text
"Codex, begin implementing the cache subsystem."

```

Day 2:

```text
"Jarvis, continue working on the cache."

```

The system should recover:

- repository
- branch
- previous task
- changes
- last test results
- remaining work
- Codex session/context when supported

---

# 18. Tool System

Design tools through a modular interface.

Potential tools:

```text
Filesystem
Git
GitHub
Terminal
Web search
Calendar
Email
Reminders
Notes
Browser
System applications
Project registry
Memory database

```

The agent should call structured tools rather than inventing shell commands unnecessarily.

Example conceptual interface:

```python
tool.execute(
    name="run_tests",
    project="cpu_system",
    arguments={...}
)

```

---

# 19. GitHub Integration

Eventually support GitHub functionality such as:

```text
"Jarvis, show my open issues."

"Codex, fix issue 17."

"Create a branch."

"Show me the diff."

"Commit that."

"Push the branch."

"Open a pull request."

```

The UI should visualize relevant repository information where appropriate.

---

# 20. Git Safety

Different operations should have different permission levels.

Example:

## Automatically Allowed

```text
Read files
Search files
Compile
Run tests
Run simulations
Inspect Git status
Inspect Git diff

```

## Configurable

```text
Modify source code
Create files
Delete files
Install project dependencies

```

## Confirmation Recommended

```text
git push
merge
force operations
large deletion
deployment
system configuration changes
credential changes
flashing physical hardware

```

The permission system should be configurable.

---

# 21. Computer Control

Eventually allow safe desktop/system actions.

Examples:

```text
"Open VS Code."

"Open my CPU project."

"Launch the simulator."

"Open GitHub."

"Show the file Codex just changed."

"Open the terminal."

"Start Webots."

```

Computer-control features must remain modular so they can be expanded later.

---

# 22. Personal Assistant Capabilities

ChatGPT should eventually be able to act as a general daily assistant.

Potential integrations include:

- calendar
- Gmail
- reminders
- task tracking
- notes
- web research
- weather
- news
- travel planning
- interview preparation
- school work
- project planning

Examples:

```text
"Jarvis, what do I have tomorrow?"

"Jarvis, remind me to run the FPGA tests tomorrow."

"Jarvis, summarize my unread important emails."

"Jarvis, what should I work on today?"

"Jarvis, research this company before my interview."

```

---

# 23. Multi-Step Tasks

The assistant should eventually support requests requiring several operations.

Example:

```text
"Jarvis, check my CPU project. If the simulation passes, have Codex commit the latest cache changes and summarize what changed."

```

Potential execution graph:

```text
Inspect project
     ↓
Run tests
     ↓
Test result?
  ↙       ↘
FAIL      PASS
 ↓          ↓
Report     inspect diff
            ↓
           commit
            ↓
          summarize

```

Use explicit workflow/task-state handling rather than fragile chains of prompts.

---

# 24. Agent Communication

ChatGPT and Codex should be able to exchange relevant task information through the orchestrator.

They should not directly operate as completely isolated systems.

Example:

```text
USER:
"ChatGPT, explain the cache design we discussed."

ChatGPT explains it.

USER:
"Okay, implement that."

Router identifies implementation request.

Relevant architectural context
        ↓
Codex

Codex implements it.

```

The user should not have to restate everything.

Only relevant context should be transferred.

---

# 25. Unified Personality

Even though there are two agents, the user experience should feel like one assistant.

Avoid situations where ChatGPT and Codex appear to be completely unrelated products.

The orchestrator should maintain:

- consistent voice
- consistent visual interface
- consistent user memory
- shared project terminology
- consistent status handling

However, the UI should still indicate which underlying agent is currently active.

---

# 26. Text Interface

Voice is primary, but every feature should also be usable through typed text.

The application should include:

- text input
- message history
- Markdown rendering
- code blocks
- syntax highlighting
- tables
- expandable tool results
- file references
- diffs
- command output
- clickable project names where useful

---

# 27. Code Diff UI

When Codex changes files, provide a proper diff viewer.

Example:

```text
cache_controller.sv

- old line
+ new line

```

Allow:

```text
View all changes

View by file

Accept

Revert

Open in editor

```

Potentially integrate Monaco Editor for code/diff rendering.

---

# 28. Task Manager

Long-running tasks should become explicit task objects.

Example:

```text
TASK #142

Agent:
Codex

Project:
32-Bit Computer System

Goal:
Implement cache controller

Status:
Testing

Started:
10:32 PM

Files changed:
3

Tests:
41 / 42 passed

```

The user should be able to:

```text
cancel task
pause task
resume task
inspect task

```

---

# 29. Concurrent Tasks

Eventually support multiple tasks.

Example:

```text
Codex task:
running FPGA test suite

Meanwhile:

User:
"ChatGPT, explain what a TLB does."

ChatGPT can answer without corrupting or replacing the Codex task.

```

The orchestrator therefore should not assume only one thing can exist at a time.

---

# 30. State Machine

Use explicit application states.

Potential UI states:

```text
IDLE
LISTENING
TRANSCRIBING
ROUTING
THINKING
TOOL_CALL
CODEX_WORKING
SPEAKING
WAITING_FOR_PERMISSION
ERROR
OFFLINE

```

The hologram animation should react to these states.

---

# 31. Hologram Animation State

Example:

```python
HologramState(
    mode="SPEAKING",
    intensity=0.72,
    audio_amplitude=0.61,
    dominant_frequency=420,
    agent="CHATGPT"
)

```

The renderer can use these values to control animation.

Keep AI logic separate from visual rendering.

---

# 32. Audio-Reactive Hologram

For speaking animation, extract useful real-time audio information.

Potential inputs:

```text
RMS amplitude
Frequency spectrum
FFT bands
Pitch
Speech activity
Phoneme timing if available

```

Then map them to visual properties.

Example:

```text
Amplitude → sphere expansion

Bass → outer ring movement

Midrange → mesh deformation

Treble → particle activity

Speech activity → overall brightness

```

Keep visual movement smooth using interpolation rather than directly applying noisy audio data.

---

# 33. Desktop Technology

Choose a maintainable desktop architecture.

A strong potential stack would be:

```text
Desktop shell:
Tauri

Frontend:
React
TypeScript

3D UI:
Three.js
React Three Fiber
WebGL / GLSL

Backend/orchestrator:
Python or Rust

AI:
OpenAI APIs
OpenAI realtime capabilities
Codex integration

Local storage:
SQLite

Vector/semantic memory:
add only if actually useful

Repository operations:
Git + Codex

Audio:
native/local audio pipeline

```

Electron is acceptable if there is a compelling reason, but prefer efficient architecture.

Do not blindly adopt this stack if testing reveals a better choice.

Document architectural decisions.

---

# 34. Suggested Codebase Structure

Something conceptually similar to:

```text
jarvis/
│
├── apps/
│   └── desktop/
│
├── frontend/
│   ├── components/
│   ├── hologram/
│   ├── chat/
│   ├── diff/
│   ├── tasks/
│   └── settings/
│
├── backend/
│   ├── orchestrator/
│   ├── router/
│   ├── agents/
│   │   ├── chatgpt/
│   │   └── codex/
│   ├── voice/
│   ├── tools/
│   ├── projects/
│   ├── memory/
│   ├── permissions/
│   └── tasks/
│
├── database/
│
├── config/
│
├── tests/
│
├── docs/
│
└── README.md

```

The final structure should be chosen based on the actual implementation.

---

# 35. Configuration

Important behavior should be configurable.

Example:

```yaml
assistant:
  name: Jarvis

voice:
  enabled: true
  wake_word: Jarvis
  interruption: true

routing:
  automatic: true

agents:
  chatgpt:
    enabled: true

  codex:
    enabled: true

permissions:
  modify_files: true
  run_tests: true
  git_commit: true
  git_push: ask

```

API keys and secrets must never be stored in committed configuration files.

---

# 36. Security

Treat security as a real engineering requirement.

Implement:

- environment-based secrets
- secure credential storage
- scoped repository access
- command restrictions
- permission prompts
- audit logs
- safe subprocess handling
- input sanitization where appropriate
- protection against accidental destructive operations
- project sandboxing when practical

Never expose API keys to the frontend unnecessarily.

---

# 37. Audit Log

Maintain a clear record of meaningful agent actions.

Example:

```text
22:31:04 USER
"Codex, fix the failing cache test."

22:31:05 ROUTER
Selected CODEX.

22:31:06 CODEX
Read cache_controller.sv.

22:31:19 CODEX
Modified cache_controller.sv.

22:31:22 TOOL
Ran make test-cache.

22:31:28 RESULT
42 tests passed.

22:31:32 CODEX
Task completed.

```

Do not log private hidden chain-of-thought.

Log actions and results.

---

# 38. Error Handling

Failures should produce useful explanations.

Examples:

```text
Codex unavailable

Repository missing

Build tool missing

API failure

Microphone unavailable

Network unavailable

Authentication expired

Test timeout

Permission denied

```

Avoid silently failing.

---

# 39. Offline Graceful Degradation

The app should still launch without internet connectivity.

Offline features might include:

- opening project registry
- viewing previous conversations
- viewing task history
- viewing Git status
- viewing previous Codex changes
- opening repositories
- accessing settings

Online agent actions should clearly indicate they are unavailable.

---

# 40. Settings Page

Include controls for:

```text
Voice

Microphone

Speaker

Wake word

Agent routing

Model preferences

Projects

Repositories

Codex permissions

Git permissions

Memory

Privacy

Animations

Performance

Developer/debugging

```

---

# 41. Performance

The UI must remain responsive while agent operations execute.

Never block the rendering/event thread with:

- network calls
- model inference requests
- Git commands
- test suites
- subprocess operations
- repository scanning

Use asynchronous architecture and background workers where appropriate.

---

# 42. Testing

The project should have meaningful automated testing.

At minimum test:

- explicit ChatGPT routing
- explicit Codex routing
- automatic routing
- project alias resolution
- permission handling
- memory storage/retrieval
- task cancellation
- configuration parsing
- model selection
- tool invocation
- agent failures

Integration tests should verify workflows such as:

```text
voice/text input
→ router
→ Codex mock
→ repository tool
→ result
→ UI event

```

---

# 43. Observability

Include developer diagnostics.

Useful metrics:

```text
speech latency

routing latency

first-token latency

time-to-first-audio

Codex task duration

tool execution times

token usage

API errors

task failure rates

```

A hidden developer panel would be useful.

---

# 44. README and Documentation

Maintain strong documentation throughout development.

README should eventually include:

- project overview
- demo
- architecture diagram
- feature list
- installation
- configuration
- voice setup
- Codex setup
- adding projects
- security model
- development instructions
- screenshots
- limitations
- roadmap

Include architecture documentation separately where appropriate.

---

# 45. Resume-Level Engineering Goal

This project should be built to demonstrate actual systems/software engineering rather than merely wrapping an LLM API.

The final system should showcase:

- multi-agent orchestration
- real-time audio processing
- asynchronous programming
- agent/tool routing
- persistent memory
- repository automation
- software-agent integration
- Git integration
- security boundaries
- state management
- desktop application development
- WebGL graphics
- audio-reactive visualization
- testing
- observability
- human-in-the-loop control

The code and README should make these engineering challenges visible.

---

# 46. Target User Experience

A representative finished interaction should look like this:

```text
USER:
"Jarvis."

[Hologram brightens]

JARVIS:
"Yes?"

USER:
"What are we working on today?"

[ChatGPT selected]

JARVIS:
"You have interview preparation remaining, and your most recent development work was on the 32-bit computer."

USER:
"Let's work on the computer."

JARVIS:
"Opening the 32-bit Computer System project."

USER:
"Where did we leave off?"

[ChatGPT / project memory]

JARVIS:
"The cache subsystem was the most recent milestone. The main testbench was passing, but the replacement-policy verification still needed additional coverage."

USER:
"Codex, inspect it and determine what should be done next."

[Agent indicator changes to CODEX]

[Hologram changes to computational animation]

CODEX:
Repository inspection...

CODEX:
"I found two incomplete verification cases and one TODO in the cache controller."

USER:
"Implement everything that's needed and test it."

CODEX:
Editing...
Building...
Testing...

JARVIS:
"Done. Codex modified three files and all 48 cache tests now pass."

USER:
"Show me."

[Diff viewer opens]

USER:
"ChatGPT, explain what Codex changed."

[Agent switches to CHATGPT]

JARVIS:
"The main change was..."

```

This is the level of integration expected.

---

# 47. Development Strategy

Do not attempt to build every feature simultaneously.

Develop incrementally while maintaining a clean architecture.

Recommended phases:

## Phase 1: Foundation

Build:

- desktop shell
- frontend
- basic chat UI
- backend communication
- configuration
- application state system

## Phase 2: ChatGPT

Implement:

- text conversation
- streaming
- model abstraction
- basic conversation storage

## Phase 3: Voice

Implement:

- microphone input
- realtime speech
- speech output
- transcription
- interruption
- audio device selection

## Phase 4: Holographic UI

Implement:

- Three.js visualization
- idle animation
- listening animation
- thinking animation
- speaking animation
- audio reactivity
- smooth transitions

## Phase 5: Agent Router

Implement:

- explicit ChatGPT selection
- explicit Codex selection
- automatic routing
- routing tests

## Phase 6: Codex

Implement:

- Codex integration
- repository access
- Codex streaming status
- task cancellation
- test execution
- diff reporting

## Phase 7: Projects

Implement:

- project registry
- aliases
- project auto-detection
- AGENTS.md handling
- project memory

## Phase 8: Memory

Implement:

- conversation persistence
- structured user memory
- project memory
- task history
- session continuation

## Phase 9: Development Tools

Implement:

- Git
- GitHub
- test commands
- simulations
- editor opening
- terminal integration

## Phase 10: Personal Tools

Add selected integrations such as:

- calendar
- email
- reminders
- notes
- research

## Phase 11: Polish

Improve:

- animations
- latency
- UI transitions
- error handling
- permissions
- testing
- installer
- documentation
- demo experience

---

# 48. Initial Development Requirement

Before writing large amounts of application code:

1. Inspect the project directory.
2. Determine what already exists.
3. Create an architectural plan.
4. Document major technology choices and why they were made.
5. Establish the repository structure.
6. Establish coding conventions.
7. Create `AGENTS.md`.
8. Create a milestone tracker.
9. Implement the smallest end-to-end vertical slice.

The first vertical slice should ideally be:

```text
typed user input
      ↓
orchestrator
      ↓
ChatGPT
      ↓
streamed response
      ↓
UI

```

Then progressively add voice, routing, Codex, and the hologram.

---

# 49. Engineering Rules

While developing this project:

- Keep components modular.
- Do not tightly couple the UI to a specific AI model.
- Do not tightly couple routing to string keyword matching.
- Avoid giant files.
- Use typed interfaces wherever reasonable.
- Handle asynchronous work correctly.
- Write tests for important behavior.
- Never commit secrets.
- Avoid unnecessary dependencies.
- Prefer maintainable implementations over hacks.
- Document non-obvious architectural decisions.
- Preserve separation between orchestration, agents, tools, memory, voice, and UI.
- Keep the application runnable after each major milestone.
- Run tests after meaningful changes.
- Do not modify unrelated components without reason.
- Review the Git diff before considering a task complete.

---

# 50. Long-Term Vision

The ultimate goal is a personal AI environment that feels like one intelligent assistant rather than a collection of disconnected AI applications.

The system should eventually allow interaction like:

```text
"Jarvis, what's my schedule?"

"Explain this concept."

"Research this company."

"Open my HIL project."

"Codex, implement the next milestone."

"Run the simulator."

"Explain what failed."

"Fix it."

"Show me the diff."

"Commit it."

"Remind me to finish verification tomorrow."

"What should I work on next?"

```

All of these interactions should happen through the same interface.

The assistant should decide which underlying capabilities are required and coordinate them appropriately.

---

# 51. Core Design Principle

Maintain this principle throughout the entire project:

> One application, one interface, one persistent context, and two specialized agents.

ChatGPT is the conversational and reasoning agent.

Codex is the software-engineering agent.

The orchestration layer decides which one should work unless the user explicitly chooses an agent.

The distinction between the agents should be visible when useful, but the overall experience should remain cohesive.

The finished system should feel less like switching between ChatGPT and Codex and more like directing one intelligent assistant that knows which specialized capability to use.

---

# 52. Definition of Done

The primary version of this project is complete when all of the following work reliably:

- A polished desktop application launches normally.
- The JARVIS-inspired holographic UI is functional.
- The hologram has distinct idle, listening, thinking, coding, and speaking behaviors.
- Speech visibly affects the hologram in real time.
- The user can converse naturally through voice.
- The user can interrupt the assistant.
- Typed input works equally well.
- ChatGPT functions as a general assistant.
- Codex functions as a real coding agent.
- Saying "ChatGPT..." explicitly selects ChatGPT.
- Saying "Codex..." explicitly selects Codex.
- Requests without an explicit agent are intelligently routed.
- The application selects an appropriate LLM/model based on the task.
- Project aliases resolve to real repositories.
- Codex can inspect and modify registered projects.
- Codex can compile, test, debug, and report results.
- Repository instructions through `AGENTS.md` are respected.
- Code changes can be inspected through a diff UI.
- Active coding operations show useful live status.
- Tasks can be interrupted or canceled.
- Conversations persist.
- Project context persists.
- Previous development work can be resumed.
- Permission boundaries protect dangerous actions.
- Git integration works.
- The application has robust error handling.
- Important behavior has automated tests.
- Secrets are stored securely.
- The UI remains responsive during long operations.
- Architecture and setup are thoroughly documented.
- The system is polished enough for a recorded demo and resume/GitHub presentation.

Build toward this complete vision incrementally, but do not simplify the architecture in ways that prevent these final capabilities from being added cleanly.