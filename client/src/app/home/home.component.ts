import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph/graph.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(public graphService: GraphService) { }

  ngOnInit() {
  }

  async signIn(): Promise<void> {
    await this.graphService.signIn();
  }

}
