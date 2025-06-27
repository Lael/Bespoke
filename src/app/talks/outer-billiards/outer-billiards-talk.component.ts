import {AfterViewInit, Component, OnInit} from "@angular/core";

import Reveal from 'reveal.js';

import 'reveal.js/dist/reveal.css';

// import 'reveal.js/dist/theme/black.css';


@Component({
    selector: 'outer-billiards-talk',
    templateUrl: 'outer-billiards-talk.component.html',
    // styleUrls: ['../../../../node_modules/reveal.js/dist/reveal.css',
    //     '../../../../node_modules/reveal.js/dist/theme/black.css'],
    standalone: true
})
export class OuterBilliardsTalkComponent implements OnInit, AfterViewInit {
    ngOnInit(): void {
    }

    ngAfterViewInit() {
        console.log('initializing');
        Reveal.initialize().then((v) => console.log(v));
    }
}