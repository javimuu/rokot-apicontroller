import {Shared,ApiControllerExplorer} from "./shared";
import {Logger} from "bunyan";
import {middlewareRegistry} from "./decorators";
import {IRouteBuilder, IApiControllerClassConstructor, IApiControllerRoute, IApiController, IApiRequestHandler, IApiControllerRouteVerb, IApi} from "./core";
export class MiddlewareProvider {
  constructor(private logger: Logger) { }

  get(apiControllers: IApiController[]) {
    const invalidMiddleware: string[] = []

    const keys = ApiControllerExplorer.getAllMiddlewareKeys(apiControllers);
    var mws = middlewareRegistry.asDictionary();
    keys.forEach(key => {
      if (!mws[key]) {
        invalidMiddleware.push(key);
      }
    })

    if (invalidMiddleware.length) {
      this.logger.error("Invalid Middleware keys found", invalidMiddleware.join(", "))
      return null;
    }

    return middlewareRegistry.asDictionary();
  }
}

export abstract class RouteBuilder implements IRouteBuilder {
  private provider: MiddlewareProvider;
  constructor(protected logger: Logger, private controllerConstructor?: IApiControllerClassConstructor) {
    this.provider = new MiddlewareProvider(logger);
  }

  protected abstract createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : Function;
  protected abstract setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]);

  build(api: IApi) {
    const mws = this.provider.get(api.controllers);
    if (!mws) {
      return false;
    }
    ApiControllerExplorer.forEachControllerRoute(api.controllers, (c,r) => this.processControllerRoute(c,r,mws))
    return true;
  }

  private processControllerRoute(c: IApiController, r: IApiControllerRoute, mws: {[key: string]: Function}){
    let routeHandler:IApiRequestHandler<any, any, any, any> = c.controllerClass[r.memberName]
    if (!routeHandler) {
      routeHandler = (...args) => {
        const instance = Shared.construct(c.controllerClass, c.name, this.controllerConstructor);
        instance[r.memberName].apply(instance, args)
      }
    }
    const routeMiddleware = r.middlewares ? r.middlewares.map(mi => mws[mi]) : [];
    routeMiddleware.push(this.createRequestHandler(r,routeHandler))

    r.routeVerbs.forEach(rv => {
      this.setupRoute(r, rv, routeMiddleware);
    })
  }
}
