import {Component, Input, OnInit} from '@angular/core';
import {RouterLink} from "@angular/router";
import {CommonModule} from "@angular/common";
import {MatCard, MatCardHeader} from "@angular/material/card";
import {MatRipple} from "@angular/material/core";

@Component({
    selector: 'link-tile',
    templateUrl: './link-tile.component.html',
    styleUrls: ['./link-tile.component.sass'],
    standalone: true,
    imports: [RouterLink, CommonModule, MatCard, MatCardHeader, MatRipple]
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
