import {AfterViewInit, Component, OnDestroy} from "@angular/core";

import Reveal from 'reveal.js';
import RevealMath from "reveal.js/plugin/math/math";
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: 'ihp-baby-seminar',
  templateUrl: 'ihp-baby-seminar.html',
  styleUrls: ['ihp-baby-seminar.component.sass'],
  imports: [
    NgOptimizedImage
  ],
  standalone: true
})
export class IhpBabySeminar implements AfterViewInit, OnDestroy {
  ngAfterViewInit() {
    console.log('initializing');

    if (Reveal.isReady()) {
      Reveal.sync();
      return;
    }

    Reveal.initialize(
      {
        plugins: [RevealMath.MathJax3],
        transition: 'fade',
        center: false,
      }
    ).then((v) => console.log(v));
  }

  ngOnDestroy() {
    Reveal.destroy();
  }
}