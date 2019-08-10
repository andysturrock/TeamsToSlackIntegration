import { TestBed } from '@angular/core/testing';

import { SlackWebApiService } from './slack-web-api.service';

describe('SlackWebApiService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SlackWebApiService = TestBed.get(SlackWebApiService);
    expect(service).toBeTruthy();
  });
});
