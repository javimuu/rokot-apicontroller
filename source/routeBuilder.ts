import {Shared,ApiControllerExplorer} from "./shared";
import {Logger} from "bunyan";
import * as _ from "underscore";
import {IRouteBuilder,IMiddewareFunction, INewableApiControllerConstructor, IApiControllerRoute, IApiController, IApiRequestHandler, IApiControllerRouteVerb, IApi} from "./core";
import {ApiControllerCompiler} from "./apiControllerCompiler";
import {MiddlewareProvider} from "./middlewareProvider";

export abstract class RouteBuilder implements IRouteBuilder {
  private provider: MiddlewareProvider;
  constructor(protected logger: Logger, private controllers: IApiController[], private middlewares: IMiddewareFunction[], private controllerConstructor?: INewableApiControllerConstructor) {
    this.provider = new MiddlewareProvider(logger,middlewares);
  }

  protected abstract createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : Function;
  protected abstract setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]);

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
    let routeHandler:IApiRequestHandler<any, any, any, any> = c.controllerClass[r.memberName]
    if (!routeHandler) {
      routeHandler = (...args) => {
        const instance = Shared.construct(c.controllerClass, c.name, this.controllerConstructor);
        r.func.apply(instance, args)
      }
    }
    const routeMiddleware = r.middlewares && mws ? r.middlewares.map(mi => mws[mi]) : [];
    routeMiddleware.push(this.createRequestHandler(r,routeHandler))

    r.routeVerbs.forEach(rv => {
      this.setupRoute(r, rv, routeMiddleware);
    })
  }
}
