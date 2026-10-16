export const PROBLEM_CODE = `// An invite dialog sits at surface-5 (#333).
// The role picker hard-codes its own background…

<DialogContent>                       {/* surface-5 · #333 */}
  <RoleSelectTrigger />

  {/* ❌ Real elevation shadow, but the background is
      hard-coded to the dialog's own level */}
  <div className="bg-surface-5 shadow-surface-3 rounded-2xl p-1">
    <RoleItem label="Workspace owner" />
    <RoleItem label="Member" checked />
    <RoleItem label="Restricted member" />
  </div>
</DialogContent>

// surface-5 on surface-5 → the shadow gives a faint
// edge, but the body melts straight into the dialog.`;

export const TOKENS_CSS = `:root, .light {
  --surface-1: #FAFAFA;
  --surface-2: #FCFCFC;
  --surface-3: #FFFFFF;
  --surface-4: #FFFFFF;
  --surface-5: #FFFFFF;
  --surface-6: #FFFFFF;
  --surface-7: #FFFFFF;
  --surface-8: #FFFFFF;

  --shadow-color: rgb(0 0 0 / 0.06);
  --shadow-1: 0 0 0 1px var(--shadow-color);
  --shadow-2: 0 0 0 1px var(--shadow-color), 0 1px 1px -0.5px var(--shadow-color);
  /* …doubling drop layers up to --shadow-8 (96px blur) */
}

.dark {
  --surface-1: #171717;
  --surface-2: #1E1E1E;
  --surface-3: #252525;
  --surface-4: #2C2C2C;
  --surface-5: #333333;
  --surface-6: #3A3A3A;
  --surface-7: #414141;
  --surface-8: #484848;

  /* shadow recipe per level:
       inset top highlight + inset ring + outer hairline + stacked drops */
}`;

export const SUBSTRATE_CODE = `// Substrate flows through React context.
// Default substrate is 1 (the page background).

<Dropdown />                          // surface-3, on the page

<SurfaceProvider value={3}>           // inside a popover
  <Dropdown />                        // surface-5
</SurfaceProvider>

<SurfaceProvider value={5}>           // inside a dialog
  <Dropdown />                        // surface-7
</SurfaceProvider>

// Inside any elevated component:
const substrate = useSurface();       // 1, 3, or 5
const level = Math.min(substrate + 2, 8);`;

export const ELEVATED_SOURCE = `import { useSurface, SurfaceProvider } from "@/lib/surface-context";
import { surfaceClasses } from "@/lib/surface-classes";

const Elevated = forwardRef<HTMLDivElement, ElevatedProps>(
  ({ offset, shadowLevel, className, children, ...props }, ref) => {
    const substrate = useSurface();
    const level = Math.min(substrate + offset, 8);
    return (
      <SurfaceProvider value={level}>
        <div
          ref={ref}
          className={cn(surfaceClasses(level, shadowLevel ?? level), className)}
          {...props}
        >
          {children}
        </div>
      </SurfaceProvider>
    );
  }
);`;

export const ELEVATION_STACK_CODE = `// Drag both knobs to pick the slice of the ladder to nest.
const [[low, high], setRange] = useState([1, 4]);

<SurfaceProvider value={low}>        {/* base = surface-{low} */}
  <Elevated offset={1}>              {/* surface-{low + 1} */}
    {/* …nested up to surface-{high} */}
  </Elevated>
</SurfaceProvider>

<Slider value={[low, high]} min={1} max={8} step={1} showSteps
  onChange={setRange} />`;

export const COLOR_PICKER_CODE = `<ColorPicker defaultValue="#6B97FF" />

// FormatDropdown sits inside the picker panel (substrate 3),
// so it lifts to surface-5 automatically.`;

export const INVITE_DIALOG_CODE = `<Dialog open>
  <DialogContent>
    {/* DialogContent provides SurfaceProvider value={5} */}
    <RoleSelectTrigger />
    <Dropdown>                        {/* lifts to surface-7 */}
      <RoleItem label="Workspace owner" />
      <RoleItem label="Member" checked />
      <RoleItem label="Restricted member" />
    </Dropdown>
  </DialogContent>
</Dialog>`;
