import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucidePlus, LucideReceiptText, LucideSettings } from '@lucide/angular';

@Component({
  selector: 'app-control-bar',
  imports: [RouterLink, RouterLinkActive, LucidePlus, LucideReceiptText, LucideSettings],
  templateUrl: './control-bar.html',
  styleUrl: './control-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlBar {}
