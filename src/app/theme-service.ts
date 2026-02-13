import {Injectable, OnDestroy, Renderer2, RendererFactory2} from '@angular/core';
import {BehaviorSubject, combineLatest, fromEvent, map, Observable, startWith} from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({providedIn: 'root'})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private STORAGE_KEY = 'user-theme-preference';

  // 1. Track the "Mode" (The setting itself)
  private modeSubject = new BehaviorSubject<ThemeMode>(this.getInitialMode());
  mode$ = this.modeSubject.asObservable();

  // 2. The Media Query for system dark mode
  private darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  // 3. The "Output" Boolean: Calculated based on Mode + System State
  isDark$: Observable<boolean>;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);

    // Watch for system changes (e.g., sunset/sunrise triggers)
    const systemDark$ = fromEvent<MediaQueryListEvent>(this.darkQuery, 'change').pipe(
      map(e => e.matches),
      startWith(this.darkQuery.matches)
    );

    // Combine current user mode and system state to determine the final boolean
    this.isDark$ = combineLatest([this.mode$, systemDark$]).pipe(
      map(([mode, isSystemDark]) => {
        if (mode === 'dark') return true;
        if (mode === 'light') return false;
        return isSystemDark; // Default: follows 'auto'
      })
    );

    // Automatically apply CSS classes to the body for global styling
    this.isDark$.subscribe(isDark => this.applyThemeClass(isDark));
  }

  setMode(mode: ThemeMode) {
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.modeSubject.next(mode);
  }

  private getInitialMode(): ThemeMode {
    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode;
    return saved || 'auto';
  }

  private applyThemeClass(isDark: boolean) {
    if (isDark) {
      this.renderer.addClass(document.body, 'dark-theme');
      this.renderer.removeClass(document.body, 'light-theme');
    } else {
      this.renderer.addClass(document.body, 'light-theme');
      this.renderer.removeClass(document.body, 'dark-theme');
    }
  }

  ngOnDestroy() {
    // Standard subscription cleanup isn't strictly necessary for root services,
    // but good practice if you ever move this to a component level.
  }
}