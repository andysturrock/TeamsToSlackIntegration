import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import {AppComponent} from './app.component';
//import {MaterialModule} from './material.module';
import {
  MatSidenavModule,
  MatToolbarModule,
  MatIconModule,
  MatListModule,
  MatCardModule,
  MatButtonModule,
  MatTableModule,
  MatDialogModule,
  MatInputModule,
  MatSelectModule,
} from '@angular/material';


import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FlexLayoutModule} from '@angular/flex-layout';
import {WelcomeComponent} from './welcome/welcome.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {AppRouters} from './app.routes';
import {DataService} from './data/data.service';
import {AuthService} from './auth.service';
import {PostDialogComponent} from './post-dialog/post-dialog.component';
import {FormsModule} from '@angular/forms';


import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faUserCircle } from '@fortawesome/free-regular-svg-icons';
import { MsalModule } from '@azure/msal-angular';
import { OAuthSettings } from '../oauth';

// Add FontAwesome icons
library.add(faExternalLinkAlt);
library.add(faUserCircle);

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    DashboardComponent,
    PostDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    // MaterialModule,
    FlexLayoutModule,
    AppRouters,
    FormsModule,
    FontAwesomeModule,
    MsalModule.forRoot({
      clientID: OAuthSettings.appId
    }),


    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    MatInputModule,
    MatSelectModule,
  ],
  providers: [DataService, AuthService],
  bootstrap: [AppComponent],
  entryComponents: [
    PostDialogComponent
  ]
})
export class AppModule { }
