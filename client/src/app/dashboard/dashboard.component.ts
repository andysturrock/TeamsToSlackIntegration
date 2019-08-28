import { Component } from '@angular/core';
import { DataService } from '../data/data.service';
import { ChannelMapping } from '../channelMapping';
import { DataSource } from '@angular/cdk/table';
import { Observable, of } from 'rxjs';
import { GraphService } from '../graph/graph.service';
import { MappingDialogComponent } from '../mapping-dialog/mapping-dialog.component';
import { ErrorPopupDialogComponent } from '../mapping-dialog/error-popup-dialog.component';
import { MatDialog } from '@angular/material';
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

  deleteMapping(element) {
    if (this.graph.isAuthenticated()) {
      this.dataService.deleteMappingAsync(element).then(() => { this.dataSource = new ChannelMappingDataSource(this.dataService); });
    } else {
      alert('Log in to add/edit/delete mappings');
    }
  }

  getDisplayedColumns() {
    if (this.graph.isAuthenticated()) {
      return ['teams', 'slack', 'owner', 'delete'];
    } else {
      return ['teams', 'slack', 'owner'];
    }
  }

  openDialog(): void {
    const mappingDialogRef = this.dialog.open(MappingDialogComponent, {
      width: '600px',
      data: 'Add Mapping'
    });
    mappingDialogRef.componentInstance.event.subscribe(async (result) => {
      try {
        await this.dataService.addMappingAsync(result.data);
        this.dataSource = new ChannelMappingDataSource(this.dataService);
      }
      catch (error) {
        this.dialog.open(ErrorPopupDialogComponent, {
          width: '600px',
          data: {title: 'Error adding channel mapping', errorText: JSON.stringify(error)}
        });
      }
    });
  }
}

export class ChannelMappingDataSource extends DataSource<any> {
  constructor(private dataService: DataService) {
    super();
  }

  connect(): Observable<ChannelMapping[]> {
    return this.dataService.getMappings();
  }

  disconnect() {
  }
}
