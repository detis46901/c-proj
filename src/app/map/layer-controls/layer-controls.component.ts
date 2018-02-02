import { ElementRef, Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { MapService } from "../services/map.service";
import { WFSService } from "../services/wfs.service";
import { Location } from "../core/location.class";
import { GeocodingService } from "../services/geocoding.service";
import { NavigatorComponent } from "../navigator/navigator.component";
import { MarkerComponent } from "../marker/marker.component";
import { LayerPermissionService } from "../../../_services/_layerPermission.service"
import { LayerService } from "../../../_services/_layer.service"
import { UserPageService } from '../../../_services/_userPage.service'
import { SideNavService } from '../../../_services/sidenav.service'
import { ServerService } from '../../../_services/_server.service'
import { LayerPermission, Layer, UserPageLayer } from "../../../_models/layer.model";
import { Server } from "../../../_models/server.model";
import { UserPage } from '../../../_models/user.model';
import { UserPageLayerService } from '../../../_services/_userPageLayer.service'
import { Http, Response, Headers } from '@angular/http'
import { Observable } from 'rxjs/Observable';
import { Subscription }   from 'rxjs/Subscription';
import * as L from "leaflet";

@Component({
  selector: 'layer-controls',
  templateUrl: './layer-controls.component.html',
  styleUrls: ['./layer-controls.component.scss'],
  providers: [ServerService]
})

export class LayerControlsComponent {
    public token: string;
    public userID: number;
    public headers: Headers;
    public popuptx: string = ""

    public _map: L.Map;
    public getFeatureData: any;

    //Database information
    public userpagelayers: Array<UserPageLayer> = [];
    public currLayer: UserPageLayer; 
    public userpages: any; 
    public layerList: Array<L.Layer> = [];
    public server: Server;
    public servers: Array<Server>;

    public defaultpage: any; 
    public turnonlayer: L.Layer;
    public overlays: any;
    public currPage: any = "None"
    public currLayerName: string = "No Active Layer"

    constructor(private _http: Http, private elementRef: ElementRef, private mapService: MapService, private wfsservice: WFSService, private geocoder: GeocodingService, private layerPermissionService: LayerPermissionService, private layerService: LayerService, private userPageService: UserPageService, private userPageLayerService: UserPageLayerService, private http: Http, private sideNavService: SideNavService, private serverService: ServerService) { 
        var currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.token = currentUser && currentUser.token;
        this.userID = currentUser && currentUser.userID; 
        this.headers = new Headers();
        this.headers.append('Content-Type', 'application/json');
        this.headers.append('Accept', 'application/json');
        wfsservice.popupText$.subscribe(tx => this.popuptx = tx)
    }

    //Angular component initialization
    ngOnInit() {
        this.getPage();
    }
    
    //Takes results from getDefaultPage and sets the page based on result
    getPage(): void {
        this.userPageService
            .GetSome(this.userID)
            .subscribe((data:UserPage[]) => 
                this.userpages = data,
                error => console.error(error),
                () => this.getDefaultPage()
            );
    }

    //Currently this logic seems flawed. Whatever the last page that is set as default will be selected, consider a break statement within the if block
    getDefaultPage() {
        for (let userpage of this.userpages) {
            if (userpage.default == true) {
                this.defaultpage = userpage
            }
        }
        this.getUserPageLayers(this.defaultpage)
    } 

    //Gets data from the userpagelayers table based on the user that is accessing, and calls init_map() to intitialize the map
    getUserPageLayers(page): void {
        this.userPageLayerService
            .GetPageLayers(page.ID)
            .subscribe((data:UserPageLayer[]) => 
                this.userpagelayers = data,
                error => console.error(error),
                () =>  this.getServers()
            );
    }

    getServer(serverID) {
        this.serverService
            .GetSingle(serverID)
            .subscribe((data) => this.server = data);
    }

    getServers() {
        this.serverService
            .GetAll()
            .subscribe((data) => 
                this.servers = data,
                () => this.init()
            );
    }

    init() {
        if (this.currPage === "None") {
            this.currPage = this.defaultpage.page
            this.mapService.map = this._map;
        }
        this.loadLayers();
        this.setFlags();
    }

    updateUserPageLayer(userpage) {
        this.userPageLayerService
            .Update(userpage)
            .subscribe(() => {
                this.getUserPageLayers(userpage);
            })
    }

    getUserPageItems(): void {
        this.userPageService
        .GetSome(this.userID)
        .subscribe((data:UserPage[]) => 
            this.userpages = data,
            error => console.error(error)
        );
    }

    setFlags() {
        for (let x of this.userpagelayers) {
            x.layerShown = x.layerON
        }
    }
        
    cleanPage(): void {
        this.setFlags();
        this.mapService.map.eachLayer(function (removelayer) {removelayer.remove()})
        this.mapService.map.addLayer(L.tileLayer("http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            minZoom: 4,
            maxZoom: 21,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
        }))
    }

    loadLayers() {
        let temp = this.userpagelayers
        for (let i=0; i<temp.length; i++) {
            if (temp[i].layerON) {
                this.toggleLayers(i,temp[i], false)
            }
        }
    }

    setUserPageLayers(page): void {
        this.currPage = page.page
        this.cleanPage()
        this.getUserPageLayers(page)
        this.currLayerName = "No Active Layer"
    }

    setCurrentLayer(index, layer: UserPageLayer, checked) {
        for (let x of this.userpagelayers) {
            if (x == layer) {
                if (x.layerShown === true) {
                    this.currLayerName = x.layer.layerName
                    this._map.off('click')
                    this._map.on('click', (event: L.LeafletMouseEvent) => { 
                        let BBOX = this._map.getBounds().toBBoxString();
                        let WIDTH = this._map.getSize().x;
                        let HEIGHT = this._map.getSize().y;
                        let IDENT = x.layer.layerIdent
                        let X = this._map.layerPointToContainerPoint(event.layerPoint).x;
                        let Y = Math.trunc(this._map.layerPointToContainerPoint(event.layerPoint).y);
                        let URL = this.server.serverURL + '?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetFeatureInfo&LAYERS='+IDENT+'&QUERY_LAYERS='+IDENT+'&BBOX='+BBOX+'&FEATURE_COUNT=1&HEIGHT='+HEIGHT+'&WIDTH='+WIDTH+'&INFO_FORMAT=text%2Fhtml&SRS=EPSG%3A4326&X='+X+'&Y='+Y;
                        this.wfsservice.getfeatureinfo(URL, false)
                            .subscribe((data: any) => this.getFeatureData = data)
                    })
                }
            }
        }

        if(!checked) {
            this.toggleLayers(index, layer, checked)
        }
    }

    toggleLayers(index, layer: UserPageLayer, checked) {
        let zindex = 1000
        let allLayersOff = true;
        let nextActive: any;
        let server;

        //7/24/17
        /*layer userpagelayer returns attributes, one of which is of type Layer:
        .layer_ Layer returns attributes, one of which is of type Server:
        .server.serverURL Server has attribute serverUrl. This is theoretically possible to do all within http request.
        (preferred way of doing this)*/
        //Replace block below with this ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        this.getServer(layer.layer.serverID)
        for (let i of this.servers) {
            if (i.ID == layer.layer.serverID) {server = i}
        }

        if (checked == false) {
            if (layer.layer.layerGeom == "Coverage") {zindex = -50}

            this.turnonlayer = (L.tileLayer.wms(server.serverURL + "/wms", {
                layers: layer.layer.layerIdent,
                format: layer.layer.layerFormat,
                transparent: true,
            }).addTo(this._map))
            this.layerList[index] = this.turnonlayer
            this.currLayer = layer
            this.currLayerName = layer.layer.layerName
            this.openFeatureInfo(server);
            this.userpagelayers[index].layerShown = true
        }
        else { 
            this.layerList[index].removeFrom(this._map)
            this.userpagelayers[index].layerShown = false
            for (let i of this.userpagelayers) {
                if (i.layerON) {
                    nextActive = i;
                    allLayersOff = false;
                    break;
                }
            }
            this._map.off('click')

            if (this.currLayer == layer && allLayersOff) {
                this.currLayer = null
                this.currLayerName = "No Current"
            }
            else if (this.currLayer == layer && !allLayersOff) {
                this.currLayer = nextActive
                this.currLayerName = nextActive.layer.layerName
            }
        }
    }

    openFeatureInfo(serv: Server) {
        this._map.on('click', (event: L.LeafletMouseEvent) => { 
            let BBOX = this._map.getBounds().toBBoxString();
            let WIDTH = this._map.getSize().x;
            let HEIGHT = this._map.getSize().y;
            let IDENT = this.currLayer.layer.layerIdent
            let X = this._map.layerPointToContainerPoint(event.layerPoint).x;
            let Y = Math.trunc(this._map.layerPointToContainerPoint(event.layerPoint).y);
            let URL = serv.serverURL + '/wms?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetFeatureInfo&LAYERS='+IDENT+'&QUERY_LAYERS='+IDENT+'&BBOX='+BBOX+'&FEATURE_COUNT=1&HEIGHT='+HEIGHT+'&WIDTH='+WIDTH+'&INFO_FORMAT=text%2Fhtml&SRS=EPSG%3A4326&X='+X+'&Y='+Y;
            this.wfsservice.getfeatureinfo(URL, false)
                .subscribe((data: any) => this.getFeatureData = data)
        })
    }
}
