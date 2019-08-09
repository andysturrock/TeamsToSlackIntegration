import { Component } from '@angular/core';
import { GraphService } from './graph/graph.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(public auth: GraphService) {
  }
}