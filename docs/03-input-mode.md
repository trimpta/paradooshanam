# Input Mode

## Triggering
- Tapping either the Person 1 or Person 2 input at the top of the screen will automatically activate the **Person 1** field, opening the keyboard and triggering Input Mode.
- Note: There is NO `[+]` button. Triggering input relies natively on tapping the input fields.

## Layout (When Active)
When active, the screen consists of three main sections occupying the area above the keyboard:
1. **Top — Person Inputs**: Person 1 and Person 2 inputs are always visible.
2. **Middle — Autocomplete**: Autocomplete list for the active person input.
3. **Bottom — Input Controls**: Positioned immediately above the keyboard. Contains the 1-10 score selector, Relationship status selector, and `[OK]` button. (This replaces the normal bottom bar).

## Keyboard Behavior
- Entering input mode automatically opens the keyboard.
- The keyboard's Enter/Next action moves appropriately between Person 1 and Person 2.
- **Hiding Keyboard (Cancellation)**: If the keyboard is hidden (via device back button or hide button), the input mode is disabled:
  - Discard current unsaved record.
  - Return to normal IN page view.
  - Hide autocomplete and score selectors.
  - Restore the normal bottom navbar.
  - Clear any text currently in the input fields.
- Returning to input mode reopens the keyboard automatically.
