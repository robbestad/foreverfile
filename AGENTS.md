# ForeverFile

SvenJS 3.3.0 + Vite. Components are `create({ initialState, render, onMount, onDestroy })`. `setState` replaces the whole state object. Shared wallet state is `createStore` plus `this.observe(store)`.

JSX: `"jsx": "react-jsx"`, `"jsxImportSource": "svenjs"`. There are no React function components.

Signing and upload run in the browser. Do not add server routes that accept a JWK or file bytes.
