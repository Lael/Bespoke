import {effect, Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // A signal to hold the current dark mode status
  isDarkMode = signal<boolean>(false);

  constructor() {
    const query = window.matchMedia('(prefers-color-scheme: dark)');

    // Set initial value
    this.isDarkMode.set(query.matches);

    // Watch for system-level changes
    query.addEventListener('change', (event) => {
      this.isDarkMode.set(event.matches);
    });

    // Optional: Log changes or apply a global CSS class
    effect(() => {
      console.log('System theme changed! Dark mode is now:', this.isDarkMode());
      this.applyTheme(this.isDarkMode());
    });
  }

  private applyTheme(isDark: boolean) {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }
}