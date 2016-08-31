import {Shared} from "./shared";
import {ApiExplorer} from "./server/apiExplorer";
import {Logger} from "bunyan";
import * as _ from "underscore";
import {MiddewareFunctionDictionary,IMiddewareFunction,IMiddlewareKey, IApiControllerRoute,INewable,INewableConstructor, IApiController, IApiRequest, IApiRequestHandler, IRuntimeApi} from "./core";
import {ApiBuilder} from "./server/apiBuilder";
//import {MiddlewareProvider} from "./middlewareProvider";

export abstract class RouteBuilder {
  //private provider: MiddlewareProvider;
  constructor(protected logger: Logger, private controllerConstructor?: INewableConstructor<any>) {
    //this.provider = new MiddlewareProvider(logger,middlewares);
  }

  protected abstract createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any, any>) : Function;
  protected abstract setupRoute(route: IApiControllerRoute, verb: string, requestHandlers: Function[]);
  protected abstract createValidatorMiddleware(route: IApiControllerRoute): Function;

  private validateRequestInput(req: {}, part: string, validate: (item: any) => any){
    if (!validate) {
      return;
    }
    req[part] = validate(req[part])
  }

  protected enforceRequestInputValidation(req: {},route: IApiControllerRoute, body: string, params: string, query: string){
    this.validateRequestInput(req, body, route.validateBody)
    this.validateRequestInput(req, params, route.validateParams)
    this.validateRequestInput(req, query, route.validateQuery)
  }

  build(runtimeApi: IRuntimeApi) {
    if (runtimeApi.errors && runtimeApi.errors.length) {
      return false;
    }

    //const mws = this.provider.get(api.controllers);
    ApiExplorer.forEachControllerRoute(runtimeApi.controllers, (c,r) => this.processControllerRoute(c, r, runtimeApi.middlewareFunctions))
    return true;
  }

  private getMiddleware(mw: IMiddlewareKey, mwf: IMiddewareFunction): Function{
    if (!mw.params || mw.params.length === 0) {
        return mwf.func;
    } else {
      return mwf.func(...mw.params)
    }
  }

  private createRouteMiddlewares(route: IApiControllerRoute, middlewareFunctions: MiddewareFunctionDictionary){
    const routeMiddleware: Function[] = []
    route.middlewares && route.middlewares.forEach(mw => {
      const key = mw.key;
      const found = middlewareFunctions[key]
      if (!found) {
        this.logger.error(`Unable to find middleware for route ${route.name} key '${key}'`)
        return
      }
      routeMiddleware.push(this.getMiddleware(mw,found))
    })
    return routeMiddleware
  }

  private processControllerRoute(c: IApiController, r: IApiControllerRoute, middlewareFunctions: MiddewareFunctionDictionary){
    const routeHandler = (handler: IApiRequest<any, any, any, any, any>) => {
      const instance = Shared.construct(c.controllerClass, c.name, this.controllerConstructor);
      this.invokeRouteFunction(r.func, instance, handler)
    }
    const routeMiddleware = this.createRouteMiddlewares(r, middlewareFunctions);
    const vmw = this.createValidatorMiddleware(r)
    if (vmw) {
      routeMiddleware.push(vmw)
    }
    routeMiddleware.push(this.createRequestHandler(r,routeHandler))

    r.verbs.forEach(rv => {
      this.setupRoute(r, rv, routeMiddleware);
    })
  }

  protected invokeRouteFunction(func: Function, instance: any, handler: IApiRequest<any, any, any, any, any>){
    return func.apply(instance, [handler])
  }
}
