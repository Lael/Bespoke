import {Component} from '@angular/core';
import {Expression} from "../../../../math/algebra/expression";
import {FunctionViewComponent} from "../function-view/function-view.component";

@Component({
    selector: 'app-functions-demo',
    templateUrl: './functions-demo.component.html',
    styleUrls: ['./functions-demo.component.sass'],
    imports: [FunctionViewComponent]
})
export class FunctionsDemoComponent {

    constructor() {
    }

    updateFunction(event: Event) {
        const content = (event.target as HTMLInputElement).value;
        console.log(`Input: ${content}`);
        const expression = Expression.parse(content);
        console.log(expression.toString());
        const variables = new Map<string, number>();
        console.log(expression.evaluate(variables));
    }
}
