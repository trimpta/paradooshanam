# Core Functionality & Ideas

The application is designed to map, track, and visualize social networks, relationships, and connections between people. It supports mapping out personal networks, tracking relationship statuses, and discovering social groups.

## Modules & Concepts

### 1. The Core Engine & Input
- **Connection Input**: The primary interaction mechanism for logging a relationship between two people. Users can assign a connection score (1-10) and an optional romantic status (e.g., Talking, Complicated, Relationship). 
  - *Read more about the design in [Input Mode](03-input-mode.md), [Autocomplete](04-autocomplete.md), and [Controls](05-controls.md).*
  - *Tech Implementation: See `App.tsx` in [Architecture](../tech/02-architecture.md).*

### 2. Network Visualization (The Graph)
- **The Graph**: The visual representation of the network where people are nodes and relationships are lines. It acts as an interactive physics simulation.
- **Traversal**: A feature within the graph to visually trace paths and animate "visits" through a sequence of people in the network.
  - *Tech Implementation: See `GraphPage.tsx` and `TraversalMenu.tsx` in [Architecture](../tech/02-architecture.md).*

### 3. Analytics & Insights
- **Key People**: Identifies the "most connected" or central figures in the network (e.g., the glue of a friend group, or the most popular person).
- **Social Groups**: Automatically detects clusters, friend groups, or cliques based on how tightly knit certain individuals are.
- **Gender Demographics**: A statistical breakdown of the network by gender, and an analysis of the types of connections (e.g., M-F, M-M, F-F).
- **Relationship Status**: A summary of who is currently in a relationship, complicated, or just talking.
  - *Tech Implementation: See the respective pages in [Architecture](../tech/02-architecture.md).*

### 4. Data Management & Sync
- **Local & Online Modes**: Users can build graphs privately offline, or create online shared graphs to collaborate with others in real-time.
- **Data Editing**: Interfaces to export/import the raw network data, rename people, or fix data entry errors.
  - *Tech Implementation: See `RootComponent.tsx`, `ManageGraphsPage.tsx`, and `DataManagementPage.tsx` in [Architecture](../tech/02-architecture.md).*
