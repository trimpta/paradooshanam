# Architecture & Implementation

This document describes the technical implementation and codebase structure. For conceptual details, refer to the [Idea & Core Functionality](../idea/00-core-functionality.md) documentation.

## Tech Stack Overview
Refer to [tech-stack.md](tech-stack.md) for the basic stack.
The application is a React SPA built with Vite. It heavily relies on local state arrays (for people, connections, and genders) managed at the root and passed down to specialized components. Complex graph algorithms use `graphology` and its associated sub-packages, while the network visualizer is powered by `d3`. 

## Component Breakdown & Links

### 1. App Shell & State Management
- **`RootComponent.tsx`**: The outermost wrapper of the app. It handles Supabase session checking, Auth UI, and delegates to `ManageGraphsPage.tsx` to let the user select an online graph (or opt for local offline mode) before mounting the main `App`.
- **`App.tsx`**: The central state container and primary UI frame. 
  - **State**: Maintains the global list of `names`, `records` (connections), and `genders`. 
  - **Sync**: Responsible for persisting data to `localStorage` (offline) or syncing with Supabase real-time subscriptions (online).
  - **Input Logic**: Manages the complex "Input Mode" logic (keyboard event listening, fuzzy search for autocomplete, and input conflict resolution).
  - **Routing**: Conditionally renders full-screen overlay components (like `GraphPage` or `DataManagementPage`) based on user selection in the out-page menus.
- **`CardHeader.tsx`**: A reusable UI component providing standard top-bar navigation (back buttons, titles) and an optional settings dropdown used by most sub-pages.

### 2. Network Visualization
- **`GraphPage.tsx`**: Implements the interactive force-directed network simulation using `d3`. It accepts the global `ConnectionRecord` array, translates it into nodes and links, and runs a physics simulation.
- **`TraversalMenu.tsx`**: A child component of `GraphPage`. It controls the sequence of node highlights (traversals) across the network, passing state back up to the `d3` simulation to orchestrate animations.

### 3. Graph Analytics (powered by `graphology`)
- **`GroupDetectionPage.tsx`**: Constructs a `graphology` undirected graph from the records and runs Louvain community detection (`graphology-communities-louvain`) to identify isolated groups and clusters.
- **`KeyPeoplePage.tsx`**: Constructs a `graphology` graph and runs various centrality algorithms (`graphology-metrics/centrality` including eigenvector, betweenness, and degree) to mathematically score and rank the nodes in the network.

### 4. Basic Data Analytics
- **`GenderAnalysisPage.tsx`**: A pure React component that memoizes the global records to perform statistical analysis of connections by gender.
- **`RelationshipStatusPage.tsx`**: Iterates over the records to group and display connections with active romantic statuses.

### 5. Data Mutations & Persistence
- **`DataManagementPage.tsx`**: Provides forms and JSON serialization to bulk import/export the `names`, `records`, and `genders`.
- **`PersonEditorPage.tsx`**: A UI to rename nodes or assign gender tags. It callbacks into `App.tsx` to recursively update all historical connections that reference the old name.
- **`ManageGraphsPage.tsx`**: Interface for Supabase online mode. It queries available online graphs, creates new ones, and handles real-time presence subscriptions to show active user counts.
- **`lib/supabase.ts`**: Standard Supabase client initialization using environment variables.
