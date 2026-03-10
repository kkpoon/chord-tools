# Chord Visualizer & Analysis Tools

A comprehensive web-based suite for chord visualization and harmonic analysis. This project provides real-time music notation rendering and chord detection capabilities.

## Autonomous Development Disclaimer

**This entire repository was authored autonomously by an AI Agent (Gemini CLI).** 

Every line of code, including the architectural decisions, logic flow, and styling, was generated through AI directives. As such, the human maintainer of this repository has not performed manual code reviews, refactoring, or quality assurance.

### Responsibility & Code Quality
- **No Human Oversight:** The code is provided "as-is" without human intervention or manual cleanup.
- **Experimental Nature:** This serves as a demonstration of AI-driven development. The human maintainer is not responsible for any bugs, performance issues, or unconventional coding patterns found within the codebase.
- **Maintenance:** There are no current plans for human-led refactoring or optimization.

## Features

- **Chord Visualizer:** Render any chord symbol (e.g., `Cmaj7`, `F#m7b5`) into standard music notation.
- **Chord Guessing:** Input a list of notes to identify potential chord matches.
- **Harmonic Suggestions:** Provides "rootless" and "missing tone" chord alternatives based on input pitch classes.

## Technical Stack

The AI Agent utilized the following libraries to implement these features:
- **[Tonal.js](https://tonaljs.github.io/tonal/):** For music theory logic and chord detection.
- **[ABCJS](https://www.abcjs.net/):** For dynamic rendering of sheet music in ABC notation.
- **Vanilla JavaScript & CSS:** For application logic and interface styling.

## Getting Started

To view the application, simply open `index.html` in any modern web browser or run the provided `preview.sh` script if available in your environment.
