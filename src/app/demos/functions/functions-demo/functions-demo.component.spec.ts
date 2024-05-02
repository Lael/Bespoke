import {ComponentFixture, TestBed} from '@angular/core/testing';

import {FunctionsDemoComponent} from './functions-demo.component';

describe('FunctionsDemoComponent', () => {
    let component: FunctionsDemoComponent;
    let fixture: ComponentFixture<FunctionsDemoComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                declarations: [FunctionsDemoComponent]
            })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(FunctionsDemoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
