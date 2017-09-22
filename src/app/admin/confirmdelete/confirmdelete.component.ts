import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { UserService } from '../../../_services/user.service';
import { User } from '../../../_models/user.model';
import { Configuration } from '../../../_api/api.constants';
import { NgbModal, ModalDismissReasons, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import {MdDialog, MdDialogRef} from '@angular/material';

@Component({
  selector: 'confirmdelete',
  templateUrl: './confirmdelete.component.html',
  styleUrls: ['./confirmdelete.component.scss'] //, '../../../styles/style.scss']
})
export class ConfirmdeleteComponent implements OnInit {

	@Input() objCode;
	@Input() objID;
	@Input() objName;
	objectType: string;
	dependentWarning: boolean = false;

	closeResult: string;
	public token: string;
	public userID: number;

	constructor(public dialog: MdDialog) {
		var currentUser = JSON.parse(localStorage.getItem('currentUser'));
		this.token = currentUser && currentUser.token;
		this.userID = currentUser && currentUser.userid;

	}

	ngOnInit() {
		//currently the object codes will align as follows: Users-1, Layers-2, Organization-3
		switch(this.objCode) {
			case 1:
				this.objectType = "User";
				break;
			case 2:
				this.objectType = "Layer";
				break;
			case 3:
				this.objectType = "Department";
				this.dependentWarning = true;
				break;
			case 4:
				this.objectType = "Group";
				this.dependentWarning = true;
				break;
			case 5:
				this.objectType = "Role";
				break;
			case 6:
				this.objectType = "Server";
				break;
			case 7:
				this.objectType = "Page";
				break;
			default: 
				alert("Invalid Object Code: " + this.objCode);
				break;
		}
	}

	onClick() {
		//this.activeModal.close()
	}

	onClose() {
		//this.activeModal.dismiss()
	}

	private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return  `with: ${reason}`;
    }
  }
}
