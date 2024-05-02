import {Component, OnInit} from '@angular/core';
import {LinkTileComponent} from "./link-tile/link-tile.component";
import {RouterLink} from "@angular/router";

@Component({
    selector: 'home-page',
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.sass'],
    standalone: true,
    imports: [RouterLink, LinkTileComponent],
})
export class HomePageComponent implements OnInit {

    constructor() {
    }

    ngOnInit(): void {
    }

}
