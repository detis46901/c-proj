import { Component, OnInit } from '@angular/core';
import { UserPageService } from '../../_services/userPage.service'
import { UserPage } from '../../_models/user.model';



@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html'
})
export class PagesComponent implements OnInit{
public token: string;
public userID: number;
public userpages: any;

constructor(private userpageService: UserPageService){
      var currentUser = JSON.parse(localStorage.getItem('currentUser'));
        this.token = currentUser && currentUser.token;
        this.userID = currentUser && currentUser.userid; 
}

ngOnInit() {
  this.getUserPageItems()
}

  public getUserPageItems(): void {
         this.userpageService
            .GetSome(this.userID)
            .subscribe((data:UserPage[]) => this.userpages = data,
                error => console.log(error),
                () => console.log(this.userpages)
                );
    }
}
