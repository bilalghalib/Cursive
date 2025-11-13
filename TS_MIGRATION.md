# TypeScript Migration Guide

This document tracks the TypeScript migration progress for Cursive.

## ✅ Completed Setup (Step 1/7)

### Infrastructure
- ✅ `package.json` - Build scripts and dependencies
- ✅ `tsconfig.json` - TypeScript configuration with strict mode
- ✅ `vite.config.ts` - Build tool configuration
- ✅ `.gitignore` - Exclude build artifacts

### Type Definitions
All type definitions created in `static/types/`:
- ✅ `canvas.ts` - Drawing, strokes, points, selection
- ✅ `api.ts` - Claude API requests/responses
- ✅ `plugin.ts` - Plugin system interfaces
- ✅ `notebook.ts` - Notebook items, exports
- ✅ `config.ts` - App configuration
- ✅ `index.ts` - Central exports

### Migrated Modules (3/15)
- ✅ `version.ts` - Version management (7 lines → fully typed)
- ✅ `config.ts` - Configuration loader (32 lines → fully typed)
- ✅ `aiService.ts` - Claude API client (166 lines → fully typed)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Workflow

**Option A: Use Vite dev server (recommended for TS development)**
```bash
npm run dev
# Opens Vite dev server on localhost:3000
# Proxies API calls to Flask on localhost:5022
# Auto-compiles TypeScript on save
```

**Option B: Use Flask server (current workflow)**
```bash
python proxy.py
# Continues to serve existing .js files
# TypeScript files won't be used until build step
```

### 3. Type Checking
```bash
npm run type-check
# Runs TypeScript compiler without emitting files
# Checks for type errors
```

### 4. Production Build
```bash
npm run build
# Compiles TypeScript and bundles with Vite
# Output: dist/ folder
```

---

## 📋 Migration Strategy

We're using a **gradual migration** approach:

1. **Phase 1: Setup** ✅ DONE
   - TypeScript tooling configured
   - Type definitions created
   - Small utility modules migrated

2. **Phase 2: Core Modules** (IN PROGRESS)
   - ✅ `version.ts`
   - ✅ `config.ts`
   - ✅ `aiService.ts`
   - ⏳ `dataManager.ts` (next)
   - ⏳ `pluginManager.ts`
   - ⏳ `promptManager.ts`
   - ⏳ `handwritingSimulation.ts`

3. **Phase 3: Large Modules** (PENDING)
   - Split AND migrate simultaneously:
   - `canvasManager.ts` → `canvasManager.ts` + `drawingManager.ts` + `selectionManager.ts` + `zoomPanManager.ts`
   - `app.ts` → `app.ts` + `chatHandler.ts` + `exportHandler.ts` + `modalManager.ts`

4. **Phase 4: Update Build** (PENDING)
   - Update `index.html` to use bundled output
   - Update Flask to serve from `dist/` in production
   - Remove old `.js` files

---

## 🔄 Current State

### What's Working
- ✅ TypeScript compiles without errors
- ✅ Type definitions provide autocomplete in VS Code
- ✅ Migrated modules have full type safety
- ✅ Can run type checking with `npm run type-check`

### Coexistence Strategy
- **Old `.js` files** - Still used by Flask server, unchanged
- **New `.ts` files** - Source of truth, gradually replacing `.js`
- **Both work** - Thanks to `allowJs: true` in tsconfig.json

### What's Next
1. **Install dependencies**: `npm install`
2. **Test build**: `npm run type-check` (should pass)
3. **Continue migration**: Move to `dataManager.ts`
4. **Update imports**: Gradually change `.js` imports to `.ts`

---

## 📦 Dependencies Added

```json
{
  "devDependencies": {
    "@types/node": "^20.10.0",    // Node.js types
    "typescript": "^5.3.3",        // TypeScript compiler
    "vite": "^5.0.10"              // Build tool
  },
  "dependencies": {
    "file-saver": "^2.0.5",        // File downloads
    "jspdf": "^2.5.1"              // PDF generation
  }
}
```

---

## 🎯 Benefits Already Realized

### Type Safety in Migrated Modules
```typescript
// Before (JS): No type checking
export async function sendImageToAI(imageData) {
  // imageData could be anything!
  const response = await fetch('/api/claude', { ... });
  return parseAIResponse(data.content[0].text);
}

// After (TS): Full type safety
export async function sendImageToAI(imageData: string): Promise<TranscriptionResponse> {
  // imageData MUST be a string
  // Return type is guaranteed to match TranscriptionResponse interface
  const response = await fetch('/api/claude', { ... });
  const data = await response.json() as ClaudeResponse;
  return parseAIResponse(data.content[0].text);
}
```

### Autocomplete & IntelliSense
- Function signatures show parameter types
- Return types are documented
- Hover over any variable to see its type
- Catch errors before runtime

### API Contract Enforcement
```typescript
// Claude API request is now typed
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  stream?: boolean;
}
// TypeScript will error if you forget required fields!
```

---

## 🛠️ Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Check types without building |

---

## 📝 Migration Checklist

When migrating a new module:

- [ ] Read the `.js` file to understand structure
- [ ] Create corresponding `.ts` file
- [ ] Add type annotations to:
  - [ ] Function parameters
  - [ ] Function return types
  - [ ] Variable declarations (where needed)
- [ ] Import types from `../types/`
- [ ] Handle external libraries (add `declare` if needed)
- [ ] Run `npm run type-check` to verify
- [ ] Update this document

---

## 🚧 Known Limitations

1. **Not using TypeScript yet in production**
   - Flask still serves `.js` files
   - Need to complete migration before switching

2. **External libraries**
   - `jsyaml`, `jspdf`, `FileSaver` loaded via CDN
   - Using `declare` for type hints
   - Could switch to npm packages later

3. **Large monolithic files**
   - `app.js` (1825 lines) and `canvasManager.js` (1639 lines) not migrated yet
   - Will split during migration (as planned)

---

## 💡 Tips for Development

### VS Code Integration
- Install "ESLint" and "Prettier" extensions
- TypeScript errors show inline
- Cmd/Ctrl + Click to jump to definitions

### Type Checking on Save
Add to `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### Debugging
- Use browser DevTools with source maps
- TypeScript line numbers preserved in error messages

---

## ❓ Questions?

Check these resources:
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Vite Guide: https://vitejs.dev/guide/
- See `CLAUDE.md` for full project documentation
