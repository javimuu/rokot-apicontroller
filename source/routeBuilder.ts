import {Shared} from "./shared";
import {ApiExplorer} from "./server/apiExplorer";
import {Logger} from "bunyan";
import * as _ from "underscore";
import {IRouteBuilder,MiddewareFunctionDictionary,IMiddewareFunction,IMiddewareProvider,MiddewareProviderType, IApiControllerRoute,INewable,INewableConstructor, IApiController, IApiRequest, IApiRequestHandler, IApi} from "./core";
import {ApiBuilder} from "./server/apiBuilder";
//import {MiddlewareProvider} from "./middlewareProvider";

export abstract class RouteBuilder implements IRouteBuilder {
  //private provider: MiddlewareProvider;
  constructor(protected logger: Logger, private controllers: IApiController[], private middlewareFunctions: MiddewareFunctionDictionary, private controllerConstructor?: INewableConstructor<any>) {
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

  build() {
    const builder = new ApiBuilder(this.logger)
    const api = builder.build(this.controllers, this.middlewareFunctions);
    if (api.errors.length) {
      return api;
    }

    //const mws = this.provider.get(api.controllers);
    ApiExplorer.forEachControllerRoute(api.controllers, (c,r) => this.processControllerRoute(c,r))
    return api;
  }

  private makeInvoker(mw: MiddewareProviderType, func: Function): Function{
    if (_.isString(mw)) {
        return func;
    } else {
      return func(...mw.params)
    }
  }

  private createRouteMiddlewares(route: IApiControllerRoute){
    const routeMiddleware: Function[] = []
    route.middlewares && route.middlewares.forEach(mw => {
      const key = ApiExplorer.getMiddewareKey(mw);
      const found = this.middlewareFunctions[key]
      if (!found) {
        this.logger.error(`Unable to find middleware for route ${route.name} key '${key}'`)
        return
      }
      routeMiddleware.push(this.makeInvoker(mw,found.func))
    })
    return routeMiddleware
  }

  private processControllerRoute(c: IApiController, r: IApiControllerRoute){
    const routeHandler = (handler: IApiRequest<any, any, any, any, any>) => {
      const instance = Shared.construct(c.controllerClass, c.name, this.controllerConstructor);
      this.invokeRouteFunction(r.func, instance, handler)
    }
    const routeMiddleware = this.createRouteMiddlewares(r);
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
