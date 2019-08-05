import {Component} from '@angular/core';
import {DataService} from '../data/data.service';
import {ChannelMapping} from '../channelMapping';
import {DataSource} from '@angular/cdk/table';
import {Observable} from 'rxjs/Observable';
import {AuthService} from '../auth.service';
import {MappingDialogComponent} from '../mapping-dialog/mapping-dialog.component';
import {MatDialog} from '@angular/material';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  constructor(public auth: AuthService, public dialog: MatDialog, private dataService: DataService) {
  }

  displayedColumns = ['teams', 'slack', 'owner', 'delete'];
  dataSource = new ChannelMappingDataSource(this.dataService);

  deleteMapping(id) {
    if (this.auth.isAuthenticated()) {
      this.dataService.deleteMapping(id);
      this.dataSource = new ChannelMappingDataSource(this.dataService);
    } else {
      alert('Log in to add/edit/delete mappings');
    }
  }

  openDialog(): void {
    let dialogRef = this.dialog.open(MappingDialogComponent, {
      width: '600px',
      data: 'Add Mapping'
    });
    dialogRef.componentInstance.event.subscribe((result) => {
      this.dataService.addMapping(result.data);
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
