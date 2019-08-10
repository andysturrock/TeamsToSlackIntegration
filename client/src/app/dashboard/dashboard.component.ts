import {Component} from '@angular/core';
import {DataService} from '../data/data.service';
import {ChannelMapping} from '../channelMapping';
import {DataSource} from '@angular/cdk/table';
import {Observable} from 'rxjs/Observable';
import {GraphService} from '../graph/graph.service';
import {MappingDialogComponent} from '../mapping-dialog/mapping-dialog.component';
import {MatDialog} from '@angular/material';
import * as util from 'util';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  constructor(public graph: GraphService, public dialog: MatDialog, private dataService: DataService) {
  }

  private dataSource = new ChannelMappingDataSource(this.dataService);

  getDataSource() {
    return this.dataSource;
  }

  displayDeleteButton(element): boolean {
    return (element && this.graph.getUser() && element.mappingOwner.id == this.graph.getUser().id)
  }

  deleteMapping(id) {
    if (this.graph.isAuthenticated()) {
      this.dataService.deleteMapping(id);
      this.dataSource = new ChannelMappingDataSource(this.dataService);
    } else {
      alert('Log in to add/edit/delete mappings');
    }
  }

  getDisplayedColumns() {
    if(this.graph.isAuthenticated()) {
      return ['teams', 'slack', 'owner', 'delete'];
    } else {
      return ['teams', 'slack', 'owner'];
    }
  }

  openDialog(): void {
    let dialogRef = this.dialog.open(MappingDialogComponent, {
      width: '600px',
      data: 'Add Mapping'
    });
    dialogRef.componentInstance.event.subscribe((result) => {
      this.dataService.addMappingAsync(result.data);
      this.dataSource = new ChannelMappingDataSource(this.dataService);
    });
  }
}

export class ChannelMappingDataSource extends DataSource<any> {
  constructor(private dataService: DataService) {
    super();
  }

  connect(): Observable<ChannelMapping[]> {
    return this.dataService.getData();
  }

  disconnect() {
  }
}
