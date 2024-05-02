import {ApplicationConfig, importProvidersFrom} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {HttpClientModule} from "@angular/common/http";
import {CommonModule} from "@angular/common";

export const appConfig: ApplicationConfig = {
    providers: [importProvidersFrom(HttpClientModule), provideRouter(routes), importProvidersFrom(CommonModule)]
};
