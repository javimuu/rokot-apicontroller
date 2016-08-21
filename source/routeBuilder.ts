import {Shared,ApiControllerExplorer} from "./shared";
import {Logger} from "bunyan";
import * as _ from "underscore";
import {IRouteBuilder,IMiddewareFunction, IApiControllerRoute,INewable,INewableConstructor, IApiController, IApiRequest, IApiRequestHandler, IApiControllerRouteVerb, IApi} from "./core";
import {ApiControllerCompiler} from "./apiControllerCompiler";
import {MiddlewareProvider} from "./middlewareProvider";

export abstract class RouteBuilder implements IRouteBuilder {
  private provider: MiddlewareProvider;
  constructor(protected logger: Logger, private controllers: IApiController[], private middlewares: IMiddewareFunction[], private controllerConstructor?: INewableConstructor<any>) {
    this.provider = new MiddlewareProvider(logger,middlewares);
  }

  protected abstract createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any, any>) : Function;
  protected abstract setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]);
  protected abstract createValidatorMiddleware(route: IApiControllerRoute): Function;

  build() {
    const reflectCompiler = new ApiControllerCompiler(this.logger)
    const api = reflectCompiler.compile(this.controllers, this.middlewares.map(m => m.key));
    if (api.errors.length) {
      return api;
    }

    const mws = this.provider.get(api.controllers);
    ApiControllerExplorer.forEachControllerRoute(api.controllers, (c,r) => this.processControllerRoute(c,r,mws))
    return api;
  }

  private processControllerRoute(c: IApiController, r: IApiControllerRoute, mws: {[key: string]: Function}){
    const routeHandler = (handler: IApiRequest<any, any, any, any, any>) => {
      const instance = Shared.construct(c.controllerClass, c.name, this.controllerConstructor);
      this.invokeRouteFunction(r.func, instance, handler)
    }
    const routeMiddleware = r.middlewares && mws ? r.middlewares.map(mi => mws[mi]) : [];
    const vmw = this.createValidatorMiddleware(r)
    if (vmw) {
      routeMiddleware.push(vmw)
    }
    routeMiddleware.push(this.createRequestHandler(r,routeHandler))

    r.routeVerbs.forEach(rv => {
      this.setupRoute(r, rv, routeMiddleware);
    })
  }

  protected invokeRouteFunction(func: Function, instance: any, handler: IApiRequest<any, any, any, any, any>){
    func.apply(instance, [handler])
  }
}
