import { Injectable } from '@angular/core';
import { Http, Response, Headers } from '@angular/http';
import 'rxjs/add/operator/map'
import { Observable } from 'rxjs/Observable';
import { Role } from '../_models/organization.model';
import { Configuration } from '../_api/api.constants';
 
@Injectable()
export class RoleService {
 
    private actionUrl: string;
    private headers: Headers;
 
    constructor(private _http: Http, private _configuration: Configuration) {
 
        this.actionUrl = _configuration.ServerWithApiUrl + 'role/';
 
        this.headers = new Headers();
        this.headers.append('Content-Type', 'application/json');
        this.headers.append('Accept', 'application/json');
    }
 
    public GetAll = (): Observable<Role[]> => {
        console.log(this.actionUrl)
        return this._http.get(this.actionUrl + 'list')
            .map((response: Response) => <Role[]>response.json())
//            .catch(this.handleError);
    }
 
    public GetSingle = (id: number): Observable<Role> => {
        return this._http.get(this.actionUrl + 'one?rowid=' + id)
            .map((response: Response) => <Role>response.json())
//            .catch(this.handleError);
    }
    
    public GetSingleFromEmail = (email: string): Observable<Role> => {
        return this._http.get(this.actionUrl + 'one?email=' + email)
            .map((response: Response) => <Role>response.json())
//            .catch(this.handleError);
    }
 
    public Add = (role: Role): Observable<Role> => {
        let toAdd = JSON.stringify(role);
        console.log (this.actionUrl + 'create')
        return this._http.post(this.actionUrl + 'create', toAdd, { headers: this.headers })
            .map((response: Response) => <Role>response.json())
 //           .catch(this.handleError);
    }
 
    public Update = (itemToUpdate: Role): Observable<Role> => {
        return this._http.put(this.actionUrl + '/update', JSON.stringify(itemToUpdate), { headers: this.headers })
            .map((response: Response) => <Role>response.json())
 //           .catch(this.handleError);
    }
 
    public Delete = (id: number): Observable<Response> => {
        console.log('deleting role rowID=' + id)
        return this._http.delete(this.actionUrl + 'delete?rowID=' + id)
 //           .catch(this.handleError);
    }
 
    private handleError(error: Response) {
        console.error(error);
        return Observable.throw(error.json().error || 'Server error');
    }
}