import {Directive, ElementRef, HostBinding, HostListener} from '@angular/core';

@Directive({
  selector: '[appMagneticCard]',
  standalone: true
})
export class MagneticCardDirective {
  // We bind these properties directly to the CSS variables on the element
  @HostBinding('style.--tilt-x') tiltX = '0deg';
  @HostBinding('style.--tilt-y') tiltY = '0deg';
  @HostBinding('style.--move-x') moveX = '0';
  @HostBinding('style.--move-y') moveY = '0';

  private readonly intensity = 8;

  constructor(private el: ElementRef) {
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const rect = this.el.nativeElement.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rotX = ((rect.height / 2 - y) / (rect.height / this.intensity)).toFixed(2);
    const rotY = ((x - rect.width / 2) / (rect.width / this.intensity)).toFixed(2);

    this.tiltX = `${rotX}deg`;
    this.tiltY = `${rotY}deg`;
    this.moveX = `${rotY}`;
    this.moveY = `${rotX}`;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    this.tiltX = '0deg';
    this.tiltY = '0deg';
    this.moveX = '0';
    this.moveY = '0';
  }
}