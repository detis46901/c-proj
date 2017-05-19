
import { Component, Input, OnInit } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Api2Service } from '../../api2.service';
import { User } from '../../../_models/user-model'
import { Configuration } from '../../../_api/api.constants'
import { DepartmentService } from '../../../_services/department.service'
import { GroupService } from '../../../_services/group.service'
import { RoleService } from '../../../_services/role.service'
import { Department, Group, Role } from '../../../_models/organization.model'
import { FilterPipe } from '../../../_pipes/rowfilter.pipe'
import { NumFilterPipe } from '../../../_pipes/numfilter.pipe'

@Component({
  selector: 'organization',
  templateUrl: './organization.component.html',
  providers: [Api2Service, Configuration, FilterPipe, NumFilterPipe]
  //styleUrls: ['./app.component.css', './styles/w3.css'],
})
export class OrganizationComponent implements OnInit{
public user = new User;
public department = new Department;
public departments: any;
public group = new Group;
public groups: Array<any>;
public role = new Role;
public newrole = new Role;
public roles: any;
public token: string;
public userID: number;
public selecteddepartment: Department;
public selectedgroup: Group;
public showgroup: boolean;
public showrole: boolean;
public newdepartment: string;


    constructor(private departmentService: DepartmentService, private groupService: GroupService, private roleService: RoleService) {
      var currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.token = currentUser && currentUser.token;
        this.userID = currentUser && currentUser.userid; 
    }

    ngOnInit() {
       this.getDepartmentItems();
       //this.getGroupItems();
       //this.getRoleItems();
        
    }

    public getDepartmentItems(): void {
         this.departmentService
            .GetAll()
            .subscribe((data:Department[]) => this.departments = data,
                error => console.log(error),
                //() => console.log(this.departments[0].department)
                );
    }

    public getGroupItems(): void {
         this.groupService
            .GetAll()
            .subscribe((data:Group[]) => this.groups = data,
                error => console.log(error),
               // () => console.log(this.groups[0].group)
                );
    }
     
     public getRoleItems(): void {
         this.roleService
            .GetAll()
            .subscribe((data:Role[]) => this.roles = data,
                error => console.log(error),
                //() => console.log(this.roles[0].role)
                );
    }   

    public departmentClick(dept) {
        this.getGroupItems()
        this.showrole = false;
        this.showgroup = true;  
        //console.log('departmentID=' + dept.rowID)
        this.selecteddepartment = dept
    }

     public groupClick(group) {
        this.getRoleItems()
        this.showrole = true;
        console.log('groupID=' + group.ID)
        this.selectedgroup = group 
    }

    public addDepartment(newdepartment) {
        this.department.department = newdepartment;
        this.department.active = true;
        console.log(this.department.department, this.department.active);
        this.departmentService
            .Add(this.department)
            .subscribe(result => {
                console.log(result);
                this.getDepartmentItems();
            })      
    }

    public addGroup(newgroup) {
        this.group.departmentID = this.selecteddepartment.ID;
        this.group.group = newgroup;
        this.group.active = true;
        console.log(this.group.group, this.group.active);
        this.groupService
            .Add(this.group)
            .subscribe(result => {
                console.log(result);
                this.getGroupItems();
            })      
    }

    public addRole(newrole) {
        this.role.groupID = this.selectedgroup.ID;
        this.role.role = newrole.role;
        this.role.active = true;
        console.log(this.role.groupID, this.role.role, this.role.active)
        this.roleService
            .Add(this.role)
            .subscribe(result => {
                console.log(result);
                newrole.role = "";
                this.getRoleItems();
            })      
    }

    public updateDepartment(department) {
        this.departmentService
            .Update(department)
            .subscribe(result => {
                console.log(result);
                this.getDepartmentItems();
            })
    }

    public updateGroup(group) {
        this.groupService
            .Update(group)
            .subscribe(result => {
                console.log(result);
                this.getGroupItems();
            })
    }

    public updateRole(role) {
        this.roleService
            .Update(role)
            .subscribe(result => {
                console.log(result);
                this.getRoleItems();
            })
    }

    public deleteDepartment(departmentID) {
        this.departmentService
            .Delete(departmentID)
            .subscribe(result => {
                console.log(result);
                this.getDepartmentItems();
            })
        /*this.deleteGroup(2);
        this.deleteRole(3); This hard-coding example works fine*/
    }

    public deleteGroup(groupID) {
        this.groupService
            .Delete(groupID)
            .subscribe(result => {
                console.log(result);
                this.getGroupItems();
            })
    }

     public deleteRole(roleID) {
        this.roleService
            .Delete(roleID)
            .subscribe(result => {
                console.log(result);
                this.getRoleItems();
            })
    }

    public filterGroup(departmentID) {
        //console.log (departmentID, this.selecteddepartment.rowID)
        if (departmentID == this.selecteddepartment.ID) {
            return true 
        } else {
            return false
        }
    }

     public filterRole(groupID) {
        //console.log (groupID, this.selectedgroup.rowID)
        if (groupID == this.selectedgroup.ID) {
            return true 
        } else {
            return false
        }
    }
}