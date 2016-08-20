import * as express from 'express';
import {Shared} from "./shared";
import {RouteBuilder} from "./routeBuilder";
import {Logger} from "bunyan";
import {IApiRequest, IApiController,IMiddewareFunction,INewableApiControllerConstructor, IApiRequestHandler, IApiControllerRoute, IApiControllerRouteVerb} from "./core";
import * as _ from "underscore";

export interface IExpressRequest{
  req: express.Request
  res: express.Response
}

export type IExpressApiRequest<TBody, TResponse, TParams, TQuery> = IApiRequest<TBody, TResponse, TParams, TQuery, IExpressRequest>

export class ExpressApiRequest<TBody, TResponse, TParams, TQuery> implements IExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  constructor(public original: IExpressRequest){
    this.body = original.req.body;
    this.params = original.req.params;
    this.query = original.req.query;
    this.headers = original.req.headers
  }

  sendOk(response?:TResponse){
    this.send(200, response)
  }

  sendCreated(response?:TResponse){
    this.send(201, response)
  }

  sendNoContent(){
    this.send(204)
  }

  send(statusCode: number, response?:any){
    this.original.res.status(statusCode).send(response);
  }
  headers: {[key:string]: string}
  body: TBody;
  params: TParams;
  query: TQuery;
}

export class ExpressRouteBuilder extends RouteBuilder {
  constructor(logger: Logger, private server: express.Express, apiControllers: IApiController[], middlewares: IMiddewareFunction[], controllerConstructor?: INewableApiControllerConstructor) {
    super(logger, apiControllers, middlewares, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any, any>) : express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      routeHandler(this.createHandler(req,res));
    }
  }

  protected createHandler(req: express.Request, res: express.Response){
    return new ExpressApiRequest<any, any, any, any>({req,res})
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: express.RequestHandler[]){
    this.server[routeVerb.verb](routeVerb.route, ...requestHandlers);
  }
}
