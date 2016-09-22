import * as express from 'express';
import {Shared} from "../shared";
import {RouteBuilder} from "../routeBuilder";
import {Logger} from "bunyan";
import {IApiRequest,IApi,MiddewareFunctionDictionary, IStringDictionary, IApiController,IMiddewareFunction,INewableConstructor,INewable, IApiRequestHandler, IApiControllerRoute} from "../core";
import * as _ from "underscore";

export interface IExpressRequest {
  request: express.Request
  response: express.Response
  next: express.NextFunction
}

export type IExpressApiRequest<TBody, TResponse, TParams, TQuery> = IApiRequest<TBody, TResponse, TParams, TQuery, IExpressRequest>

export class ExpressApiRequest<TBody, TResponse, TParams, TQuery> implements IExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  constructor(public native: IExpressRequest){
    this.body = native.request.body
    this.params = native.request.params
    this.query = native.request.query
    this.headers = native.request.headers
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
    this.native.response.status(statusCode).send(response)
  }

  headers: IStringDictionary<string>
  body: TBody
  params: TParams
  query: TQuery
}

export class ExpressRouteBuilder extends RouteBuilder {
  constructor(logger: Logger, private server: express.Express, controllerConstructor?: INewableConstructor<any>) {
    super(logger,controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any, any>) : express.RequestHandler {
    return (request: express.Request, response: express.Response, next: express.NextFunction) => {
      routeHandler(this.createHandler({request,response,next}));
    }
  }

  protected createValidatorMiddleware(route: IApiControllerRoute): express.RequestHandler | undefined{
    if (!route.validateBody && !route.validateParams && !route.validateQuery) {
      return;
    }
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try{
        this.enforceRequestInputValidation(req, route, "body", "params", "query")
        next()
      } catch(e) {
        next(e)
      }
    }
  }

  protected createHandler(req: IExpressRequest){
    return new ExpressApiRequest<any, any, any, any>(req)
  }

  protected setupRoute(route: IApiControllerRoute, verb: string, requestHandlers: express.RequestHandler[]){
    this.server[verb](route.route, ...requestHandlers);
  }

  protected invokeRouteFunction(func: Function, instance: any, handler: ExpressApiRequest<any, any, any, any>){
    try{
      const promise = super.invokeRouteFunction(func, instance, handler)
      if (promise && promise.catch) {
        promise.catch(e => handler.native.next(e))
      }
    } catch (e){
      handler.native.next(e)
    }
  }
}
