//Angular/Miscellaneous
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { HttpModule, JsonpModule } from '@angular/http';
import { MapService } from './map/services/map.service';
import { GeocodingService } from './map/services/geocoding.service';
import { Routes, RouterModule } from '@angular/router';
import { Routing } from './app.routing';
import { BaseRequestOptions } from '@angular/http';
import { AuthGuard } from '../_guards/auth.guard';
import { AdminGuard } from '../_guards/admin.guard';
import { Configuration } from '../_api/api.constants';
import { FilterPipe } from '../_pipes/rowfilter.pipe';
import { PagePipe } from '../_pipes/rowfilter2.pipe';
import { NumFilterPipe } from '../_pipes/numfilter.pipe';

//Angular Material
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdRadioModule } from '@angular/material';
import { MdMenuModule } from '@angular/material';
import { MdIconModule } from '@angular/material';
import { MdDialogModule } from '@angular/material';
import { MdSelectModule } from '@angular/material';
import { MdCheckboxModule } from '@angular/material';
import { MdInputModule } from '@angular/material';

//Components
import { LoginComponent } from './user/login.component';
import { HomeComponent } from './home/home.component';
import { AdminComponent } from './admin/admin.component';
import { AdminNavComponent } from './admin/adminnav/adminnav.component';
import { SettingsNavComponent } from './settings/settingsnav/settingsnav.component';
import { OrganizationComponent } from './admin/organization/organization.component';
import { LayerAdminComponent} from './admin/layeradmin/layeradmin.component';
import { LayerPermissionComponent} from './admin/layeradmin/layerpermission.component';
import { PageComponent} from './admin/user/page/page.component';
import { PageConfigComponent} from './admin/user/pageconfig/pageconfig.component';
import { LayerNewComponent } from './admin/layeradmin/layernew.component';
import { UserComponent } from './admin/user/user.component';
import { adminPagesComponent } from './admin/adminpages/adminpages.component';
import { ModulesComponent } from './admin/modules/modules.component';
import { DefaultsComponent } from './admin/defaults/defaults.component';
import { BoundariesComponent } from './admin/boundaries/boundaries.component';
import { NotificationsComponent } from './admin/notifications/notifications.component';
import { ServerComponent } from './admin/servers/server.component';
import { ConfirmdeleteComponent } from './admin/confirmdelete/confirmdelete.component';
import { SettingsComponent } from './settings/settings.component';
import { UserPagesComponent } from './settings/user-pages/user-pages.component';
import { PasswordComponent } from './settings/password/password.component';
import { MarkerDataComponent } from './marker_data/marker-data.component';
import { LayerControlsComponent } from './map/layer-controls/layer-controls.component';
import { ServerNewComponent } from './admin/servers/servernew.component';
import { ChangePasswordComponent } from './admin/user/changepassword/changepassword.component';
import { HeaderComponent } from './header/header.component';
import { SideNavComponent } from './sidenav/sidenav.component';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { MarkerComponent } from '../app/map/marker/marker.component';
import { NavigatorComponent } from '../app/map/navigator/navigator.component';
import { PagesComponent } from './pages/pages.component';

//Services
import { DepartmentService } from '../_services/department.service';
import { GroupService } from '../_services/group.service';
import { RoleService } from '../_services/role.service';
import { LayerAdminService } from '../_services/layeradmin.service';
import { LayerPermissionService } from '../_services/layerpermission.service';
import { UserPageLayerService } from '../_services/userPageLayer.service';
import { UserPageService } from '../_services/userPage.service';
import { WFSService } from '../app/map/services/wfs.service';
import { AuthenticationService} from '../_services/authentication.service';
import { UserService } from '../_services/user.service';


@NgModule ({
    declarations: [
        AppComponent,
        MapComponent,
        MarkerComponent,
        NavigatorComponent,
        PagesComponent,
        HeaderComponent,
        SideNavComponent,
        HomeComponent,
        LoginComponent,
        AdminComponent,
        AdminNavComponent,
        SettingsNavComponent,
        OrganizationComponent,
        LayerAdminComponent,
        UserComponent,
        adminPagesComponent,
        SettingsComponent,
        UserPagesComponent,
        PasswordComponent,
        FilterPipe,
        NumFilterPipe,
        PagePipe,
        LayerPermissionComponent,
        PageComponent,
        PageConfigComponent,
        LayerNewComponent,
        ConfirmdeleteComponent,
        ModulesComponent,
        DefaultsComponent,
        BoundariesComponent,
        NotificationsComponent,
        ServerComponent,
        MarkerDataComponent,
        LayerControlsComponent,
        ServerNewComponent,
        ChangePasswordComponent
    ],

    entryComponents: [
        LayerNewComponent, 
        ChangePasswordComponent, 
        LayerPermissionComponent, 
        PageComponent, 
        PageConfigComponent, 
        ConfirmdeleteComponent,
        ServerNewComponent
    ],

    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        JsonpModule,
        NgbModule.forRoot(),
        Routing,
        RouterModule.forRoot([
            {
                path: 'home',
                component: HomeComponent
            }
        ]),
        BrowserAnimationsModule,
        MdRadioModule,
        MdMenuModule,
        MdIconModule,
        MdDialogModule,
        MdSelectModule,
        MdCheckboxModule,
        MdInputModule
    ],

    providers: [
        UserService, 
        MapService, 
        GeocodingService, 
        AuthGuard, 
        AdminGuard, 
        AuthenticationService, 
        UserService, 
        DepartmentService, 
        GroupService, 
        RoleService, 
        LayerAdminService, 
        LayerPermissionService,
        UserPageLayerService,
        UserPageService,
        Configuration,
        WFSService, 
        BaseRequestOptions
    ], 

    bootstrap: [AppComponent]
})

export class AppModule {}