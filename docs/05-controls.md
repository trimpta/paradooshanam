# Input Controls

## Score Selector
- 1–10 horizontal selector.
- Slightly reduced in size to accommodate the relationship status selector alongside it.

## Relationship Status Selector
- Single-value dropdown-style control alongside the score selector.
- Closed state displays the current relationship abbreviation and a dropdown arrow.
- Default value: `N` (No Relationship).

### Options
- N (No Relationship) —
- T (Talking Stage) `^_^`
- C (Complicated) `</3`
- R (In a Relationship) `<3`

### Tap Interaction
- Tapping opens the options popup. Selecting an option sets it.

### Hold-and-Drag Selection
- Holding expands the options popup automatically.
- Popup remains open even if the finger moves away.
- Finger position is continuously tracked:
  - When fingertip interacts with the popup, determine which option is underneath and highlight it live.
- Upon release:
  - Select the option currently under the fingertip.
  - Keep popup open for ~100ms.
  - Update value with a morph/transition animation.
  - Close popup after transition.

## OK Button
- Alongside score and relationship controls, above keyboard.
- Action:
  1. Submit Person 1, Person 2, Score, Relationship status.
  2. Add missing names to the list.
  3. Save connection and status.
  4. Clear input.
  5. Prepare for the next record.
