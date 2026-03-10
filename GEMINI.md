# Chord Visualizer & Analysis Tools - Project Overview

This project is a web-based suite for chord visualization and harmonic analysis, developed autonomously by an AI agent (Gemini CLI). It enables users to render chord symbols into music notation and identify chords from a set of notes.

## Technical Stack

- **Logic:** [Tonal.js](https://tonaljs.github.io/tonal/) for music theory, chord detection, and pitch class analysis.
- **Rendering:** [ABCJS](https://www.abcjs.net/) for dynamic sheet music rendering using ABC notation.
- **Frontend:** Vanilla JavaScript, HTML5, and CSS3. No build tools or frameworks are used.
- **CDN Dependencies:** Tonal.js and ABCJS are loaded via JSDelivr in `index.html`.

## Core Functionality

1.  **Chord Visualizer:**
    *   Accepts chord symbols (e.g., `Cmaj7`, `F#m7b5`).
    *   Renders the chord notes on a musical staff using ABCJS.
2.  **Chord Guessing:**
    *   Identifies possible chord names from a space-separated list of notes (e.g., `C E G Bb D`).
    *   Renders the input notes and detected chords.
3.  **Harmonic Suggestions:**
    *   Analyzes pitch classes to suggest "rootless" or "missing tone" chord alternatives.

## Project Structure

- `index.html`: The main entry point and UI structure.
- `index.js`: Contains all application logic, including ABC notation conversion (`notesToAbc`), chord detection, and rendering orchestration.
- `style.css`: Basic styling for the application and chord result grids.
- `preview.sh`: A shell script for local preview (likely starts a simple web server).
- `README.md`: Project documentation and autonomous development disclaimer.

## Building and Running

Since this is a client-side vanilla JavaScript project, there is no build step.

-   **Running Locally:** Open `index.html` directly in a web browser.
-   **Preview Script:** Run `./preview.sh` (ensure it has execution permissions: `chmod +x preview.sh`).

## Development Conventions

-   **Vanilla JS:** Prefer standard browser APIs and avoid adding external dependencies unless necessary for music theory or rendering.
-   **Functional Logic:** `index.js` uses pure functions where possible for data transformation (e.g., `notesToAbc`, `getPitchClasses`).
-   **DOM Interaction:** Event listeners are initialized within a `DOMContentLoaded` block.
-   **Error Handling:** Basic `try...catch` blocks are used around parsing and rendering logic to prevent app crashes on invalid input.
-   **Styling:** Use the `.chord-grid` and `.chord-cell` classes in `style.css` for consistent rendering of multiple chord results.
