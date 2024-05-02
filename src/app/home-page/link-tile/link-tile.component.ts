import {Component, Input, OnInit} from '@angular/core';
import {RouterLink} from "@angular/router";
import {CommonModule} from "@angular/common";

@Component({
    selector: 'link-tile',
    templateUrl: './link-tile.component.html',
    styleUrls: ['./link-tile.component.sass'],
    imports: [RouterLink, CommonModule],
    standalone: true,
})
export class LinkTileComponent implements OnInit {

    @Input('title') title: string = 'Unnamed Demo';
    @Input('path') path: string = '/';
    @Input('image') image: string = '';
    @Input('highlight') highlight: boolean = false;

    constructor() {
    }

    ngOnInit(): void {
    }

}
