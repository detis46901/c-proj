import { Injectable } from "@angular/core";
import { MapConfig, mapStyles, featureList } from '../models/map.model';
import { UserPageLayerService } from '../../../_services/_userPageLayer.service';
import { LayerPermission, Layer, UserPageLayer, MyCubeField, MyCubeConfig } from '../../../_models/layer.model';
import { LayerPermissionService } from '../../../_services/_layerPermission.service';
import { geoJSONService } from './../services/geoJSON.service';
import { MyCubeService } from './../services/mycube.service';
import { WFSService } from './../services/wfs.service';
import { SQLService } from './../../../_services/sql.service';
import { MessageService } from '../../../_services/message.service';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map';
import { Http, Response, Headers, RequestOptions } from '@angular/http';
import { when } from "q";
import { StyleService } from '../services/style.service'
import { DomSanitizer } from "../../../../node_modules/@angular/platform-browser";

@Injectable()
export class MapService {
    public noLayers: boolean;
    private shown: boolean = false;
    public mapConfig: MapConfig;
    public vectorlayer = new ol.layer.Vector();
    public evkey: any;
    public modkey: any;
    public modify: ol.interaction.Modify;
    public selectedLayer: any;
    public editmode: boolean = false;
    public oid: number;
    public featurelist = new Array<featureList>();
    public base: string = 'base';
    private cubeData: MyCubeField[];
    private interval: any;

    public http: Http;
    public options: any;

    constructor(
        private userPageLayerService: UserPageLayerService,
        private layerPermissionService: LayerPermissionService,
        private geojsonservice: geoJSONService,
        private myCubeService: MyCubeService,
        private wfsService: WFSService,
        private messageService: MessageService,
        private sqlService: SQLService,
        private mapstyles: mapStyles,
        private styleService: StyleService,
        private sanitizer: DomSanitizer,
        http: Http,

    ) {
        this.http = http;
    }

    //Will be deleted once the navigator component is changed out.
    disableLeafletMouseEvent(elementId: string) {
    };

    public initMap(mapConfig: MapConfig): Promise<any> {
        this.mapConfig = mapConfig;
        //sets the base layer
        this.mapConfig.layers = [];
        let osm_layer: any = new ol.layer.Tile({
            source: new ol.source.OSM()
        });
        osm_layer.setVisible(true);
        this.mapConfig.sources.push(new ol.source.OSM());
        this.mapConfig.layers.push(osm_layer);
        //continues the initialization
        let promise = new Promise((resolve, reject) => {
            this.getUserPageLayers(this.mapConfig)  //only sending an argument because I have to.
                .then(() => this.getLayerPerms())
                .then(() => this.loadLayers(this.mapConfig, true).then(() => {
                    this.mapConfig.view = new ol.View({
                        projection: 'EPSG:3857',
                        center: ol.proj.transform([-86.1336, 40.4864], 'EPSG:4326', 'EPSG:3857'),
                        zoom: 13,
                        enableRotation: false
                    })
                    this.mapConfig.map = new ol.Map({
                        layers: this.mapConfig.layers,
                        view: this.mapConfig.view,
                        controls: ol.control.defaults({
                            attribution: false,
                            zoom: null
                        })
                    });
                    resolve(this.mapConfig);
                })
                )
        })
        return promise;
    }

    public getUserPageLayers(mapConfig): Promise<any> {
        this.mapConfig = mapConfig; //only necessary on changed page
        let promise = new Promise((resolve, reject) => {
            this.userPageLayerService
                .GetPageLayers(this.mapConfig.currentpage.ID)
                .subscribe((data: UserPageLayer[]) => {
                    this.mapConfig.userpagelayers = data;
                    if (data.length != 0) {
                        // if (this.mapConfig.userpagelayers[0].layerON == true) {this.mapConfig.currentLayer = this.mapConfig.userpagelayers[0]}
                        // this.mapConfig.currentLayerName = this.mapConfig.userpagelayers[0].layer.layerName
                        //this.mapConfig.editmode = this.mapConfig.userpagelayers[0].layerPermissions.edit
                    }
                    else {
                        this.mapConfig.currentLayer = new UserPageLayer;
                        this.mapConfig.currentLayerName = "";
                    }
                    resolve();
                });
        })
        return promise;
    }

    public getLayerPerms(): Promise<any> {
        let promise = new Promise((resolve, reject) => {
            this.layerPermissionService
                .GetByUserGroups(this.mapConfig.userID)
                .subscribe((data: LayerPermission[]) => {
                    this.mapConfig.layerpermission = data;
                    this.mapConfig.userpagelayers.forEach((userpagelayer) => {
                        let j = this.mapConfig.layerpermission.findIndex((x) => x.layerID == userpagelayer.layerID);
                        if (j >= 0) {
                            userpagelayer.layerPermissions = this.mapConfig.layerpermission[j];
                            //need to make sure the maximum permissions get provided.  probably need to use foreach instead of findIndex  It uses the first one instead of the most liberal.
                        }
                    })
                    resolve();
                })
        })
        return promise;
    }

    public getCapabilities = (url): Observable<any> => {
        return this.http.get(url + "?request=GetCapabilities")
            .map((response: Response) => <any>response.text());
    }

    //loadLayers will load during map init and load the layers that should come on by themselves with the "layerON" property set (in userPageLayers)
    public loadLayers(mapConfig: MapConfig, init: boolean): Promise<any> {
        let j = 0;
        if (this.evkey) {
            ol.Observable.unByKey(this.evkey);
        }  //removes the previous click event if there was one.
        if (this.modkey) {
            ol.Observable.unByKey(this.modkey);
        } //removes the previous modify even if there was one.
        this.myCubeService.clearMyCubeData();
        this.messageService.clearMessage();
        let promise = new Promise((resolve, reject) => {
            for (let i = 0; i < this.mapConfig.userpagelayers.length; i++) {
                switch (this.mapConfig.userpagelayers[i].layer.layerType) {
                    case "MyCube": {
                        this.mapConfig.userpagelayers[i].layerShown = this.mapConfig.userpagelayers[i].layerON;
                        this.loadMyCube(init, this.mapConfig.userpagelayers[i]);
                        j++;
                        if (j == this.mapConfig.userpagelayers.length) {
                            resolve();
                        }
                        break;
                    }
                    case "WMTS": {
                        console.log("At WMTS")
                        console.log(this.mapConfig.userpagelayers[i].layer.server.serverURL)
                        this.getCapabilities(this.mapConfig.userpagelayers[i].layer.server.serverURL)
                            .subscribe((data) => {
                                //console.log(data)
                                let parser = new ol.format.WMTSCapabilities();
                                //console.log("At Parser")
                                let result = parser.read(data);
                                //console.log(result)
                                console.log(this.mapConfig.userpagelayers[i].layer.layerIdent)
                                let options = ol.source.WMTS.optionsFromCapabilities(result, {
                                    layer: this.mapConfig.userpagelayers[i].layer.layerIdent,
                                    matrixSet: 'EPSG:3857'
                                });
                                console.log(options)
                                let wmsSource = new ol.source.WMTS(options);
                                this.setLoadEvent(this.mapConfig.userpagelayers[i], wmsSource);
                                let wmsLayer = new ol.layer.Tile({
                                    opacity: 1,
                                    source: new ol.source.WMTS(options)
                                });
                                this.mapConfig.userpagelayers[i].layerShown = this.mapConfig.userpagelayers[i].layerON;
                                wmsLayer.setVisible(this.mapConfig.userpagelayers[i].layerON);
                                this.mapConfig.layers.push(wmsLayer);
                                this.mapConfig.sources.push(wmsSource);
                                this.mapConfig.userpagelayers[i].loadOrder = this.mapConfig.layers.length;
                                if (init == false) {
                                    mapConfig.map.addLayer(wmsLayer);
                                }
                                j++;
                                if (j == this.mapConfig.userpagelayers.length) {
                                    resolve();
                                }
                            })
                        break;
                    }
                    default: {

                        let url = this.formLayerRequest(this.mapConfig.userpagelayers[i]);
                        let wmsSource = new ol.source.ImageWMS({
                            url: url,
                            params: { 'LAYERS': this.mapConfig.userpagelayers[i].layer.layerIdent },
                            projection: 'EPSG:4326',
                            serverType: 'geoserver',
                            crossOrigin: 'anonymous'
                        });
                        this.setLoadEvent(this.mapConfig.userpagelayers[i], wmsSource);
                        let wmsLayer = new ol.layer.Image({
                            source: wmsSource
                        });

                        this.mapConfig.userpagelayers[i].layerShown = this.mapConfig.userpagelayers[i].layerON;
                        wmsLayer.setVisible(this.mapConfig.userpagelayers[i].layerON);
                        this.mapConfig.layers.push(wmsLayer);
                        this.mapConfig.sources.push(wmsSource);
                        this.mapConfig.userpagelayers[i].loadOrder = this.mapConfig.layers.length;
                        if (init == false) {
                            mapConfig.map.addLayer(wmsLayer);
                        }
                        j++;
                        if (j == this.mapConfig.userpagelayers.length) {
                            resolve();
                        }
                    }
                }
            }
        })
        return promise;
    }

    //Reads index of layer in dropdown, layer, and if it is shown or not. Needs to remove a layer if a new one is selected
    private toggleLayers(loadOrder: number, mapConfig: MapConfig, index): void {
        if (mapConfig.userpagelayers[index].layerShown === true) {
            mapConfig.layers[loadOrder - 1].setVisible(false);
            mapConfig.userpagelayers[index].layerShown = false;

            if (this.mapConfig.currentLayer == this.mapConfig.userpagelayers[index]) {
                this.mapConfig.currentLayer = new UserPageLayer;
                this.mapConfig.currentLayerName = "";
            }
            //could add something here that would move to the next layerShown=true.  Not sure.
            this.mapConfig.editmode = false
        }
        else {
            mapConfig.layers[loadOrder - 1].setVisible(true);
            mapConfig.userpagelayers[index].layerShown = true;
            this.setCurrentLayer(mapConfig.userpagelayers[index], mapConfig);
        }
    }

    public loadMyCube(init: boolean, layer: UserPageLayer) {
        let stylefunction = ((feature) => {
            return (this.styleService.styleFunction(feature, layer, "load"));
        })
        let index = this.mapConfig.userpagelayers.findIndex(x => x == layer);
        let source = new ol.source.Vector({
            format: new ol.format.GeoJSON()
        })

        try {
            if (layer.style['filter']['column'] == "") {
                console.log('No UserPageLayer filter.  Pulling Default filter from style');
                layer.style['filter']['column'] = layer.layer.defaultStyle['filter']['column'];
                layer.style['filter']['operator'] = layer.layer.defaultStyle['filter']['operator'];
                layer.style['filter']['value'] = layer.layer.defaultStyle['filter']['value'];
                layer.style['load']['color'] = layer.layer.defaultStyle['load']['color'];
                layer.style['current']['color'] = layer.layer.defaultStyle['current']['color']
            }
            console.log(layer.style['load']['color'])
            if (layer.style['load']['color'] == "") {
                console.log("No UserPageLayer style.  Pulling Default style");
                layer.style['load']['color'] = layer.layer.defaultStyle['load']['color']
                layer.style['load']['width'] = layer.layer.defaultStyle['load']['width']
            }
            
        }
        catch (e) {
            console.log('No Default Filter');
        }

        // This sets up the auto-update function.  It's not running right now, so I'm temporarily shutting it down.
        this.interval = setInterval(() => {
            this.runInterval(layer, source);
        }, 20000);

        this.getMyCubeData(layer).then((data) => {

            if (data[0][0]['jsonb_build_object']['features']) {
                source.addFeatures(new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).readFeatures(data[0][0]['jsonb_build_object']));
                //this.filterFunction(layer, source)
            }
            //this.filterfunction(source,layer)
            this.vectorlayer = new ol.layer.Vector({ source: source, style: stylefunction });
            this.vectorlayer.setVisible(layer.layerON);
            this.mapConfig.map.addLayer(this.vectorlayer);
            this.mapConfig.layers.push(this.vectorlayer);
            this.mapConfig.sources.push(source);
            this.mapConfig.userpagelayers[index].loadOrder = this.mapConfig.layers.length;
            if (init == false) {
                this.mapConfig.map.addLayer(this.vectorlayer);
            }
        })
        //source = new ol.source.Vector({ features: (new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })).readFeatures(data[0][0]['jsonb_build_object']) })}
    }

    public runInterval(layer: UserPageLayer, source: ol.source.Vector) {
        let stylefunction = ((feature, resolution) => {
            if (this.mapConfig.currentLayer == layer) {
                return (this.styleService.styleFunction(feature, layer, "current"));
            }
            else {
                return (this.styleService.styleFunction(feature, layer, "load"));
            }
        })
        this.getMyCubeData(layer).then((data) => {
            if (data[0]) {
                if (data[0][0]['jsonb_build_object']['features']) {
                    //clearInterval(this.interval)
                    //need to put something in here so that when an object is being edited, it doesn't update...
                    //might just be that the layer doesn't update unless something has changed.

                    source.clear();
                    source.addFeatures(new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).readFeatures(data[0][0]['jsonb_build_object']));
                    let index = this.mapConfig.userpagelayers.findIndex(x => x == layer);
                    //this.mapConfig.layers[index].setStyle(stylefunction) 
                    source.forEachFeature(feat => {
                        //console.log("runInterval and feat = " + feat.getId())
                        feat.setStyle(stylefunction);
                    })
                    //this.filterFunction(layer, source)
                    if (this.mapConfig.currentLayer == layer) {
                        this.getFeatureList();
                        if (this.mapConfig.selectedFeature) {
                            this.mapConfig.selectedFeature = source.getFeatureById(this.mapConfig.selectedFeature.getId());
                            if (this.mapConfig.selectedFeature) {
                                this.selectFeature(layer, true)
                            } //need to make sure the feature still exists
                            //source.getFeatureById(this.mapConfig.selectedFeature.getId()).setStyle(this.mapstyles.selected)
                            //this.mapConfig.selectedFeature.setStyle(this.mapstyles.selected)
                        }
                    }
                    //may need to add something in here that compares new data to old data and makes sure the selected feature remains selected.
                }
            }
        })
    }

    private getMyCubeData(layer): Promise<any> {
        let source = new ol.source.Vector();
        let promise = new Promise((resolve, reject) => {
            this.geojsonservice.GetAll(layer.layer.ID)
                .subscribe((data: GeoJSON.Feature<any>) => {
                    //source = new ol.source.Vector()
                    resolve(data);//source = new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' })).readFeatures(data[0][0]['jsonb_build_object']) })                
                })
        })
        return promise;
    }

    private formLayerRequest(layer: UserPageLayer): string {
        switch (layer.layer.layerType) {
            case ('MapServer'): {
                let norest: string = layer.layer.server.serverURL.split('/rest/')[0] + '/' + layer.layer.server.serverURL.split('/rest/')[1];
                let url: string = norest + '/' + layer.layer.layerService + '/MapServer/WMSServer';
                return url;
            }
            case ('Geoserver'): {
                let url: string = layer.layer.server.serverURL;
                return url;
            }
        }
    }

    private setCurrentLayer(layer: UserPageLayer, mapconfig: MapConfig): void {
        this.mapConfig.filterOn = false;
        this.mapConfig = mapconfig;
        this.mapConfig.editmode = false;
        this.mapConfig.map.removeInteraction(this.modify);
        this.modify = null;
        this.mapConfig.currentLayer = layer;
        this.myCubeService.clearMyCubeData(); //cleans the selected myCube data off the screen
        if (this.mapConfig.selectedFeature) {
            this.mapConfig.selectedFeature.setStyle(null);
        }  //fixes a selected feature's style
        this.mapConfig.currentLayerName = layer.layer.layerName  //Puts the current name in the component
        if (layer.layerON) {
            this.mapConfig.currentLayer = layer;
        }
        this.mapConfig.userpagelayers.forEach(element => {
            if (element.layer.layerType == "MyCube") {
                let stylefunction = ((feature) => {
                    return (this.styleService.styleFunction(feature, element, "load"));
                })
                this.mapConfig.layers[element.loadOrder - 1].setStyle(stylefunction); //resets all the feature styles to "load"
            }
        });
        let index = this.mapConfig.userpagelayers.findIndex(x => x == layer);
        for (let x of this.mapConfig.userpagelayers) {
            if (x == layer) {
                if (x.layerShown === true && x.layer.layerType == "MyCube") {
                    this.setCurrentMyCube(layer);
                }
                if (x.layerShown === true && x.layer.layerType != "MyCube") {
                    switch (x.layer.layerType) {
                        case ("MyCube"): {
                            this.shown = true;
                            break;
                        }
                        default: {
                            this.shown = false;
                        }
                    }
                    if (this.evkey) {
                        ol.Observable.unByKey(this.evkey);
                    }
                    if (this.modkey) {
                        ol.Observable.unByKey(this.modkey);
                    } //removes the previous modify even if there was one.
                    this.evkey = this.createClick(layer, index);
                    this.mapConfig.currentLayerName = x.layer.layerName;
                    //this.getServer(layer.layer_.serverID);
                    this.noLayers = false;
                }
            }
        }
    }

    private createClick(layer, index) {
        let evkey = this.mapConfig.map.on('singleclick', (evt: any) => {
            console.log("click")
            let url2 = this.formLayerRequest(layer);
            let wmsSource = new ol.source.ImageWMS({
                url: url2,
                params: { 'LAYERS': layer.layer.layerIdent },
                projection: 'EPSG:4326',
                serverType: 'geoserver',
                crossOrigin: 'anonymous'
            });
            let viewResolution = this.mapConfig.map.getView().getResolution();
            let source: ol.source.ImageWMS = this.mapConfig.map.getLayers().item(index).getProperties().source;
            let url = wmsSource.getGetFeatureInfoUrl(
                evt.coordinate, viewResolution, 'EPSG:3857',
                { 'INFO_FORMAT': 'text/html' });
            if (url) {
                this.wfsService.getfeatureinfo(url, false)
                    .subscribe((data: any) => {
                        this.sendMessage(data);
                    });
            }
        });
        return evkey;
    }

    private setLoadEvent(layer: UserPageLayer, source: ol.source.Source) {
        source.on('tileloadstart', () => {
            layer.loadStatus = "Loading";
            console.log(layer.layer.layerName + " loading");
        })
        source.on('tileloadend', () => {
            layer.loadStatus = "Loaded";
            console.log(layer.layer.layerName + " loaded");
        })
        source.on('tileloaderror', () => {
            console.log("error");
        })
        source.on('imageloadstart', () => {
            layer.loadStatus = "Loading";
            console.log(layer.layer.layerName + " loading");
        })
        source.on('imageloadend', () => {
            layer.loadStatus = "Loaded";
            console.log(layer.layer.layerName + " loaded");
        })
        source.on('imageloaderror', () => {
            console.log("error");
        })
    }

    private sendMessage(message: string): void {
        message = message.split("<body>")[1];
        message = message.split("</body>")[0];
        if (message.length < 10) {
            this.messageService.clearMessage();
        }
        else {
            this.messageService.sendMessage(this.sanitizer.bypassSecurityTrustHtml(message)); //This allows the service to render the actual HTML unsanitized
        }
    }

    private setCurrentMyCube(layer: UserPageLayer) {
        let stylefunction = ((feature) => {
            return (this.styleService.styleFunction(feature, layer, "current"));
        })
        try {
            if (layer.style['filter']['column']) {
                this.mapConfig.filterOn = true;
            }
            else {
                this.mapConfig.filterOn = false;
            }
        }
        catch (e) {
            console.log('No Filter');
        }

        this.featurelist = [];
        this.shown = true;
        this.mapConfig.editmode = layer.layerPermissions.edit;
        this.mapConfig.map.removeInteraction(this.modify);
        this.modify = null;
        if (this.evkey) {
            ol.Observable.unByKey(this.evkey);
        }
        if (this.modkey) {
            ol.Observable.unByKey(this.modkey); //removes the previous modify even if there was one.
        }
        this.mapConfig.layers[layer.loadOrder - 1].setStyle(stylefunction);
        this.getFeatureList();
        this.evkey = this.mapConfig.map.on('singleclick', (e) => {
            if (this.mapConfig.selectedFeature) {
                this.mapConfig.selectedFeature.setStyle(null);
            }
            var hit = false;
            this.mapConfig.map.forEachFeatureAtPixel(e.pixel, (feature: ol.Feature, selectedLayer: any) => {
                //if (this.mapConfig.selectedFeature != feature) {this.mapConfig.map.removeInteraction(this.modify)}
                this.selectedLayer = selectedLayer;
                if (selectedLayer === this.mapConfig.layers[layer.loadOrder - 1]) {
                    hit = true;
                    this.mapConfig.selectedFeature = feature;
                };
            }, {
                    hitTolerance: 5
                });
            if (hit) {
                this.selectFeature(layer);
            }
            else {
                this.clearFeature(layer);
            }
        });

        this.myCubeService.prebuildMyCube(layer); //This needs a lot of work
    }

    private selectFeature(layer: UserPageLayer, refresh: boolean = false) {
        this.mapConfig.selectedFeature.setStyle(this.mapstyles.selected);
        if (refresh == false) {
            this.myCubeService.setMyCubeConfig(layer.layer.ID, layer.layerPermissions.edit);
            this.myCubeService.sendMyCubeData(layer.layer.ID, this.mapConfig.selectedFeature.getId());
        }
        this.mapConfig.selectedFeatures.clear();
        this.mapConfig.selectedFeatures.push(this.mapConfig.selectedFeature);
        if (layer.layerPermissions.edit == true) {
            if (!this.modify) {
                this.modify = new ol.interaction.Modify({ features: this.mapConfig.selectedFeatures });
                this.mapConfig.map.addInteraction(this.modify);
            }
            this.modkey = this.modify.on('modifyend', (e: ol.interaction.Modify.Event) => {
                e.features.forEach(element => {
                    this.mapConfig.selectedFeature = element;
                    let featurejson = new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).writeFeature(this.mapConfig.selectedFeature);
                    this.geojsonservice.updateGeometry(layer.layer.ID, JSON.parse(featurejson))
                        .subscribe()
                });
            })
        }
    }

    private clearFeature(layer: UserPageLayer) {
        if (this.mapConfig.selectedFeature) {
            this.mapConfig.selectedFeature.setStyle(null);
            this.mapConfig.selectedFeature = null;
        }
        this.mapConfig.map.removeInteraction(this.modify);
        this.modify = null;
        if (this.modkey) {
            ol.Observable.unByKey(this.modkey); //removes the previous modify even if there was one.
        }
        this.myCubeService.clearMyCubeData();
        //this.mapConfig.layers[layer.loadOrder - 1].setStyle(this.styleService.styleFunction("", layer, 'current'))
    }

    private draw(mapconfig: MapConfig, featurety: any) {
        this.mapConfig = mapconfig;
        if (this.modkey) {
            ol.Observable.unByKey(this.modkey);
        } //removes the previous modify even if there was one.
        this.mapConfig.map.removeInteraction(this.modify);
        this.modify = null;

        let src = new ol.source.Vector();
        let vector = new ol.layer.Vector({
            source: src,
            style: this.mapstyles.selected
        });
        let draw = new ol.interaction.Draw({
            type: featurety,
            source: src,
        })
        this.mapConfig.map.addLayer(vector);
        this.modkey = this.mapConfig.map.addInteraction(draw);
        draw.once('drawend', (e) => {
            let featurejson = new ol.format.GeoJSON({ defaultDataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }).writeFeature(e.feature);

            this.sqlService.addRecord(this.mapConfig.currentLayer.layer.ID, JSON.parse(featurejson))
                .subscribe((data) => {
                    e.feature.setId(data[0].id);
                    e.feature.setProperties(data[0]);
                    this.mapConfig.sources[this.mapConfig.currentLayer.loadOrder - 1].addFeature(e.feature);
                    this.getFeatureList();
                })
            this.mapConfig.map.removeLayer(vector);
            this.mapConfig.map.changed();
            ol.Observable.unByKey(this.modkey);
            this.mapConfig.map.removeInteraction(draw);
        })
    }

    private delete(mapconfig: MapConfig, featurety: any) {
        this.mapConfig.selectedFeatures.forEach((feat) => {
            mapconfig.sources[mapconfig.currentLayer.loadOrder - 1].removeFeature(feat);
            this.sqlService.Delete(mapconfig.currentLayer.layer.ID, feat.getId())
                .subscribe((data) => {
                    if (this.modkey) {
                        ol.Observable.unByKey(this.modkey); //removes the previous modify even if there was one.
                    }
                    this.mapConfig.map.removeInteraction(this.modify);
                    this.modify = null;
                })
            this.myCubeService.clearMyCubeData();
        })
        this.getFeatureList();
    }

    private getFeatureList() {
        let k: number = 0;
        let tempList = new Array<featureList>();
        try {
            let labelName: string = this.mapConfig.currentLayer.layer.defaultStyle['listLabel'];
            if (!labelName) {
                labelName = this.mapConfig.currentLayer.style['listLabel'];
            }

            if (labelName != null && labelName.length != 0) {
                this.mapConfig.sources[this.mapConfig.currentLayer.loadOrder - 1].forEachFeature((x: ol.Feature) => {
                    let i = this.mapConfig.sources[this.mapConfig.currentLayer.loadOrder - 1].getFeatures().findIndex((j) => j == x);
                    let fl = new featureList;
                    if (this.styleService.filterFunction(x, this.mapConfig.currentLayer)) {
                        fl.label = x.get(labelName);
                        fl.feature = x;

                        if (i > -1 && fl != null) {
                            tempList.push(fl);
                            k += 1;
                        }
                    }
                    this.featurelist = tempList.slice(0, k);
                })
            }

            this.featurelist.sort((a, b): number => {
                if (a.label > b.label) {
                    return 1;
                }
                if (a.label < b.label) {
                    return -1;
                }
                return 0;
            })
        } catch (error) {
            console.error(error);
            clearInterval(this.interval);
        }
    }

    private zoomToFeature(featurelist: featureList): void {
        this.clearFeature(this.mapConfig.currentLayer);
        let ext = featurelist.feature.getGeometry().getExtent();
        let center = ol.extent.getCenter(ext);
        this.mapConfig.view.fit(featurelist.feature.getGeometry().getExtent(), {
            duration: 1000,
            maxZoom: 18
        })
        this.mapConfig.selectedFeature = featurelist.feature;
        this.selectFeature(this.mapConfig.currentLayer);
    }

    private zoomExtents(): void {
        this.mapConfig.view.animate({ zoom: 13, center: ol.proj.transform([-86.1336, 40.4864], 'EPSG:4326', 'EPSG:3857') })
    }

    private toggleBasemap() {
        let aerial = new ol.source.BingMaps({
            key: 'AqG6nmU6MBeqJnfsjQ-285hA5Iw5wgEp3krxwvP9ZpE3-nwYqO050K5SJ8D7CkAw',
            imagerySet: 'AerialWithLabels',
            maxZoom: 19
        })
        let base = new ol.source.OSM();
        if (this.base == 'base') {
            this.base = 'aerial';
            this.mapConfig.layers[0].setSource(aerial);
        }
        else {
            this.base = 'base';
            this.mapConfig.layers[0].setSource(base);
        }
    }

    public stopInterval() {
        clearInterval(this.interval)
        console.log("Stopping Interval")
    }
}