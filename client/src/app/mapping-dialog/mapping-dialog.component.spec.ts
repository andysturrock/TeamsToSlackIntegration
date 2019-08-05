import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingDialogComponent } from './mapping-dialog.component';

describe('MappingDialogComponent', () => {
  let component: MappingDialogComponent;
  let fixture: ComponentFixture<MappingDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MappingDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MappingDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
