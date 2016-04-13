import {Express, RequestHandler,Request, Response,NextFunction} from "express";
import {Shared} from "./shared";
import {RouteBuilder} from "./routeBuilder";
import {Logger} from "bunyan";
import {IApiRequest, IApiControllerClassConstructor, IApiRequestHandler, IApiControllerRoute, IApiControllerRouteVerb} from "./core";

class ExpressApiRequest<TBody, TResponse, TParams, TQuery> implements IApiRequest<TBody, TResponse, TParams, TQuery>{
  private user: any;
  constructor(private original: any){
    var ctx = this.originalAs<{req: Request, res: Response}>();
    this.body = ctx.req.body;
    this.params = ctx.req.params;
    this.query = ctx.req.query;
    this.user = ctx.req.user;
  }
  send(statusCode: number, response?:TResponse){
    this.original.res.status(statusCode).send(response);
  }
  body: TBody;
  log: any;
  params: TParams;
  query: TQuery;
  userAs<T>(){
    return this.user as T;
  }
  originalAs<T>(){
    return this.original as T;
  }
}

export class ExpressRouteBuilder extends RouteBuilder {
  constructor(logger: Logger, private server: Express, controllerConstructor?: IApiControllerClassConstructor) {
    super(logger, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      routeHandler(new ExpressApiRequest<any, any, any, any>({req,res}));
    }
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: RequestHandler[]){
    this.server[routeVerb.verb](routeVerb.route, ...requestHandlers);
  }
}
