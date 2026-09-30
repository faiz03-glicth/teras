# Teras: mandatory UX requirements

These pain points and solutions are **mandatory product requirements**, not optional improvements. The goal is an app
that is intuitive, consistent, efficient and easy to use, especially for finding workouts and tracking exercise
progress. They are functional and UX requirements, and they are also acceptance criteria.

## 1. Consistent navigation

**Pain point:** users struggle to move between sections because menus, buttons, tabs and actions are placed
inconsistently.

**Requirement:** one consistent navigation system across the whole app.

- Primary navigation elements stay in predictable locations on every screen.
- Buttons that do similar things share placement, appearance, iconography and interaction behaviour.
- Back navigation behaves the same on every applicable page.
- Bottom navigation, headers, tabs, floating actions and other navigation components follow one unified design system.
- Users never have to relearn where a navigation element is when they move between sections.
- The navigation hierarchy clearly shows where the user is.
- Selected/active navigation states are always visually identifiable.
- No unnecessary navigation patterns that confuse or duplicate functionality.
- Navigation works across the screen sizes and orientations the app supports.

**Acceptance:** a user moves between the major sections without hesitating or searching for navigation controls.

## 2. Intuitive, easy-to-scan workout discovery

**Pain point:** users spend too long looking for workouts because the navigation and layout make them hard to find
and understand.

**Requirement:** workouts are easy to find, understand, scan and start.

- Clearly separate categories, muscle groups, goals, programs or other relevant classifications.
- Use a predictable information hierarchy.
- Present workouts in clear, easy-to-scan cards, lists or sections.
- Name, target muscles, duration, difficulty, equipment and other key information are understandable at a glance.
- Reduce visual clutter.
- Minimise the interactions needed to find and start a workout.
- Search, filtering, sorting and category selection are intuitive and consistent.
- Anything interactive is clearly clickable.
- Clear visual feedback when the user selects, opens, starts or completes a workout.
- Users never need to open several screens just to understand what a workout contains.

**Acceptance:** a user quickly sees what workouts exist, understands what each one is for, and starts the one they want
without confusion.

## 3. Efficient exercise tracking

**Pain point:** users struggle to track exercises accurately and to follow their progress.

**Requirement:** an efficient, intuitive tracking experience, including where appropriate:

- built-in exercise timers, set counters, rep counters, weight/resistance tracking and rest timers
- exercise completion states, current-set / total-set indicators, and workout progress indicators
- workout duration tracking, historical exercise and workout records, and progress visualisation
- a clear distinction between **completed, active, skipped and upcoming** exercises

Tracking keeps manual effort low without losing accuracy. At any moment the user can tell:

1. which exercise they are doing;
2. which set they are on;
3. how many reps they need to do;
4. how much time remains or has passed;
5. which exercise comes next;
6. how much of the workout is done;
7. whether their progress has been saved.

**Acceptance:** tracking needs as few interactions as possible while still giving full visibility and control.

## Global UX requirements (every page and feature)

- **Consistency:** one design system for navigation, buttons, cards, typography, icons, spacing, colours, states,
  animations, feedback and interaction patterns. Reuse an existing pattern rather than introduce a new one.
- **Discoverability:** important actions and information are understandable without guessing what an icon, button,
  card or gesture does.
- **Efficiency:** minimise taps, navigation steps, repeated inputs and redundant screens.
- **Feedback:** every important action gets visual or interaction feedback, especially navigation, choosing and
  starting a workout, completing sets and exercises, saving progress, timers, editing tracking data, and errors or
  failed actions.
- **Accessibility and readability:** interactive elements are easy to identify, text is readable, touch targets are
  large enough, important information has a clear visual hierarchy, colour is never the only indicator of state,
  and everything stays understandable in both light and dark themes.
- **Responsiveness:** the same navigation logic and interaction patterns on every supported screen size.

## Implementation rule

Treat all of the above as core requirements, not isolated UI fixes. Before changing a screen:

1. Inspect the navigation architecture.
2. Identify inconsistent navigation patterns.
3. Identify duplicated or conflicting interaction patterns.
4. Identify where users struggle to locate workouts.
5. Identify weaknesses in the exercise-tracking flow.
6. Refactor shared components instead of creating one-off implementations.
7. Follow the app's existing architecture and design principles.
8. Verify that nothing existing breaks.

Teras is a new app, so this means: **reuse Streak's established patterns** instead of inventing new ones.

After implementation, run a **complete UX consistency review** and verify that navigation is consistent, workouts are
easy to discover and scan, tracking is efficient, timers work correctly, sets and reps are tracked correctly, progress
is clearly communicated, actions give feedback, no screen introduces a conflicting navigation pattern, and no feature
has become harder to use.
