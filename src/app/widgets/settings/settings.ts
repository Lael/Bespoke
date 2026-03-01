import {isSignal} from '@angular/core';

export type ControlType = 'number' | 'boolean' | 'string' | 'select' | 'function';

export class GuiControl {
  readonly isFolder = false;
  type: ControlType = 'string';
  label: string;
  isSignal: boolean;
  tooltipVal?: string;
  minVal?: number;
  maxVal?: number;
  stepVal?: number;
  optionsList?: any[];
  private _disabled?: boolean;
  private _condition: () => boolean = () => true;
  private _format: (v: any) => string = (v: any) => `${v}`;


  // We use 'any' internally for the storage, but the 'add' method
  // ensures the data entering the system is valid.
  constructor(public target: any, public property: string, private parent: GuiBase) {
    this.label = property;
    this.isSignal = isSignal(this.target[this.property]);
    this.inferType();
  }

  get value(): any {
    return this.isSignal ? this.target[this.property]() : this.target[this.property];
  }

  set value(val: any) {
    if (this.isSignal) this.target[this.property].set(val);
    else this.target[this.property] = val;
    this._onChange?.(val);
    this.parent.changed();
  }

  name(v: string) {
    this.label = v;
    return this;
  }

  min(v: number) {
    this.minVal = v;
    return this;
  }

  max(v: number) {
    this.maxVal = v;
    return this;
  }

  step(v: number) {
    this.stepVal = v;
    return this;
  }

  options(v: any[]) {
    this.type = 'select';
    this.optionsList = v;
    return this;
  }

  tooltip(tooltip: string) {
    this.tooltipVal = tooltip;
    return this;
  }

  showIf(condition: () => boolean) {
    this._condition = condition;
    return this;
  }

  get visible(): boolean {
    return this._condition();
  }

  get disabled(): boolean {
    return this._disabled ?? false;
  }

  format(f: (v: any) => string) {
    this._format = f;
    return this;
  }

  formatValue(v: any): string {
    return this._format(v);
  }

  private _onChange?: (v: any) => void;

  onChange(cb: (v: any) => void) {
    this._onChange = cb;
    return this;
  }

  private inferType() {
    const val = this.value;
    if (typeof val === 'function') this.type = 'function';
    else if (typeof val === 'number') this.type = 'number';
    else if (typeof val === 'boolean') this.type = 'boolean';
    else this.type = 'string';
  }
}

export type GuiItem = GuiControl | GuiFolder;

export abstract class GuiBase {
  children: GuiItem[] = [];
  protected _onChange: () => void = () => {
  };

  add<T extends object, K extends keyof T & string>(target: T, property: K,
                                                    min?: number, max?: number, step?: number): GuiControl {
    const control = new GuiControl(target, property, this);
    if (min !== undefined) control.min(min);
    if (max !== undefined) control.max(max);
    if (step !== undefined) control.step(step);
    this.children.push(control);
    return control;
  }

  addFolder(title: string): GuiFolder {
    const folder = new GuiFolder(title, this);
    this.children.push(folder);
    return folder;
  }

  changed() {
    this._onChange();
  }

  onChange(cb: () => void) {
    this._onChange = cb;
  }
}

export class Gui extends GuiBase {
}

export class GuiFolder extends GuiBase {
  readonly isFolder = true;
  private _condition: () => boolean = () => true;

  showIf(condition: () => boolean) {
    this._condition = condition;
    return this;
  }

  get visible(): boolean {
    return this._condition();
  }

  constructor(public title: string, private parent: GuiBase) {
    super();
  }


  override changed() {
    this._onChange();
    this.parent.changed();
  }
}