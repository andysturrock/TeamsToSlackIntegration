import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faUserCircle } from '@fortawesome/free-regular-svg-icons';
import { MsalModule } from '@azure/msal-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TopNavBarComponent } from './top-nav-bar/top-nav-bar.component';
import { OAuthSettings } from '../oauth';
import { HomeComponent } from './home/home.component';
import { MappingCardComponent } from './mapping-card/mapping-card.component';
import {MatCardModule} from '@angular/material/card';

// Add FontAwesome icons
library.add(faExternalLinkAlt);
library.add(faUserCircle);

@NgModule({
  declarations: [
    AppComponent,
    TopNavBarComponent,
    HomeComponent,
    MappingCardComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FontAwesomeModule,
    MsalModule.forRoot({
      clientID: OAuthSettings.appId
    }),
    MatCardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
