# Changelog

All notable changes to react-cerious-scroll will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-06-03

### Added
- `<CeriousScroll>` now accepts `children`. Rendered children are mounted inside the engine container alongside the engine's scrollbar strip. Combined with a user-supplied `<div data-cerious-scroll-content />`, this lets demos and apps wrap rows in custom DOM (e.g. an `overflow-x: auto` wrapper with a sticky header) without breaking the engine's mobile scrollbar pinning.

### Dependencies
- Bumped peer dependency `@ceriousdevtech/cerious-scroll` to `^1.0.3` to pick up horizontal flick momentum and the custom scrollbar thumb.

## [1.0.1] - 2026-06-01

### Changed
- Verified compatibility with `@ceriousdevtech/cerious-scroll` 1.0.2

### Dependencies
- Peer dependency `@ceriousdevtech/cerious-scroll` tested against `^1.0.2` (range `^1.0.1` already satisfies this)

---

## [1.0.0] - 2026-02-02

### Added
- Initial release of `@ceriousdevtech/react-cerious-scroll`
- `<CeriousScroll>` component — drop-in virtual scroll list for React 18+
- `useCeriousScroll` hook for headless usage with custom container elements
- React portal rendering for each row — rows live in the React tree so Context, providers, and refs work normally
- Synchronous height measurement (no estimated heights, no correction passes)
- Full TypeScript support with exported prop and hook types
- Peer dependency on `@ceriousdevtech/cerious-scroll` core engine
