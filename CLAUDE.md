# Project rules

## Stack

- React 19, TypeScript, Vite, Tailwind CSS v4, pnpm.
- shadcn/ui style `base-nova`: primitives come from `@base-ui/react`, not Radix.
- Icons: `@tabler/icons-react` only.
- `components.json` is the source of truth for shadcn settings.

## Commands

- Dev: `pnpm dev`
- Verify before finishing: `pnpm build && pnpm lint`
- Typecheck only: `pnpm exec tsc -b`. Do not rely on `pnpm typecheck`: the root tsconfig has `files: []`, so it checks nothing.
- Add a component: `pnpm dlx shadcn@latest add <name>`
- Preview an add: `pnpm dlx shadcn@latest add <name> --dry-run`

## Using shadcn

- Check `src/components/ui` first, then the shadcn registry. Build a custom component only when neither fits.
- Always add components through the CLI. Never copy them by hand or from Radix-based examples.
- Do not run `shadcn init` again: it overwrites `iconLibrary` and `menuAccent` in `components.json`.
- Do not use `--overwrite` on a component without reviewing `--diff` first.
- Compose with `render`, not `asChild`: `<DialogPrimitive.Close render={<Button variant="outline" />}>`.
- Use existing `variant` and `size` props before adding `className` overrides.

## File placement

- `src/components/ui`: CLI-generated primitives. No business logic or API calls.
- `src/components`: shared app components composed from `ui`.
- `src/hooks`: shared hooks.
- `src/lib`: framework-free helpers.
- Import across folders with the `@/` alias.

## Styling

- Use semantic tokens from `src/index.css`: `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`.
- No hardcoded colors such as `bg-white`, `text-gray-500`, or hex values. They break dark mode.
- Add or change theme colors in `src/index.css`, in both `:root` and `.dark`.
- Merge conditional classes with `cn`.
- Theme state goes through `useTheme` from `@/components/theme-provider`.

## Accessibility

- Every input has a label.
- Icon-only buttons have an `aria-label`.
- Dialogs and sheets have a title.
