import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MappingCardComponent } from './mapping-card.component';

describe('MappingCardComponent', () => {
  let component: MappingCardComponent;
  let fixture: ComponentFixture<MappingCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MappingCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MappingCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
