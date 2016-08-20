import * as express from 'express';
import {Shared} from "./shared";
import {RouteBuilder} from "./routeBuilder";
import {Logger} from "bunyan";
import {IApiRequest, IApiController,IMiddewareFunction,INewableApiControllerConstructor, IApiRequestHandler, IApiControllerRoute, IApiControllerRouteVerb} from "./core";

class ExpressApiRequest<TBody, TResponse, TParams, TQuery> implements IApiRequest<TBody, TResponse, TParams, TQuery>{
  private user: any;
  constructor(private original: any){
    var ctx = this.originalAs<{req: express.Request, res: express.Response}>();
    this.body = ctx.req.body;
    this.params = ctx.req.params;
    this.query = ctx.req.query;
    this.user = ctx.req["user"];
  }
  send(statusCode: number, response?:TResponse){
    var ctx = this.originalAs<{req: express.Request, res: express.Response}>();
    ctx.res.status(statusCode).send(response);
  }
  body: TBody;
  log: any;
  params: TParams;
  query: TQuery;
  isAuthenticated(){
    return this.original.req.isAuthenticated()
  }
  userAs<T>(){
    return this.user as T;
  }
  originalAs<T>(){
    return this.original as T;
  }
}

export class ExpressRouteBuilder extends RouteBuilder {
  constructor(logger: Logger, private server: express.Express, apiControllers: IApiController[], middlewares: IMiddewareFunction[], controllerConstructor?: INewableApiControllerConstructor) {
    super(logger, apiControllers, middlewares, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      routeHandler(new ExpressApiRequest<any, any, any, any>({req,res}));
    }
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: express.RequestHandler[]){
    this.server[routeVerb.verb](routeVerb.route, ...requestHandlers);
  }
}
