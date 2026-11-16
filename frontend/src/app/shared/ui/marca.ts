import { ChangeDetectionStrategy, Component } from '@angular/core';
@Component({
  selector: 'app-marca',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex items-center gap-3 text-[22px] font-bold tracking-tight text-primario"
    ><img
      src="helpdesk-logo-icon.svg"
      alt=""
      width="40"
      height="40"
      class="h-10 w-10 shrink-0"
    />HelpDesk</span
  >`,
})
export class Marca {}
