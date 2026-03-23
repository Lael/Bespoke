import {
  AfterViewInit,
  Component,
  inject,
  Injector,
  OnDestroy,
  Type,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation
} from '@angular/core';
import {RouterLink} from "@angular/router";
import {demoRoutes, otherDemoRoutes, Previewable, talkRoutes} from "../app.routes";
import {WebGLRenderer} from "three";
import {ColorMode} from "../demos/color-scheme";
import {PREVIEW_RENDERER} from "../widgets/three-demo/preview-renderer";
import {ThemeService} from "../theme-service";
import {animate, query, stagger, style, transition, trigger} from "@angular/animations";
import {MagneticCardDirective} from "./magnetic-card";
import {MatCard, MatCardTitle} from "@angular/material/card";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButtonModule} from "@angular/material/button";

interface DemoConfig {
  component: Type<Previewable>,
  title: string,
  path: string,
  lightPreview: string | null;
  darkPreview: string | null;
}

interface OtherDemoConfig {
  title: string,
  path: string,
}

interface TalkConfig {
  title: string,
  path: string,
}

// enum Page {
//   DEMOS = 'Demos',
//   TALKS = 'Talks',
//   ABOUT = 'About Me',
// }

type Page = 'Demos' | 'Talks' | 'About Me';

@Component({
  selector: 'home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.sass'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    RouterLink, MagneticCardDirective, MatCard, MatProgressSpinner, MatCardTitle, MatButtonModule],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({opacity: 0, transform: 'translateY(20px)'}),
          stagger('100ms', [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)',
              style({opacity: 1, transform: 'translateY(0)'}))
          ])
        ], {optional: true})
      ])
    ]),
  ]
})
export class HomePageComponent implements AfterViewInit, OnDestroy {
  private injector = inject(Injector);
  themeService: ThemeService = inject(ThemeService);
  // isDarkTheme$ = this.themeService.isDark$;

  demos: DemoConfig[] = demoRoutes
    .map(route => {
      return {
        ...route,
        lightPreview: null,
        darkPreview: null,
      }
    });

  otherDemos: OtherDemoConfig[] = otherDemoRoutes.map(route => {
    return {...route};
  })

  pages: Page[] = ['Demos', 'Talks', 'About Me'];
  selectedPage: Page = 'Demos';

  talks: TalkConfig[] = talkRoutes.map(route => {
    return {...route};
  });

  selectPage(page: Page) {
    this.selectedPage = page;
  }

  get demosCount() {
    return this.demos.length;
  }

  get otherDemosCount() {
    return this.otherDemos.length;
  }

  get talksCount() {
    return this.talks.length;
  }

  @ViewChild('container', {read: ViewContainerRef}) container!: ViewContainerRef;

  ngAfterViewInit(): void {
    // Approximate the stagger time (e.g., 100ms per item + 600ms base)
    // const animationDuration = (this.demos.length * 100) + 600;

    setTimeout(() => {
      this.generatePreviewsNonBlocking();
    });
  }

  async generatePreviewsNonBlocking() {
    const renderer = new WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });

    const queue: DemoConfig[] = [...this.demos];

    const processNext = async () => {
      if (queue.length === 0) return;

      const demo = queue.shift();
      if (!demo) return;

      const componentRef = this.container.createComponent(demo.component, {
        injector: Injector.create({
          providers: [{provide: PREVIEW_RENDERER, useValue: renderer}],
          parent: this.injector
        })
      });

      const instance = componentRef.instance;
      instance

      if (instance.initPromise !== null) {
        console.log(`waiting for ${demo.title}`);
        await instance.initPromise;
        console.log('done waiting');
      }

      this.generatePreview(instance, demo, renderer, true);
      this.generatePreview(instance, demo, renderer, false);

      this.container.remove();
      setTimeout(() => processNext(), 32);
    };

    await processNext();

    renderer.dispose();
  }

  generatePreview(instance: Previewable, demo: DemoConfig, renderer: WebGLRenderer, dark: boolean) {
    const dpr = window.devicePixelRatio || 1;
    const containerWidth = 450;
    const containerHeight = containerWidth * (10 / 16); // 16:10 aspect ratio
    renderer.setSize(containerWidth * dpr, containerHeight * dpr, false);
    renderer.setPixelRatio(dpr);

    if (dark) {
      instance.renderPreview(containerWidth * dpr, containerHeight * dpr, ColorMode.Dark);
      demo.darkPreview = renderer.domElement.toDataURL('image/png');
    } else {
      instance.renderPreview(containerWidth * dpr, containerHeight * dpr, ColorMode.Light);
      demo.lightPreview = renderer.domElement.toDataURL('image/png');
    }
  }

  ngOnDestroy() {
    this.demos.forEach(item => {
      if (item.darkPreview) {
        URL.revokeObjectURL(item.darkPreview);
      }
      if (item.lightPreview) {
        URL.revokeObjectURL(item.lightPreview);
      }
    });
  }
}
