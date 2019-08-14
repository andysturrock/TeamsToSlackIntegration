import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
    selector: 'error-popup-dialog',
    templateUrl: 'error-popup-dialog.component.html',
    styleUrls: ['./error-popup-dialog.component.css']
  })
  export class ErrorPopupDialogComponent {
  
    constructor(
      public dialogRef: MatDialogRef<ErrorPopupDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) { }
  
    onNoClick(): void {
      this.dialogRef.close();
    }
  
  }