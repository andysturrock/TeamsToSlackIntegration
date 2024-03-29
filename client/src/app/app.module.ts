import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule }    from '@angular/common/http';

import { AppComponent } from './app.component';
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


import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FlexLayoutModule } from '@angular/flex-layout';
import { WelcomeComponent } from './welcome/welcome.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AppRouters } from './app.routes';
import { DataService } from './data/data.service';
import { GraphService } from './graph/graph.service';
import { SlackWebApiService } from './slack-web-api/slack-web-api.service'
import { ServerApiService } from './server-api/server-api.service';
import { MappingDialogComponent } from './mapping-dialog/mapping-dialog.component';
import { ErrorPopupDialogComponent } from './mapping-dialog/error-popup-dialog.component';
import { FormsModule } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faUserCircle } from '@fortawesome/free-regular-svg-icons';
import { MsalModule } from '@azure/msal-angular';
import { LogLevel } from "msal";
import { OAuthSettings } from '../oauth';
import { HomeComponent } from './home/home.component';

// Add FontAwesome icons
library.add(faExternalLinkAlt);
library.add(faUserCircle);

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    DashboardComponent,
    MappingDialogComponent,
    ErrorPopupDialogComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    BrowserAnimationsModule,
    // MaterialModule,
    FlexLayoutModule,
    AppRouters,
    FormsModule,
    FontAwesomeModule,
    MsalModule.forRoot({
      clientID: OAuthSettings.appId,
      redirectUri: OAuthSettings.redirectURI,
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
    MatSelectModule
  ],
  providers: [DataService, GraphService, SlackWebApiService, ServerApiService],
  bootstrap: [AppComponent],
  entryComponents: [
    MappingDialogComponent,
    ErrorPopupDialogComponent
  ]
})
export class AppModule { }
