# Person Input and Autocomplete

## Behavior
- **Person 1 Active**: Show autocomplete suggestions for Person 1. Selecting fills Person 1 and moves interaction to Person 2.
- **Person 2 Active**: Show autocomplete suggestions for Person 2. Person 1 is excluded from suggestions.
- **Visuals**: Terminal-like appearance (not a conventional HTML dropdown).

## Scrolling Interaction
- The autocomplete area displays a fixed number of visible lines based on available space.
- Cursor moves through suggestions via swipe/scroll interaction.
- Cursor moves through visible items. When cursor reaches the end of the visible list, the visible window shifts (e.g. from 0-4 to 1-5).
- Tapping the autocomplete area selects the currently highlighted item.


*Technical Implementation: See `App.tsx` in [Architecture](../tech/02-architecture.md)*
