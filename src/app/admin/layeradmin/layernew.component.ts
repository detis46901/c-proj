
import { Component, Input, OnInit } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Api2Service } from '../../api2.service';
import { User } from '../../../_models/user-model'
import { Configuration } from '../../../_api/api.constants'
import { LayerAdminService } from '../../../_services/layeradmin.service';
import { LayerPermissionService } from '../../../_services/layerpermission.service';
import { ServerService } from '../../../_services/server.service';
import { LayerAdmin, LayerPermission } from '../../../_models/layer.model'
import { Server } from '../../../_models/server.model'
import { NgbModal, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LayerPermissionComponent } from './layerpermission.component'


@Component({
  selector: 'layernew',
  templateUrl: './layernew.component.html',
  styleUrls: ['./layernew.component.scss'],
  providers: [Api2Service, Configuration, LayerAdminService, LayerPermissionService, ServerService],
})
export class LayerNewComponent implements OnInit{
    @Input() layerName;
    @Input() layerIdent;
    @Input() layerServer;
    @Input() layerFormat;

    public closeResult: string;
    public newlayeradmin = new LayerAdmin;
    public newlayerserver = new Server;
    public servers: Array<Server>;
    public token: string;
    public userID: number;
    public userperm: string;
    public layeradmin = new LayerAdmin;

    constructor(private modalService: NgbModal, private layerAdminService: LayerAdminService, public activeModal: NgbActiveModal, private serverService: ServerService) {
        var currentUser = JSON.parse(localStorage.getItem('currentUser'));
            this.token = currentUser && currentUser.token;
            this.userID = currentUser && currentUser.userid; 
    }

    ngOnInit() {
       this.getServers()
    }

    getServers() {
        console.log("get servers")
        this.serverService
            .GetAll()
            .subscribe((data) => this.servers = data,
                error => console.log(error),
                () => console.log(this.servers)
            );
    }

    open(content) {
        console.log("layernew open(content)")
        this.userperm = "A user"
        this.modalService.open(content, {size:'lg'}).result.then((result) => {
            this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
            this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        });
    }

    getDismissReason(reason: any): string {
        if (reason === ModalDismissReasons.ESC) {
            return 'by pressing ESC';
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return 'by clicking on a backdrop';
        } else {
            return  `with: ${reason}`;
        }
    }

    openpermission(layerid, layername) {
        const modalRef = this.modalService.open(LayerPermissionComponent)
        modalRef.componentInstance.layerID = layerid
        modalRef.componentInstance.layerName = layername
        modalRef.result.then((result) => {
            this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
            this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
        });
    }

    addLayer(newlayer) {
        this.layeradmin = newlayer;
        this.layerAdminService
            .Add(this.layeradmin)
            .subscribe(result => {
                this.activeModal.close('Next click'); this.openpermission(result.ID, this.layeradmin.layerName)
            })      
    }
}