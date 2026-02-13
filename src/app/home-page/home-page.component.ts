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
import {demoRoutes, talkRoutes} from "../app.routes";
import {MatCard, MatCardActions, MatCardHeader, MatCardImage, MatCardTitle} from "@angular/material/card";
import {AsyncPipe, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {WebGLRenderer} from "three";
import {ThreeDemoComponent} from "../widgets/three-demo/three-demo.component";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatButton} from "@angular/material/button";
import {ColorMode} from "../demos/color-scheme";
import {MatRipple} from "@angular/material/core";
import {PREVIEW_RENDERER} from "../widgets/three-demo/preview-renderer";
import {ThemeService} from "../theme-service";
import {MatButtonToggle, MatButtonToggleGroup} from "@angular/material/button-toggle";
import {MatIcon} from "@angular/material/icon";
import {animate, query, stagger, style, transition, trigger} from "@angular/animations";
import {MagneticCardDirective} from "./magnetic-card";

interface DemoConfig {
  component: Type<ThreeDemoComponent>,
  title: string,
  path: string,
  lightPreview: string | null;
  darkPreview: string | null;
}

interface TalkConfig {
  title: string,
  path: string,
}

@Component({
  selector: 'home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.sass'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterLink, MatCard, MatCardTitle, NgForOf, NgIf, NgOptimizedImage, MatProgressSpinner, MatCardActions, MatButton, MatCardImage, MatCardHeader, MatRipple, MatButtonToggle, MatButtonToggleGroup, MatIcon, AsyncPipe, MagneticCardDirective],
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({opacity: 0, transform: 'translateY(20px)'}),
          stagger('100ms', [
            animate('600ms cubic-bezier(0.35, 0, 0.25, 1)',
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
  isDarkTheme$ = this.themeService.isDark$;

  demos: DemoConfig[] = demoRoutes
    .map(route => {
      return {
        ...route,
        lightPreview: null,
        darkPreview: null,
      }
    });

  talks: TalkConfig[] = talkRoutes.map(route => {
    return {...route};
  });

  get demosCount() {
    return this.demos.length;
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

      await instance.initPromise;
      this.generatePreview(instance, demo, renderer, true);
      this.generatePreview(instance, demo, renderer, false);

      componentRef.destroy();
      setTimeout(() => processNext(), 32);
    };

    await processNext();

    renderer.dispose();
  }

  generatePreview(instance: ThreeDemoComponent, demo: DemoConfig, renderer: WebGLRenderer, dark: boolean) {
    const dpr = window.devicePixelRatio || 1;
    const containerWidth = 450;
    const containerHeight = containerWidth * (10 / 16); // 16:10 aspect ratio
    renderer.setSize(containerWidth * dpr, containerHeight * dpr, false);
    renderer.setPixelRatio(dpr);

    if (dark) {
      instance.renderPreview(containerWidth, containerHeight, ColorMode.Dark);
      demo.darkPreview = renderer.domElement.toDataURL('image/png');
    } else {
      instance.renderPreview(containerWidth, containerHeight, ColorMode.Light);
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
