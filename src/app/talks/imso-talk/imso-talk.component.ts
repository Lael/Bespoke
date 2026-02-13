import {AfterViewInit, Component, OnDestroy} from "@angular/core";

import Reveal from 'reveal.js';
import RevealMath from "reveal.js/plugin/math/math";
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: 'imso-talk',
  templateUrl: 'imso-talk.html',
  styleUrls: ['imso-talk.sass'],
  imports: [
    NgOptimizedImage
  ],
  standalone: true
})
export class ImsoTalkComponent implements AfterViewInit, OnDestroy {

  ngAfterViewInit() {
    console.log('initializing');

    // if (Reveal.isReady()) {
    //   Reveal.sync();
    //   return;
    // }

    Reveal.initialize(
      {
        plugins: [RevealMath.MathJax3],
        transition: 'fade',
        center: false,
      }
    );
  }

  ngOnDestroy() {
    Reveal.destroy();
  }
}