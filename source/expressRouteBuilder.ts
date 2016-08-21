import * as express from 'express';
import {Shared} from "./shared";
import {RouteBuilder} from "./routeBuilder";
import {Logger} from "bunyan";
import {IApiRequest, IApiController,IMiddewareFunction,INewableConstructor,INewable, IApiRequestHandler, IApiControllerRoute, IApiControllerRouteVerb} from "./core";
import * as _ from "underscore";

export interface IExpressRequest {
  req: express.Request
  res: express.Response
  next: express.NextFunction
}

export type IExpressApiRequest<TBody, TResponse, TParams, TQuery> = IApiRequest<TBody, TResponse, TParams, TQuery, IExpressRequest>

export class ExpressApiRequest<TBody, TResponse, TParams, TQuery> implements IExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  constructor(public native: IExpressRequest){
    this.body = native.req.body
    this.params = native.req.params
    this.query = native.req.query
    this.headers = native.req.headers
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
    this.native.res.status(statusCode).send(response)
  }

  headers: {[key:string]: string}
  body: TBody
  params: TParams
  query: TQuery
}

export class ExpressRouteBuilder extends RouteBuilder {
  constructor(logger: Logger, private server: express.Express, apiControllers: IApiController[], middlewares: IMiddewareFunction[], controllerConstructor?: INewableConstructor<any>) {
    super(logger, apiControllers, middlewares, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any, any>) : express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      routeHandler(this.createHandler({req,res, next}));
    }
  }

  protected validateRequestInput(req: express.Request, part: "body" | "params" | "query", validate: (item: any) => any){
    if (!validate) {
      return;
    }
    req[part] = validate(req[part])
  }


  protected createValidatorMiddleware(route: IApiControllerRoute): Function{
    if (!route.validateBody && !route.validateParams && !route.validateQuery) {
      return;
    }
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try{
        this.validateRequestInput(req, "body", route.validateBody)
        this.validateRequestInput(req, "params", route.validateParams)
        this.validateRequestInput(req, "query", route.validateQuery)
      } catch(e) {
        res.status(401).send("Invalid")
      }
      next()
    }
  }

  protected createHandler(req: IExpressRequest){
    return new ExpressApiRequest<any, any, any, any>(req)
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: express.RequestHandler[]){
    this.server[routeVerb.verb](routeVerb.route, ...requestHandlers);
  }
}
