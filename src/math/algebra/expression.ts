export class Expression {
    constructor(private readonly root: ExpressionNode) {
    }

    evaluate(variables: Map<string, number>): number {
        return this.root.evaluate(variables);
    }

    static parse(text: string): Expression {
        const tokens = Expression.tokenize(text);
        console.log(tokens.map(t => t.text));
        return new Expression(new ExpressionNode(tokens));
    }

    static tokenize(text: string): Token[] {
        const tokens: Token[] = [];
        let remainder = text.toLowerCase().replace(/\s/g, '');
        let t: Token | undefined = undefined;
        while (remainder.length > 0) {
            t = Expression.nextToken(remainder, t);
            tokens.push(t);
            remainder = remainder.substring(t.text.length);
        }
        return tokens;
    }

    static nextToken(text: string, lastToken?: Token): Token {
        // if the next character is a minus sign:
        //      if the previous token is an open paren, a binary operation, or nothing, then we should treat - as a
        //          unary operator
        //      if the previous token is a close paren, a variable, a number, ???, it should be treated as a binary
        //          operator
        if (text.startsWith('-')) {
            if (!lastToken ||
                lastToken.type == ExpressionNodeType.BINARY ||
                (lastToken.type == ExpressionNodeType.DELIMITER && lastToken.text == '(')) {
                return UNARY_MINUS_TOKEN;
            }
        }
        for (let i = 0; i < TOKENS.length; i++) {
            if (text.startsWith(TOKENS[i].text)) return TOKENS[i];
        }
        // check for number
        const matches = text.match(NUMBER_REGEX);
        const match = matches ? matches[0] : null;
        if (!!match && text.startsWith(match)) {
            return {text: match, content: Expression.parseNumber(match), type: ExpressionNodeType.NUMBER};
        }

        // check for variable
        const char = text.charAt(0)
        if (/[a-zA-Z]/.test(char)) {
            return {text: char, content: char, type: ExpressionNodeType.VARIABLE};
        }
        throw Error(`unrecognized token: ${text}`);
    }

    static parseNumber(text: string): number {
        if (text.includes('e')) {
            const parts = text.split('e');
            const mantissa = Number.parseFloat(parts[0]);
            const exponent = Number.parseInt(parts[1]);
            return mantissa * Math.pow(10, exponent);
        }
        return Number.parseFloat(text);
    }

    toString(): string {
        return this.root.toString(0);
    }
}

const NUMBER_REGEX = /^([0-9]\.[0-9]+e[+\-]?[0-9]+)|([0-9]+(\.[0-9]+)?)/;

enum ExpressionNodeType {
    NUMBER,
    VARIABLE,
    UNARY,
    BINARY,
    DELIMITER,
}

type UnaryOperator = (input: number) => number;
type BinaryOperator = (a: number, b: number) => number;


interface Token {
    text: string,
    content: number | string | UnaryOperator | BinaryOperator | null,
    type: ExpressionNodeType,
}

// a - b
// -1
// -b
// exp(-a)
// if we have a minus

const UNARY_MINUS_TOKEN = {text: '-', content: (a: number) => -a, type: ExpressionNodeType.UNARY};

const TOKENS: Token[] = [
    {text: '(', content: null, type: ExpressionNodeType.DELIMITER},
    {text: ')', content: null, type: ExpressionNodeType.DELIMITER},
    {text: 'sqrt', content: Math.sqrt, type: ExpressionNodeType.UNARY},
    {text: 'sin', content: Math.sin, type: ExpressionNodeType.UNARY},
    {text: 'cos', content: Math.cos, type: ExpressionNodeType.UNARY},
    {text: 'tan', content: Math.tan, type: ExpressionNodeType.UNARY},
    {text: 'sinh', content: Math.sinh, type: ExpressionNodeType.UNARY},
    {text: 'cosh', content: Math.cosh, type: ExpressionNodeType.UNARY},
    {text: 'tanh', content: Math.tanh, type: ExpressionNodeType.UNARY},
    {text: 'asinh', content: Math.asinh, type: ExpressionNodeType.UNARY},
    {text: 'acosh', content: Math.acosh, type: ExpressionNodeType.UNARY},
    {text: 'atanh', content: Math.atanh, type: ExpressionNodeType.UNARY},
    {text: 'sec', content: (x: number) => 1 / Math.cos(x), type: ExpressionNodeType.UNARY},
    {text: 'csc', content: (x: number) => 1 / Math.sin(x), type: ExpressionNodeType.UNARY},
    {text: 'cot', content: (x: number) => 1 / Math.tan(x), type: ExpressionNodeType.UNARY},
    {text: 'asin', content: Math.asin, type: ExpressionNodeType.UNARY},
    {text: 'acos', content: Math.acos, type: ExpressionNodeType.UNARY},
    {text: 'atan', content: Math.atan, type: ExpressionNodeType.UNARY},
    {text: 'exp', content: Math.exp, type: ExpressionNodeType.UNARY},
    {text: 'log', content: Math.log, type: ExpressionNodeType.UNARY},
    {text: 'ln', content: Math.log, type: ExpressionNodeType.UNARY},
    {text: '+', content: (a: number, b: number) => a + b, type: ExpressionNodeType.BINARY},
    {text: '-', content: (a: number, b: number) => a - b, type: ExpressionNodeType.BINARY},
    {text: '*', content: (a: number, b: number) => a * b, type: ExpressionNodeType.BINARY},
    {text: '/', content: (a: number, b: number) => a / b, type: ExpressionNodeType.BINARY},
    {text: '^', content: Math.pow, type: ExpressionNodeType.BINARY},
    {text: 'pi', content: Math.PI, type: ExpressionNodeType.NUMBER},
    {text: 'e', content: Math.E, type: ExpressionNodeType.NUMBER},
];

class ExpressionNode {
    private readonly token: Token;
    private readonly children: ExpressionNode[];

    constructor(tokens: Token[]) {
        const trimmedTokens = ExpressionNode.trimParens(tokens);
        if (trimmedTokens.length === 0) throw Error('no tokens');
        if (trimmedTokens.length === 1) {
            this.token = trimmedTokens[0];
            this.children = [];
            return;
        }

        const i = ExpressionNode.splittingIndex(trimmedTokens);
        const token = trimmedTokens[i];
        const children: ExpressionNode[] = [];
        if (i > 0) children.push(new ExpressionNode(trimmedTokens.slice(0, i)));
        if (i < trimmedTokens.length) children.push(new ExpressionNode(trimmedTokens.slice(i + 1, trimmedTokens.length)));

        switch (token.type) {
        case ExpressionNodeType.NUMBER:
            if (typeof token.content !== 'number') throw Error('number node should have number content');
            if (children.length !== 0) throw Error('number node should not have any children');
            break;
        case ExpressionNodeType.VARIABLE:
            if (typeof token.content !== 'string') throw Error('variable node should have string content');
            if (children.length !== 0) throw Error('variable node should not have any children');
            break;
        case ExpressionNodeType.UNARY:
            // if (token.content !instanceof ) throw Error('function node should have function content');
            if (children.length !== 1) throw Error('function node should have two children');
            break;
        case ExpressionNodeType.BINARY:
            // if (token.content !instanceof BinaryOperation)
            //     throw Error('binary operation node should have binary operation content');
            if (children.length !== 2) throw Error('binary operation node should have one child');
            break;
        default:
            throw Error('unknown expression node type');
        }
        this.token = token;
        this.children = children;
    }

    private static splittingIndex(tokens: Token[]): number {
        if (tokens[0].type === ExpressionNodeType.UNARY) {
            if (tokens.length === 2) return 0;
            if (tokens[1].text === '('
                && tokens[tokens.length - 1].text === ')'
                && this.validateParens(tokens.slice(2, tokens.length - 1))) {
                return 0;
            }
        }

        let parenDepth = 0;
        const binaryOperatorIndices: number[] = [];
        const binaryOperatorText: string[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.text === '(') parenDepth++;
            if (t.text === ')') parenDepth--;
            if (parenDepth === 0 && t.type === ExpressionNodeType.BINARY) {
                binaryOperatorIndices.push(i);
                binaryOperatorText.push(t.text);
            }
        }
        for (let i = 0; i < binaryOperatorIndices.length; i++) {
            if (binaryOperatorText[i] === '+' || binaryOperatorText[i] === '-') return binaryOperatorIndices[i];
        }

        if (tokens[0] === UNARY_MINUS_TOKEN) return 0;

        for (let i = 0; i < binaryOperatorIndices.length; i++) {
            if (binaryOperatorText[i] === '*' || binaryOperatorText[i] === '/') return binaryOperatorIndices[i];
        }
        for (let i = 0; i < binaryOperatorIndices.length; i++) {
            if (binaryOperatorText[i] === '^') return binaryOperatorIndices[i];
        }

        throw Error('no splitting index');
    }

    private static validateParens(tokens: Token[]): boolean {
        let depth = 0;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.text === '(') depth++;
            if (t.text === ')') {
                if (depth === 0) return false;
                depth--;
            }
        }
        return depth === 0;
    }

    private static trimParens(tokens: Token[]): Token[] {
        if (tokens.length < 2) return tokens;
        let trimmedTokens = tokens;
        while (trimmedTokens[0].text === '(' && trimmedTokens[trimmedTokens.length - 1].text === ')') {
            const slice = trimmedTokens.slice(1, trimmedTokens.length - 1);
            if (this.validateParens(slice)) trimmedTokens = slice;
            else break;
        }
        return trimmedTokens;
    }

    evaluate(variables: Map<string, number>): number {
        const childrenValues = this.children.map(c => c.evaluate(variables));
        switch (this.token.type) {
        case ExpressionNodeType.NUMBER:
            return <number>this.token.content;
        case ExpressionNodeType.VARIABLE:
            const variableValue = variables.get(<string>this.token.content);
            if (!variableValue || isNaN(variableValue)) throw Error('variable value not supplied');
            return variableValue;
        case ExpressionNodeType.UNARY:
            const unaryResult = (<UnaryOperator>this.token.content)(childrenValues[0]);
            if (isNaN(unaryResult)) throw Error('unary operation output is NaN');
            return unaryResult;
        case ExpressionNodeType.BINARY:
            const binaryResult = (<BinaryOperator>this.token.content)(childrenValues[0], childrenValues[1]);
            if (isNaN(binaryResult)) throw Error('binary operation output is NaN');
            return binaryResult;
        default:
            throw Error('unknown expression node type');
        }
    }

    toString(depth: number = 0): string {
        let spaces = '';
        for (let i = 0; i < depth; i++) spaces += '  ';
        let str = spaces + this.token.text + '\n';
        for (let i = 0; i < this.children.length; i++) {
            str += this.children[i].toString(depth + 1);
        }
        return str;
    }
}