import {AfterViewInit, Component, OnDestroy} from "@angular/core";

import Reveal from "reveal.js";
import RevealMath from "reveal.js/plugin/math/math";
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: "hamiltonian-talk",
  templateUrl: "hamiltonian-talk.component.html",
  styleUrls: ["hamiltonian-talk.component.sass"],
  imports: [NgOptimizedImage],
  standalone: true,
})
export class HamiltonianTalkComponent implements AfterViewInit, OnDestroy {
  ngAfterViewInit() {
    console.log("initializing");

    if (Reveal.isReady()) {
      Reveal.sync();
      return;
    }

    Reveal.initialize({
      plugins: [RevealMath.MathJax3],
      transition: "fade",
      center: false,
      // hash: true,
    }).then((v) => console.log(v));
  }

  ngOnDestroy() {
    Reveal.destroy();
  }
}
